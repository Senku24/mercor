import axios from "axios";
import { BACKEND_URL } from "./config";

export const api = axios.create({ baseURL: BACKEND_URL });

export function createInterviewApi(interviewId: string) {
  const accessToken = sessionStorage.getItem(`interview:${interviewId}`);
  if (!accessToken) return null;

  return axios.create({
    baseURL: BACKEND_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
