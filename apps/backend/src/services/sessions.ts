import axios from "axios";
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

export async function startSession(
  interviewId: string,
  callId: string,
  repositories: RepoMetadata[],
) {
  const sideband = new SidebandSession(interviewId, callId, repositories);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await sideband.ready;
    await interviewRepository.update(interviewId, {
      status: "InProgress",
      callId,
      startedAt: new Date(),
    });
    timer = setTimeout(() => {
      void finishInterview(interviewId).catch((error: unknown) =>
        logger.error(interviewId, "interview.auto_finish_failed", error),
      );
    }, INTERVIEW_DURATION_MS);
    activeSessions.set(interviewId, { sideband, timer });
    sideband.startFirstResponse();
  } catch (error) {
    if (timer) clearTimeout(timer);
    activeSessions.delete(interviewId);
    await sideband.close();
    throw error;
  }
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
  const interview = await interviewRepository.find(interviewId);
  if (!interview || interview.status === "Done") return;
  if (active) clearTimeout(active.timer);
  if (interview.callId) {
    try {
      await hangupCall(interview.callId);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.event(interviewId, "call.already_ended");
      } else {
        logger.error(interviewId, "call.hangup_failed", error);
      }
    }
  }
  if (active) {
    await active.sideband.close();
    activeSessions.delete(interviewId);
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
