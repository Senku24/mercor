import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { createInterviewApi } from "../lib/api";

type InterviewData = {
  status: "Pre" | "InProgress" | "Done";
  score: number | null;
  feedback: string | null;
};

function parseRealtimeEvent(value: string) {
  try {
    const event: unknown = JSON.parse(value);
    if (typeof event !== "object" || event === null || !("type" in event))
      return null;
    const type = event.type;
    const transcript = "transcript" in event ? event.transcript : undefined;
    const error = "error" in event ? event.error : undefined;
    return {
      type: typeof type === "string" ? type : null,
      transcript: typeof transcript === "string" ? transcript : null,
      error:
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
          ? error.message
          : null,
    };
  } catch {
    return null;
  }
}

function waitForIceGathering(peer: RTCPeerConnection) {
  if (peer.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      peer.removeEventListener("icegatheringstatechange", onStateChange);
      reject(new Error("Timed out gathering audio connection candidates"));
    }, 10_000);
    const onStateChange = () => {
      if (peer.iceGatheringState === "complete") {
        window.clearTimeout(timeout);
        peer.removeEventListener("icegatheringstatechange", onStateChange);
        resolve();
      }
    };
    peer.addEventListener("icegatheringstatechange", onStateChange);
  });
}

export function useRealtimeInterview(interviewId: string) {
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [evaluating, setEvaluating] = useState(false);
  const [started, setStarted] = useState(false);
  const [audioStatus, setAudioStatus] = useState("Connecting microphone…");
  const [lastHeard, setLastHeard] = useState("");
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [interviewerSpeaking, setInterviewerSpeaking] = useState(false);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const endedRef = useRef(false);

  const end = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEvaluating(true);
    const interviewApi = createInterviewApi(interviewId);
    if (!interviewApi) {
      peerRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      toast.error("This interview session has expired. Start a new interview.");
      window.location.replace("/");
      return;
    }
    try {
      // Let the backend collect the final transcript and hang up the Realtime call
      // before closing the browser's peer connection.
      await interviewApi.post(`/api/interviews/${interviewId}/end`);
      window.location.assign(`/result/${interviewId}`);
    } catch (error) {
      endedRef.current = false;
      setEvaluating(false);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        sessionStorage.removeItem(`interview:${interviewId}`);
        toast.error(
          "This interview session has expired. Start a new interview.",
        );
        window.location.replace("/");
      } else {
        toast.error("Could not finish the interview. Please try again.");
      }
    }
  }, [interviewId]);

  useEffect(() => {
    let cancelled = false;
    let outputAudio: HTMLAudioElement | null = null;
    async function connect() {
      const interviewApi = createInterviewApi(interviewId);
      if (!interviewApi) {
        toast.error(
          "This interview session has expired. Start a new interview.",
        );
        window.location.replace("/");
        return;
      }
      try {
        const interview = await interviewApi.get<InterviewData>(
          `/api/interviews/${interviewId}`,
        );
        if (interview.data.status === "Done") {
          window.location.replace(`/result/${interviewId}`);
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const peer = new RTCPeerConnection();
        peerRef.current = peer;
        const microphoneTrack = stream.getAudioTracks()[0];
        if (!microphoneTrack || microphoneTrack.readyState !== "live") {
          throw new Error("No live microphone audio track was acquired");
        }
        microphoneTrack.enabled = true;
        microphoneTrack.onmute = () =>
          setAudioStatus("Microphone input paused. Check your microphone.");
        microphoneTrack.onunmute = () =>
          setAudioStatus("Microphone active; waiting for your answer…");
        microphoneTrack.onended = () =>
          setAudioStatus("Microphone disconnected. Reconnect it to continue.");
        peer.addTrack(microphoneTrack, stream);
        peer.onconnectionstatechange = () => {
          if (peer.connectionState === "failed") {
            setAudioStatus(
              "Audio connection failed. Please restart the interview.",
            );
          }
        };
        outputAudio = document.createElement("audio");
        outputAudio.autoplay = true;
        outputAudio.setAttribute("playsinline", "");
        outputAudio.hidden = true;
        document.body.append(outputAudio);
        peer.ontrack = (event) => {
          outputAudio!.srcObject = event.streams[0]!;
          void outputAudio!.play().catch(() => {
            toast.error("Allow audio playback to hear the interviewer.");
          });
        };
        const events = peer.createDataChannel("oai-events");
        events.onopen = () =>
          setAudioStatus("Microphone connected; speak after the question.");
        events.onclose = () => {
          if (!cancelled && !endedRef.current) {
            setAudioStatus(
              "Realtime audio connection closed. Restart the interview.",
            );
          }
        };
        events.onmessage = (message) => {
          const event = parseRealtimeEvent(String(message.data));
          if (event?.type === "input_audio_buffer.speech_started") {
            setUserSpeaking(true);
            setAudioStatus("Listening to your answer…");
          }
          if (event?.type === "input_audio_buffer.speech_stopped") {
            setUserSpeaking(false);
            setAudioStatus("Processing your answer…");
          }
          if (event?.type === "output_audio_buffer.started") {
            setInterviewerSpeaking(true);
          }
          if (
            event?.type === "output_audio_buffer.stopped" ||
            event?.type === "output_audio_buffer.cleared"
          ) {
            setInterviewerSpeaking(false);
          }
          if (event?.type === "input_audio_buffer.committed") {
            setAudioStatus("Answer received; preparing a follow-up…");
          }
          if (
            event?.type ===
              "conversation.item.input_audio_transcription.completed" &&
            event.transcript
          ) {
            setAudioStatus("Heard your answer");
            setLastHeard(event.transcript);
          }
          if (event?.type === "error") {
            setAudioStatus(
              event.error
                ? `Realtime error: ${event.error}`
                : "Realtime audio input error. Please check your microphone.",
            );
          }
        };
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await waitForIceGathering(peer);
        const gatheredOfferSdp = peer.localDescription?.sdp;
        if (!gatheredOfferSdp?.includes("a=candidate:")) {
          throw new Error("WebRTC did not gather an audio network candidate");
        }
        const tokenResponse = await interviewApi.post<{ clientSecret: string }>(
          `/api/interviews/${interviewId}/token`,
        );
        const response = await fetch(
          "https://api.openai.com/v1/realtime/calls",
          {
            method: "POST",
            // setLocalDescription gathers ICE candidates asynchronously. Send
            // the completed local SDP, not the pre-gathering createOffer value.
            body: gatheredOfferSdp,
            headers: {
              Authorization: `Bearer ${tokenResponse.data.clientSecret}`,
              "Content-Type": "application/sdp",
            },
          },
        );
        if (!response.ok)
          throw new Error("Realtime session could not be created");
        const callId = response.headers.get("Location")?.split("/").pop();
        if (!callId) throw new Error("Realtime call id was missing");
        await peer.setRemoteDescription({
          type: "answer",
          sdp: await response.text(),
        });
        await interviewApi.post(`/api/interviews/${interviewId}/start`, {
          callId,
        });
        setAudioStatus("Waiting for your answer…");
        setStarted(true);
      } catch (error) {
        peerRef.current?.close();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        outputAudio?.remove();
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          sessionStorage.removeItem(`interview:${interviewId}`);
          toast.error(
            "This interview session has expired. Start a new interview.",
          );
          window.location.replace("/");
        } else if (
          !cancelled &&
          error instanceof DOMException &&
          error.name === "NotAllowedError"
        ) {
          toast.error(
            "Microphone access was denied. Allow access to your microphone to interview.",
          );
        } else if (!cancelled) {
          toast.error(
            "Could not start the interview. Return home and start a new interview.",
          );
        }
      }
    }
    void connect();
    return () => {
      cancelled = true;
      peerRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      outputAudio?.remove();
    };
  }, [interviewId]);

  useEffect(() => {
    if (!started || evaluating) return;
    const timer = window.setInterval(
      () =>
        setSecondsLeft((current) => {
          if (current <= 1) {
            window.clearInterval(timer);
            void end();
            return 0;
          }
          return current - 1;
        }),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [end, evaluating, started]);

  return {
    secondsLeft,
    evaluating,
    started,
    audioStatus,
    lastHeard,
    userSpeaking,
    interviewerSpeaking,
    end,
  };
}
