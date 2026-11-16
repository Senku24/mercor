import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useNavigate } from "react-router";

export function Form() {
  const [github, setGithub] = useState("");
  const navigate = useNavigate();

  async function OnSubmit() {
    if (!github) {
      toast.error("Please provide a GitHub URL");
      return;
    }
    try {
      const { data } = await api.post<{ id: string; accessToken: string }>(
        "/api/pre-interview",
        { github },
      );
      if (!data.id || !data.accessToken) {
        throw new Error("Backend did not return interview credentials");
      }
      toast.success("GitHub profile loaded");
      sessionStorage.setItem(`interview:${data.id}`, data.accessToken);
      navigate(`/interview/${data.id}`);
    } catch {
      toast.error("Could not load that GitHub profile");
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="flex flex-col">
        <div>
          <h2 className="scroll-m-20 text-2xl pb-2 font-semibold tracking-tight first:mt-0">
            AI Interview Bot Kickstarter
          </h2>
        </div>
        <div className="p-3">
          <Input
            placeholder="Github URL"
            onChange={(e) => setGithub(e.target.value)}
          />
        </div>
        <div className="flex justify-center p-3">
          <Button onClick={OnSubmit}> Start Interview</Button>
        </div>
      </div>
    </div>
  );
}
