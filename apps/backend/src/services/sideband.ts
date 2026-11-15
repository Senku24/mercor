import WebSocket from "ws";
import { env } from "../config/env";
import { z } from "zod";
import { logger } from "../lib/logger";
import { interviewRepository } from "../repositories/interview";
import type { RepoMetadata } from "../repositories/interview";
import { interviewerPrompt } from "./prompt";

const realtimeEventSchema = z
  .object({ type: z.string(), transcript: z.string().optional() })
  .passthrough();

export class SidebandSession {
  private readonly socket: WebSocket;
  private messageQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly interviewId: string,
    callId: string,
    repositories: RepoMetadata[],
  ) {
    this.socket = new WebSocket(
      `wss://api.openai.com/v1/realtime?call_id=${encodeURIComponent(callId)}`,
      {
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      },
    );
    this.socket.on("message", (raw) => {
      this.messageQueue = this.messageQueue
        .then(() => this.handle(raw.toString()))
        .catch((error: unknown) => {
          logger.error(this.interviewId, "transcript.save_failed", error);
        });
    });
    this.socket.on("error", (error) =>
      logger.error(interviewId, "sideband.error", error),
    );
    this.socket.on("open", () => {
      this.send({
        type: "session.update",
        session: { instructions: interviewerPrompt(repositories) },
      });
      this.send({ type: "response.create" });
      logger.event(interviewId, "sideband.connected");
    });
  }

  private send(event: Record<string, unknown>) {
    this.socket.send(JSON.stringify(event));
  }

  private async handle(raw: string) {
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      logger.event(this.interviewId, "sideband.invalid_event");
      return;
    }
    const parsed = realtimeEventSchema.safeParse(payload);
    if (!parsed.success) {
      logger.event(this.interviewId, "sideband.invalid_event");
      return;
    }
    const event = parsed.data;
    logger.event(this.interviewId, event.type ?? "sideband.unknown");
    const type =
      event.type === "conversation.item.input_audio_transcription.completed"
        ? "User"
        : event.type === "response.output_audio_transcript.done"
          ? "Assistant"
          : null;
    if (type && event.transcript?.trim()) {
      await interviewRepository.saveMessage(
        this.interviewId,
        type,
        event.transcript.trim(),
      );
    }
  }

  async close() {
    this.socket.close();
    await this.messageQueue;
  }
}
