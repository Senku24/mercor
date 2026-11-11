import { useState } from "react";
import { Form } from "./components/Form";
import { Interview } from "./components/Interview";
import { Result } from "./components/Result"; 
import { Toaster } from "sonner";
import "./index.css";


export function App() {
  const [page, setPage] = useState<"form" | "interview" | "result">("form");
  return (
    <div>
      {page === "form" && <Form />}
      {page === "interview" && <Interview />}
      {page === "result" && <Result />}
      <Toaster />
    </div>
  );
}

export default App;
 