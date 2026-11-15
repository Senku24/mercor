import { z } from "zod";
import { MAX_INTERVIEW_SCORE } from "./config/env";

export const preInterviewSchema = z.object({
  github: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        url.hostname === "github.com" &&
        /^\/[A-Za-z0-9-]+\/?$/.test(url.pathname)
      );
    }, "Must be a GitHub profile URL"),
});

export const startInterviewSchema = z.object({ callId: z.string().min(1) });
export const repoMetadataSchema = z.object({
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable(),
  starCount: z.number().int().nonnegative(),
});

export const scoringSchema = z.object({
  score: z.number().int().min(0).max(MAX_INTERVIEW_SCORE),
  feedback: z.string().min(1),
});
