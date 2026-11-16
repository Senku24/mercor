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

  if (loading)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f7f5] p-8 text-sm text-muted-foreground">
        Loading your results…
      </main>
    );
  if (!result)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f7f5] p-8">
        Results are unavailable. <Link to="/">Start a new interview</Link>
      </main>
    );
  if (result.status !== "Done")
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f7f5] p-8">
        The interview is still in progress.
      </main>
    );

  return (
    <main className="interview-shell min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            mercor<span className="text-muted-foreground"> / practice</span>
          </Link>
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            New interview
          </Link>
        </header>
        <div className="mb-1 mt-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Interview complete
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Your feedback
          </h1>
        </div>
        <section className="result-card rounded-2xl border border-white/80 bg-white/90 p-6 backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Candidate score
          </p>
          <h2 className="mt-2 text-5xl font-semibold tracking-tight text-zinc-950">
            {result.score ?? 0}
            <span className="text-lg font-normal text-muted-foreground">
              {" "}
              / 100
            </span>
          </h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
            {result.feedback}
          </p>
        </section>
        <section className="result-card rounded-2xl border border-white/80 bg-white/90 p-6 backdrop-blur sm:p-8">
          <h2 className="text-lg font-semibold">Conversation</h2>
          <ol className="mt-5 flex flex-col divide-y">
            {result.transcript.map((item, index) => (
              <li
                key={`${item.createdAt}-${index}`}
                className="py-4 first:pt-0 last:pb-0"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {item.type === "User" ? "YOU" : "INTERVIEWER"}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                  {item.message}
                </p>
              </li>
            ))}
            {result.transcript.length === 0 && (
              <li className="py-4 text-sm text-muted-foreground">
                No transcript was recorded.
              </li>
            )}
          </ol>
        </section>
      </div>
    </main>
  );
}
