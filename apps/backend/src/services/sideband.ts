import WebSocket from "ws";
import { env } from "../config/env";
import { SIDEBAND_CONNECTION_TIMEOUT_MS } from "../config/env";
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
  readonly ready: Promise<void>;
  private messageQueue: Promise<void> = Promise.resolve();
  private resolveReady!: () => void;
  private rejectReady!: (error: Error) => void;
  private readySettled = false;
  private readonly readyTimer: ReturnType<typeof setTimeout>;
  private readonly instructions: string;

  constructor(
    private readonly interviewId: string,
    callId: string,
    repositories: RepoMetadata[],
  ) {
    this.instructions = interviewerPrompt(repositories);
    this.ready = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.readyTimer = setTimeout(
      () => this.failHandshake(new Error("Realtime session update timed out")),
      SIDEBAND_CONNECTION_TIMEOUT_MS,
    );
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
    this.socket.on("error", (error) => {
      logger.error(interviewId, "sideband.error", error);
      this.failHandshake(new Error("Realtime sideband connection failed"));
    });
    this.socket.on("close", () => {
      this.failHandshake(new Error("Realtime sideband closed before setup"));
    });
    this.socket.on("open", () => {
      this.send({
        type: "session.update",
        session: { type: "realtime", instructions: this.instructions },
      });
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
    if (event.type === "error") {
      this.failHandshake(new Error("Realtime rejected the session update"));
      return;
    }
    if (event.type === "session.updated" && !this.readySettled) {
      const session = z
        .object({ instructions: z.string() })
        .passthrough()
        .safeParse(event.session);
      if (!session.success || session.data.instructions !== this.instructions) {
        this.failHandshake(
          new Error("GitHub interview instructions were not applied"),
        );
        return;
      }
      clearTimeout(this.readyTimer);
      this.readySettled = true;
      this.resolveReady();
    }
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
    clearTimeout(this.readyTimer);
    this.failHandshake(new Error("Realtime sideband closed"));
    this.socket.close();
    await this.messageQueue;
  }

  startFirstResponse() {
    if (!this.readySettled) throw new Error("Realtime session is not ready");
    this.send({ type: "response.create" });
  }

  private failHandshake(error: Error) {
    if (this.readySettled) return;
    clearTimeout(this.readyTimer);
    this.readySettled = true;
    this.rejectReady(error);
  }
}
