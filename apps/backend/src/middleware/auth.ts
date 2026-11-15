import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { interviewRepository } from "../repositories/interview";

export async function requireInterviewToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const interviewId = Array.isArray(req.params.id)
    ? req.params.id[0]!
    : req.params.id;
  if (!interviewId) return res.status(401).json({ error: "Unauthorized" });
  const expected = (await interviewRepository.find(interviewId))?.accessToken;
  const supplied = req.header("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied)
    return res.status(401).json({ error: "Unauthorized" });
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (
    expectedBuffer.length !== suppliedBuffer.length ||
    !timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
