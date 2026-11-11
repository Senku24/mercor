import express from "express";
import cors from "cors";
import z from "zod";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/pre-interview", (req, res) => {

})


app.listen(3001, () => {
  console.log("Server is running on port 3001");
});