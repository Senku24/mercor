import { MAX_PROMPT_REPOSITORIES } from "../config/env";
import type { RepoMetadata } from "../repositories/interview";

export function interviewerPrompt(repositories: RepoMetadata[]) {
  const repoContext = repositories
    .slice(0, MAX_PROMPT_REPOSITORIES)
    .map(
      (repo) =>
        `- ${repo.fullName} (${repo.starCount} stars): ${repo.description ?? "No description"}`,
    )
    .join("\n");
  return `You are a concise, friendly technical interviewer. This interview lasts about one minute. Ask one short question at a time about the candidate's specific GitHub projects. Explore technical depth, clarity, and relevance. Stay grounded in the repository information below, and do not invent project details. Ask follow-up questions when useful. Near the end, thank the candidate and wrap up politely.\n\nRepositories:\n${repoContext || "No public repositories were found. Ask about their recent work and technical interests."}`;
}
