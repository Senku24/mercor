import express from "express";
import cors from "cors";
import z from "zod";  
import { preInterviewSchema } from "./types";
import axios from "axios";
import { scrapeGithubRepos } from "./github";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/pre-interview", async (req, res) => {
    const { success, data, error } = preInterviewSchema.safeParse(req.body);
    if (!success) {
        return res.status(401).json({ error: error.issues });
    }
    const githubUrl = data.github;
    // const linkedinUrl = data.linkedin;
    // console.log("Received Github URL:", githubUrl);
    // console.log("Received Linkedin URL:", linkedinUrl);
    
   // const githubusername = githubUrl.split("/").pop();
    const githubusername = data.github.endsWith("/") ? data.github.slice(0, -1).split("/").pop() : data.github.split("/").pop();
    // const linkedinusername = linkedinUrl.split("/").pop();
    // const linkedinusername = data.linkedin.endsWith("/") ? data.linkedin.slice(0, -1).split("/").pop() : data.linkedin.split("/").pop();
    scrapeGithubRepos(githubusername);
    // const userRepos = await axios.get(`https://api.github.com/users/${githubusername}/repos`);
    // const filteredUserRepos = userRepos.data.map((x: any)=> ({
    //     description : x.description,
    //     name : x.name,
    //     fullName : x.full_name,
    //     starCount : x.stargazers_count
    // }));
    
    // console.log("Extracted Github Username:", githubusername);
    // console.log("Extracted Linkedin Username:", linkedinusername);
})


app.listen(3001, () => {
  console.log("Server is running on port 3001");
});  