import { db } from "../../prisma/db";

export type RepoMetadata = {
  name: string;
  fullName: string;
  description: string | null;
  starCount: number;
};

export const interviewRepository = {
  create(githubMetaData: RepoMetadata[], accessToken: string) {
    return db.orm.public.Interview.create({
      githubMetaData,
      accessToken,
      status: "Pre",
    });
  },
  find(id: string) {
    return db.orm.public.Interview.where({ id }).all().first();
  },
  async messages(interviewId: string) {
    const messages = await db.orm.public.Message.where({ interviewId }).all();
    return [...messages].sort(
      (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
    );
  },
  update(
    id: string,
    data: {
      status?: "Pre" | "InProgress" | "Done";
      callId?: string;
      startedAt?: Date;
      score?: number;
      feedback?: string;
      clientSecretIssued?: boolean;
    },
  ) {
    return db.orm.public.Interview.where({ id }).update(data);
  },
  saveMessage(
    interviewId: string,
    type: "User" | "Assistant",
    message: string,
  ) {
    return db.orm.public.Message.create({ interviewId, type, message });
  },
};
