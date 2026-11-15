import { INTERVIEW_DURATION_MS } from "../config/env";
import { logger } from "../lib/logger";
import {
  interviewRepository,
  type RepoMetadata,
} from "../repositories/interview";
import { hangupCall } from "./realtime";
import { scoreInterview } from "./scoring";
import { SidebandSession } from "./sideband";
import { repoMetadataSchema } from "../schemas";

type ActiveSession = {
  sideband: SidebandSession;
  timer: ReturnType<typeof setTimeout>;
};
const activeSessions = new Map<string, ActiveSession>();
const finishJobs = new Map<string, Promise<void>>();

export function startSession(
  interviewId: string,
  callId: string,
  repositories: RepoMetadata[],
) {
  const sideband = new SidebandSession(interviewId, callId, repositories);
  const timer = setTimeout(() => {
    void finishInterview(interviewId).catch((error: unknown) =>
      logger.error(interviewId, "interview.auto_finish_failed", error),
    );
  }, INTERVIEW_DURATION_MS);
  activeSessions.set(interviewId, { sideband, timer });
}

export function finishInterview(interviewId: string): Promise<void> {
  const existing = finishJobs.get(interviewId);
  if (existing) return existing;
  const active = activeSessions.get(interviewId);
  const ending = doFinish(interviewId, active).finally(() =>
    finishJobs.delete(interviewId),
  );
  finishJobs.set(interviewId, ending);
  return ending;
}

async function doFinish(interviewId: string, active?: ActiveSession) {
  if (active) {
    clearTimeout(active.timer);
    await active.sideband.close();
    activeSessions.delete(interviewId);
  }
  const interview = await interviewRepository.find(interviewId);
  if (!interview || interview.status === "Done") return;
  if (interview.callId) {
    try {
      await hangupCall(interview.callId);
    } catch (error) {
      logger.error(interviewId, "call.hangup_failed", error);
    }
  }
  const transcript = (await interviewRepository.messages(interviewId)).map(
    (message) => ({ type: message.type, message: message.message }),
  );
  const metadata = repoMetadataSchema.array().parse(interview.githubMetaData);
  const score = await scoreInterview(metadata, transcript);
  await interviewRepository.update(interviewId, {
    status: "Done",
    score: score.score,
    feedback: score.feedback,
  });
}
