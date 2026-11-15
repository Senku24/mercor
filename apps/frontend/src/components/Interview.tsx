import { useParams } from "react-router";
import { Button } from "./ui/button";
import { useRealtimeInterview } from "../hooks/useRealtimeInterview";

export function Interview() {
  const { interviewId = "" } = useParams<{ interviewId: string }>();
  const { secondsLeft, evaluating, started, end } =
    useRealtimeInterview(interviewId);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold">AI technical interview</h1>
      {evaluating ? (
        <p>Evaluating your interview…</p>
      ) : (
        <>
          <p>
            {started
              ? "You are connected. Answer naturally and ask for a question to be repeated if needed."
              : "Connecting your microphone and interviewer…"}
          </p>
          <p
            className="font-mono text-5xl"
            aria-live="polite"
          >{`0:${String(secondsLeft).padStart(2, "0")}`}</p>
          <Button onClick={() => void end()} disabled={!started}>
            End interview
          </Button>
        </>
      )}
    </main>
  );
}
