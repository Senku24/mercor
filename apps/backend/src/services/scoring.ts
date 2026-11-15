import axios from "axios";
import { z } from "zod";
import {
  env,
  MIN_SCORABLE_TRANSCRIPT_CHARACTERS,
  OPENAI_REQUEST_TIMEOUT_MS,
} from "../config/env";
import { scoringSchema } from "../schemas";
import type { RepoMetadata } from "../repositories/interview";

export async function scoreInterview(
  repositories: RepoMetadata[],
  transcript: { type: string; message: string }[],
) {
  const transcriptText = transcript
    .map(({ message }) => message)
    .join(" ")
    .trim();
  if (transcriptText.length < MIN_SCORABLE_TRANSCRIPT_CHARACTERS) {
    return {
      score: 0,
      feedback:
        "There was too little interview conversation to evaluate the candidate.",
    };
  }
  const responseFormat = z.toJSONSchema(scoringSchema);
  const { data } = await axios.post<unknown>(
    "https://api.openai.com/v1/responses",
    {
      model: env.SCORING_MODEL,
      input: [
        {
          role: "system",
          content:
            "Evaluate a one-minute technical interview for technical depth, clarity, and relevance to the candidate's repositories. Return a score from 0 to 100 and concise, evidence-based feedback.",
        },
        { role: "user", content: JSON.stringify({ repositories, transcript }) },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "interview_score",
          strict: true,
          schema: responseFormat,
        },
      },
    },
    {
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      timeout: OPENAI_REQUEST_TIMEOUT_MS,
    },
  );
  const responseSchema = z.object({
    output: z
      .array(
        z.object({
          content: z
            .array(z.object({ text: z.string().optional() }))
            .optional(),
        }),
      )
      .optional(),
  });
  const parsedResponse = responseSchema.parse(data);
  const output = parsedResponse.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.text)?.text;
  if (!output)
    throw new Error("Scoring response did not contain structured output");
  return scoringSchema.parse(JSON.parse(output));
}
