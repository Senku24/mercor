import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";

type InterviewData = {
  status: "Pre" | "InProgress" | "Done";
  score: number | null;
  feedback: string | null;
};

export function useRealtimeInterview(interviewId: string) {
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [evaluating, setEvaluating] = useState(false);
  const [started, setStarted] = useState(false);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const endedRef = useRef(false);

  const end = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEvaluating(true);
    peerRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    try {
      await api.post(`/api/interviews/${interviewId}/end`);
      window.location.assign(`/result/${interviewId}`);
    } catch {
      endedRef.current = false;
      setEvaluating(false);
      toast.error("Could not finish the interview. Please try again.");
    }
  }, [interviewId]);

  useEffect(() => {
    let cancelled = false;
    let outputAudio: HTMLAudioElement | null = null;
    async function connect() {
      try {
        const interview = await api.get<InterviewData>(
          `/api/interviews/${interviewId}`,
        );
        if (interview.data.status === "Done") {
          window.location.replace(`/result/${interviewId}`);
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const peer = new RTCPeerConnection();
        peerRef.current = peer;
        peer.addTrack(stream.getAudioTracks()[0]!, stream);
        outputAudio = document.createElement("audio");
        outputAudio.autoplay = true;
        outputAudio.hidden = true;
        document.body.append(outputAudio);
        peer.ontrack = (event) => {
          outputAudio!.srcObject = event.streams[0]!;
        };
        peer.createDataChannel("oai-events");
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        const tokenResponse = await api.post<{ clientSecret: string }>(
          `/api/interviews/${interviewId}/token`,
        );
        const response = await fetch(
          "https://api.openai.com/v1/realtime/calls",
          {
            method: "POST",
            body: offer.sdp,
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
        await api.post(`/api/interviews/${interviewId}/start`, { callId });
        setStarted(true);
      } catch (error) {
        peerRef.current?.close();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        outputAudio?.remove();
        if (
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

  return { secondsLeft, evaluating, started, end };
}
