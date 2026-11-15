import axios from "axios";
import { BACKEND_URL } from "./config";

export const api = axios.create({ baseURL: BACKEND_URL });
api.interceptors.request.use((config) => {
  const interviewId = config.url?.match(/\/interviews\/([^/]+)/)?.[1];
  const token = interviewId
    ? sessionStorage.getItem(`interview:${interviewId}`)
    : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
