import z from "zod";

export const preInterviewSchema = z.object({
    linkedin: z.string().url(),
    github: z.string().url()
});
