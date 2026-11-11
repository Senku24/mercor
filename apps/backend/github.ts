import axios, { Axios } from "axios";



export async function scrapeGithubRepos(githubUsername: string) {

    const userRepos = await axios.get(`https://api.github.com/users/${githubUsername}/repos`, {

        proxy: {
            host: "";
            port: number;
            auth? :  AxiosBasicCredentials;
            protocol? : http;
        },
    });
        const filteredUserRepos = userRepos.data.map((x: any)=> ({
            description : x.description,
            name : x.name,
            fullName : x.full_name,
            starCount : x.stargazers_count
        }));
    }