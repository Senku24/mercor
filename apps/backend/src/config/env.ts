import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:3000"),
  REALTIME_MODEL: z.string().default("gpt-realtime-2.1"),
  SCORING_MODEL: z.string().default("gpt-5-mini"),
  HOST: z.string().min(1).default("0.0.0.0"),
  // Express "trust proxy": "loopback" for a local Nginx, or a hop count such as "1" behind a hosted proxy (Render).
  TRUST_PROXY: z.string().min(1).default("loopback"),
  PORT: z.coerce.number().int().positive().default(3001),
});

export const env = envSchema.parse(process.env);
export const INTERVIEW_DURATION_MS = 60_000;
export const MAX_PROMPT_REPOSITORIES = 10;
export const GITHUB_REPOSITORY_PAGE_SIZE = 100;
export const ACCESS_TOKEN_BYTES = 32;
export const MAX_RATE_LIMIT_ENTRIES = 1_000;
export const MAX_REQUEST_BODY_BYTES = 32 * 1_024;
export const OPENAI_REQUEST_TIMEOUT_MS = 30_000;
export const GITHUB_REQUEST_TIMEOUT_MS = 10_000;
export const SIDEBAND_CONNECTION_TIMEOUT_MS = 10_000;
export const MAX_INTERVIEW_SCORE = 100;
export const PRE_INTERVIEW_RATE_LIMIT = 5;
export const PRE_INTERVIEW_RATE_WINDOW_MS = 60_000;
export const MIN_SCORABLE_TRANSCRIPT_CHARACTERS = 20;
