import z from "zod";

export const preInterviewSchema = z.object({
    github: z.string().url().refine((value) => {
        const url = new URL(value);
        return url.hostname === "github.com" && /^\/[A-Za-z0-9-]+\/?$/.test(url.pathname);
    }, "Must be a GitHub profile URL")
});
