import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useNavigate } from "react-router";
import { ArrowRight, Code2 } from "lucide-react";

export function Form() {
  const [github, setGithub] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function OnSubmit() {
    if (!github) {
      toast.error("Please provide a GitHub URL");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post<{ id: string; accessToken: string }>(
        "/api/pre-interview",
        { github },
      );
      if (!data.id || !data.accessToken) {
        throw new Error("Backend did not return interview credentials");
      }
      toast.success("GitHub profile loaded");
      sessionStorage.setItem(`interview:${data.id}`, data.accessToken);
      navigate(`/interview/${data.id}`);
    } catch {
      toast.error("Could not load that GitHub profile");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="home-shell grid min-h-screen place-items-center px-5 py-12">
      <div className="w-full max-w-lg">
        <a
          href="/"
          className="mb-12 inline-flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-950 text-white shadow-[0_5px_12px_rgba(24,24,27,0.24)]">
            <Code2 aria-hidden="true" className="size-4" />
          </span>
          mercor practice
        </a>
        <section className="home-card rounded-3xl border border-white/80 bg-white/90 p-7 backdrop-blur sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Technical interview practice
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
            Start with your work.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Share your GitHub profile for a short, challenging interview based
            on your public repositories.
          </p>
          <div className="mt-7 space-y-3">
            <label htmlFor="github-url" className="text-sm font-medium">
              GitHub profile URL
            </label>
            <Input
              id="github-url"
              type="url"
              autoComplete="url"
              placeholder="https://github.com/username"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void OnSubmit();
              }}
              className="h-12 rounded-xl border-zinc-300 bg-zinc-50/80 shadow-inner placeholder:text-zinc-400 focus-visible:bg-white"
            />
            <Button
              onClick={() => void OnSubmit()}
              disabled={submitting}
              className="h-12 w-full rounded-xl shadow-[0_5px_12px_rgba(24,24,27,0.15)] transition-all hover:-translate-y-0.5 hover:shadow-[0_9px_18px_rgba(24,24,27,0.2)]"
            >
              {submitting ? "Loading your profile…" : "Start interview"}
              {!submitting && <ArrowRight aria-hidden="true" />}
            </Button>
          </div>
          <p className="mt-5 text-center text-xs font-medium text-zinc-500">
            One minute · Voice conversation · Personal feedback
          </p>
        </section>
      </div>
    </main>
  );
}
