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
  private responseInProgress = false;
  private responseRequested = false;
  private responsePending = false;
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
      const details = z
        .object({ code: z.string().optional(), message: z.string().optional() })
        .passthrough()
        .safeParse(event.error);
      const message = details.success ? details.data.message : undefined;
      if (message?.includes("active response in progress")) {
        this.responseRequested = false;
        this.responseInProgress = true;
        this.responsePending = true;
        logger.event(this.interviewId, "realtime.response_already_active");
        return;
      }
      this.responseRequested = false;
      if (!this.readySettled) {
        this.failHandshake(new Error("Realtime rejected the session update"));
      } else {
        logger.error(
          this.interviewId,
          "realtime.event_failed",
          new Error(message ?? "Realtime event failed"),
        );
      }
      return;
    }
    if (event.type === "response.created") {
      this.responseRequested = false;
      this.responseInProgress = true;
    }
    if (event.type === "response.done") {
      this.responseRequested = false;
      this.responseInProgress = false;
      if (this.responsePending) this.requestResponse();
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
      if (type === "User") this.requestResponse();
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
    this.requestResponse();
  }

  private requestResponse() {
    if (this.responseInProgress || this.responseRequested) {
      this.responsePending = true;
      return;
    }
    this.responsePending = false;
    this.responseRequested = true;
    this.send({ type: "response.create" });
  }

  private failHandshake(error: Error) {
    if (this.readySettled) return;
    clearTimeout(this.readyTimer);
    this.readySettled = true;
    this.rejectReady(error);
  }
}
