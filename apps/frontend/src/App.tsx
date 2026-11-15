import { useState } from "react";
import { Form } from "./components/Form";
import { Interview } from "./components/Interview";
import { Result } from "./components/Result"; 
import { Toaster } from "sonner";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router";


export function App() {
  const [page, setPage] = useState<"form" | "interview" | "result">("form");
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Form />} />
        <Route path="/interview/:interviewId" element={<Interview />} />
        <Route path="/result/:interviewId" element={<Result />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
 