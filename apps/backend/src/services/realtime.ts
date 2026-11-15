import axios from "axios";
import { env } from "../config/env";
import { z } from "zod";
import { OPENAI_REQUEST_TIMEOUT_MS } from "../config/env";

const clientSecretSchema = z.object({ value: z.string().min(1) });

export async function mintClientSecret() {
  const { data } = await axios.post(
    "https://api.openai.com/v1/realtime/client_secrets",
    {
      session: {
        type: "realtime",
        model: env.REALTIME_MODEL,
        audio: {
          input: {
            transcription: { model: "gpt-transcribe" },
            turn_detection: { type: "server_vad" },
          },
          output: { voice: "alloy" },
        },
      },
    },
    {
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      timeout: OPENAI_REQUEST_TIMEOUT_MS,
    },
  );
  return clientSecretSchema.parse(data).value;
}

export async function hangupCall(callId: string) {
  await axios.post(
    `https://api.openai.com/v1/realtime/calls/${encodeURIComponent(callId)}/hangup`,
    {},
    {
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      timeout: OPENAI_REQUEST_TIMEOUT_MS,
    },
  );
}
