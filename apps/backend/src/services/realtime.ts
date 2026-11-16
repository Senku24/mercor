import axios from "axios";
import { env } from "../config/env";
import { z } from "zod";
import { OPENAI_REQUEST_TIMEOUT_MS } from "../config/env";

const clientSecretSchema = z.object({ value: z.string().min(1) });

export async function mintClientSecret(instructions: string) {
  const { data } = await axios.post(
    "https://api.openai.com/v1/realtime/client_secrets",
    {
      session: {
        type: "realtime",
        model: env.REALTIME_MODEL,
        instructions,
        output_modalities: ["audio"],
        audio: {
          input: {
            noise_reduction: { type: "near_field" },
            transcription: { model: "gpt-transcribe" },
            turn_detection: {
              type: "server_vad",
              create_response: false,
              interrupt_response: true,
            },
          },
          output: { voice: "alloy", speed: 1.18 },
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
