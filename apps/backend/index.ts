import express from "express";
import cors from "cors";
import { preInterviewSchema } from "./types";
import { scrapeGithubRepos } from "./github";
import dotenv from "dotenv";
import { db } from "./prisma/db";

dotenv.config();


const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/pre-interview", async (req, res) => {
    const { success, data, error } = preInterviewSchema.safeParse(req.body);
    if (!success) {
        return res.status(400).json({ error: error.issues });
    }
    const githubUsername = new URL(data.github).pathname.split("/")[1];
    if (!githubUsername) {
        return res.status(400).json({ error: "Invalid GitHub profile URL" });
    }

    try {
        const repositories = await scrapeGithubRepos(githubUsername);
        const interview = await db.orm.public.Interview.create({
            githubMetaData: repositories,
            status: "Pre" 
        });
        return res.json({ githubUsername,id: interview.id });
    } catch (error) {
        console.error("GitHub profile lookup failed:", error);
        return res.status(502).json({ error: "Unable to fetch GitHub repositories" });
    }
});


app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
