import axios from "axios";
import type { RepoMetadata } from "../repositories/interview";
import { z } from "zod";
import {
  GITHUB_REPOSITORY_PAGE_SIZE,
  GITHUB_REQUEST_TIMEOUT_MS,
} from "../config/env";

const githubRepositorySchema = z.object({
  description: z.string().nullable(),
  name: z.string(),
  full_name: z.string(),
  stargazers_count: z.number().int().nonnegative(),
});

export async function scrapeGithubRepos(
  username: string,
): Promise<RepoMetadata[]> {
  const { data } = await axios.get<unknown>(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos`,
    {
      params: { per_page: GITHUB_REPOSITORY_PAGE_SIZE, sort: "updated" },
      timeout: GITHUB_REQUEST_TIMEOUT_MS,
      headers: { Accept: "application/vnd.github+json" },
    },
  );
  return z
    .array(githubRepositorySchema)
    .parse(data)
    .map(({ description, name, full_name, stargazers_count }) => ({
      description,
      name,
      fullName: full_name,
      starCount: stargazers_count,
    }));
}
