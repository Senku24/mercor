import axios from "axios";

type GithubRepository = {
    description: string | null;
    name: string;
    full_name: string;
    stargazers_count: number;
};

export async function scrapeGithubRepos(githubUsername: string) {
    const { data } = await axios.get<GithubRepository[]>(`https://api.github.com/users/${encodeURIComponent(githubUsername)}/repos`, {
        params: { per_page: 100, sort: "updated" },
        headers: { Accept: "application/vnd.github+json" },
    });

    return data.map(({ description, name, full_name, stargazers_count }) => ({
        description,
        name,
        fullName: full_name,
        starCount: stargazers_count,
    }));
}
