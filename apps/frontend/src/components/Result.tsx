import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { createInterviewApi } from "../lib/api";

type TranscriptMessage = {
  type: "User" | "Assistant";
  message: string;
  createdAt: string;
};
type InterviewResult = {
  status: "Pre" | "InProgress" | "Done";
  score: number | null;
  feedback: string | null;
  transcript: TranscriptMessage[];
};

export function Result() {
  const { interviewId = "" } = useParams<{ interviewId: string }>();
  const [result, setResult] = useState<InterviewResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interviewApi = createInterviewApi(interviewId);
    if (!interviewApi) {
      toast.error("This interview session has expired. Start a new interview.");
      window.location.replace("/");
      return;
    }
    interviewApi
      .get<InterviewResult>(`/api/interviews/${interviewId}`)
      .then(({ data }) => setResult(data))
      .catch((error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          sessionStorage.removeItem(`interview:${interviewId}`);
          toast.error(
            "This interview session has expired. Start a new interview.",
          );
          window.location.replace("/");
          return;
        }
        toast.error("Could not load interview results");
      })
      .finally(() => setLoading(false));
  }, [interviewId]);

  if (loading) return <main className="p-8">Loading results…</main>;
  if (!result)
    return (
      <main className="p-8">
        Results are unavailable. <Link to="/">Start a new interview</Link>
      </main>
    );
  if (result.status !== "Done")
    return <main className="p-8">The interview is still in progress.</main>;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold">Interview results</h1>
      <section className="rounded-lg border p-5">
        <h2 className="text-xl font-medium">Score: {result.score ?? 0}/100</h2>
        <p className="mt-2 whitespace-pre-wrap">{result.feedback}</p>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-medium">Transcript</h2>
        <ol className="flex flex-col gap-3">
          {result.transcript.map((item, index) => (
            <li
              key={`${item.createdAt}-${index}`}
              className="rounded-lg border p-4"
            >
              <strong>{item.type === "User" ? "You" : "Interviewer"}</strong>
              <p className="mt-1 whitespace-pre-wrap">{item.message}</p>
            </li>
          ))}
          {result.transcript.length === 0 && (
            <li>No transcript was recorded.</li>
          )}
        </ol>
      </section>
      <Link to="/">Start another interview</Link>
    </main>
  );
}
