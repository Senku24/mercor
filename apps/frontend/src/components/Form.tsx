import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { BACKEND_URL } from "../lib/config";


export function Form() {

    const [github, setGithub] = useState("");
    const [linkedin, setLinkedin] = useState("");

    async function OnSubmit() {
         if(!github || !linkedin) {
            toast.error("Please give valid Github and Linkedin URLs");
            return;
         }
         toast.success("Starting interview...");
         await axios.post( `${BACKEND_URL}/api/pre-interview`, { github, linkedin } );
    }

    return (
        <div className="h-screen w-screen flex items-center justify-center">
       <div className="flex flex-col">
        <div>
          <h2 className= "scroll-m-20 text-2xl pb-2 font-semibold tracking-tight first:mt-0">
            AI Interview Bot Kickstarter
          </h2>
        </div>
        <div className ="p-3">
          <Input placeholder="Linkdin URL" onChange = { e => setLinkedin(e.target.value)} /></div>
        <div className ="p-3">
          <Input placeholder="Github URL" onChange = { e => setGithub(e.target.value)} /></div>
        <div className ="flex justify-center p-3">
          <Button onClick={OnSubmit}> Start Interview</Button></div>
       </div>
    </div>
    )
}