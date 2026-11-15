import { randomBytes } from "node:crypto";
import { Router } from "express";
import { scrapeGithubRepos } from "../services/github";
import { mintClientSecret } from "../services/realtime";
import { finishInterview, startSession } from "../services/sessions";
import { interviewRepository } from "../repositories/interview";
import {
  preInterviewSchema,
  repoMetadataSchema,
  startInterviewSchema,
} from "../schemas";
import { requireInterviewToken } from "../middleware/auth";
import {
  ACCESS_TOKEN_BYTES,
  MAX_RATE_LIMIT_ENTRIES,
  PRE_INTERVIEW_RATE_LIMIT,
  PRE_INTERVIEW_RATE_WINDOW_MS,
} from "../config/env";

export const interviews = Router();
const rateWindows = new Map<string, { startedAt: number; count: number }>();
const clientSecretJobs = new Map<string, Promise<string>>();
const startingInterviews = new Set<string>();

interviews.use("/pre-interview", (req, res, next) => {
  const now = Date.now();
  const key = req.ip ?? "unknown";
  const current = rateWindows.get(key);
  if (rateWindows.size > MAX_RATE_LIMIT_ENTRIES) {
    for (const [clientIp, rate] of rateWindows) {
      if (now - rate.startedAt >= PRE_INTERVIEW_RATE_WINDOW_MS)
        rateWindows.delete(clientIp);
    }
  }
  const window =
    !current || now - current.startedAt >= PRE_INTERVIEW_RATE_WINDOW_MS
      ? { startedAt: now, count: 0 }
      : current;
  window.count += 1;
  rateWindows.set(key, window);
  if (window.count > PRE_INTERVIEW_RATE_LIMIT)
    return res.status(429).json({ error: "Too many interview requests" });
  next();
});

interviews.post("/pre-interview", async (req, res, next) => {
  const parsed = preInterviewSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues });
  try {
    const username = new URL(parsed.data.github).pathname.split("/")[1]!;
    const repositories = await scrapeGithubRepos(username);
    const accessToken = randomBytes(ACCESS_TOKEN_BYTES).toString("hex");
    const interview = await interviewRepository.create(
      repositories,
      accessToken,
    );
    return res.json({ id: interview.id, accessToken });
  } catch (error) {
    next(error);
  }
});

interviews.use("/:id", requireInterviewToken);

interviews.post("/:id/token", async (req, res, next) => {
  const interview = await interviewRepository.find(req.params.id);
  if (!interview || interview.status !== "Pre")
    return res.status(409).json({ error: "Interview is not ready" });
  if (interview.clientSecretIssued)
    return res.status(409).json({ error: "Client secret already minted" });
  if (clientSecretJobs.has(interview.id))
    return res.status(409).json({ error: "Client secret is being minted" });
  const secretJob = (async () => {
    await interviewRepository.update(interview.id, {
      clientSecretIssued: true,
    });
    return mintClientSecret();
  })();
  clientSecretJobs.set(interview.id, secretJob);
  try {
    const clientSecret = await secretJob;
    return res.json({ clientSecret });
  } catch (error) {
    next(error);
  } finally {
    clientSecretJobs.delete(interview.id);
  }
});

interviews.post("/:id/start", async (req, res, next) => {
  const parsed = startInterviewSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues });
  const interview = await interviewRepository.find(req.params.id);
  if (startingInterviews.has(req.params.id))
    return res.status(409).json({ error: "Interview is being started" });
  if (
    !interview ||
    interview.status !== "Pre" ||
    interview.callId ||
    !interview.clientSecretIssued
  )
    return res.status(409).json({ error: "Interview cannot be started" });
  startingInterviews.add(interview.id);
  try {
    await interviewRepository.update(interview.id, {
      status: "InProgress",
      callId: parsed.data.callId,
      startedAt: new Date(),
    });
    const repositories = repoMetadataSchema
      .array()
      .parse(interview.githubMetaData);
    startSession(interview.id, parsed.data.callId, repositories);
    return res.status(204).end();
  } catch (error) {
    next(error);
  } finally {
    startingInterviews.delete(interview.id);
  }
});

interviews.post("/:id/end", async (req, res, next) => {
  try {
    await finishInterview(req.params.id);
    const interview = await interviewRepository.find(req.params.id);
    return res.json({ status: interview?.status ?? "Done" });
  } catch (error) {
    next(error);
  }
});

interviews.get("/:id", async (req, res, next) => {
  try {
    const interview = await interviewRepository.find(req.params.id);
    if (!interview)
      return res.status(404).json({ error: "Interview not found" });
    const transcript = await interviewRepository.messages(interview.id);
    return res.json({
      status: interview.status,
      score: interview.score,
      feedback: interview.feedback,
      transcript,
    });
  } catch (error) {
    next(error);
  }
});
