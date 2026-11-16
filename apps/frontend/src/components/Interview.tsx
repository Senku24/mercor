import { AudioLines, Bot, UserRound, type LucideIcon } from "lucide-react";
import { useParams } from "react-router";
import { Button } from "./ui/button";
import { useRealtimeInterview } from "../hooks/useRealtimeInterview";

function VoiceAvatar({
  name,
  role,
  speaking,
  icon: Icon,
  kind,
}: {
  name: string;
  role: string;
  speaking: boolean;
  icon: LucideIcon;
  kind: "candidate" | "interviewer";
}) {
  return (
    <div className="voice-avatar-card flex flex-col items-center gap-4">
      <div
        className="voice-orb"
        data-kind={kind}
        data-speaking={speaking}
        aria-label={`${name} ${speaking ? "speaking" : "not speaking"}`}
        role="img"
      >
        <div className="voice-orb-core">
          <Icon aria-hidden="true" className="size-8" strokeWidth={1.5} />
        </div>
        <span className="voice-state-icon" data-active={speaking}>
          <AudioLines aria-hidden="true" className="size-4" />
        </span>
      </div>
      <div className="text-center">
        <p className="font-semibold tracking-tight">{name}</p>
        <p className="text-xs text-muted-foreground">
          {speaking ? "Speaking" : role}
        </p>
      </div>
    </div>
  );
}

export function Interview() {
  const { interviewId = "" } = useParams<{ interviewId: string }>();
  const {
    secondsLeft,
    evaluating,
    started,
    audioStatus,
    lastHeard,
    userSpeaking,
    interviewerSpeaking,
    end,
  } = useRealtimeInterview(interviewId);

  return (
    <main className="interview-shell min-h-screen px-5 py-8 text-foreground sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col">
        <header className="flex items-center justify-between">
          <a href="/" className="text-sm font-semibold tracking-tight">
            mercor<span className="text-muted-foreground"> / practice</span>
          </a>
          <div className="flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-3.5 py-2 text-sm font-medium tabular-nums shadow-[0_4px_14px_rgba(24,24,27,0.07)] backdrop-blur">
            <span
              className={`size-2 rounded-full ${started ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" : "bg-zinc-300"}`}
            />
            {`0:${String(secondsLeft).padStart(2, "0")}`}
          </div>
        </header>

        <section className="my-auto py-12">
          <div className="mb-8 text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <span className="rounded-full border border-zinc-200 bg-white/75 px-3 py-1.5 shadow-sm">
                One minute · Technical interview
              </span>
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Think out loud.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              A focused conversation about your GitHub projects.
            </p>
          </div>

          {evaluating ? (
            <div className="interview-panel rounded-3xl border border-white/80 bg-white/90 p-12 text-center shadow-[0_24px_70px_rgba(24,24,27,0.12),0_3px_10px_rgba(24,24,27,0.05)] backdrop-blur">
              <div className="mx-auto mb-4 size-8 animate-pulse rounded-full bg-foreground/10" />
              <p className="font-medium">Reviewing your answers…</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your feedback is based on what you shared.
              </p>
            </div>
          ) : (
            <div className="interview-panel rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_24px_70px_rgba(24,24,27,0.12),0_3px_10px_rgba(24,24,27,0.05)] backdrop-blur sm:p-8">
              <div className="voice-stage grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border p-4 sm:gap-6 sm:p-8">
                <VoiceAvatar
                  name="You"
                  role={started ? "Your microphone" : "Connecting"}
                  speaking={userSpeaking}
                  icon={UserRound}
                  kind="candidate"
                />
                <div
                  className="conversation-signal flex h-16 items-center justify-center gap-1.5"
                  data-active={userSpeaking || interviewerSpeaking}
                  aria-hidden="true"
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <span
                      key={index}
                      className={`signal-bar signal-bar-${index + 1}`}
                    />
                  ))}
                </div>
                <VoiceAvatar
                  name="Interviewer"
                  role={started ? "Ready when you are" : "Connecting"}
                  speaking={interviewerSpeaking}
                  icon={Bot}
                  kind="interviewer"
                />
              </div>

              <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-zinc-200/80 bg-zinc-50/80 px-5 py-4 text-center shadow-inner">
                <p
                  className="text-sm font-medium text-zinc-600"
                  aria-live="polite"
                >
                  {started
                    ? audioStatus
                    : "Connecting your microphone and interviewer…"}
                </p>
                {lastHeard && (
                  <p
                    className="mt-3 text-sm leading-relaxed text-zinc-900"
                    aria-live="polite"
                  >
                    “{lastHeard}”
                  </p>
                )}
              </div>

              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  className="h-10 rounded-full border-zinc-300 bg-white px-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50 hover:shadow-md"
                  onClick={() => void end()}
                  disabled={!started}
                >
                  End interview
                </Button>
              </div>
            </div>
          )}
        </section>

        <footer className="text-center text-xs text-muted-foreground">
          Your responses are used to prepare your interview feedback.
        </footer>
      </div>
    </main>
  );
}
