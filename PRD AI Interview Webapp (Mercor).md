# PRD: AI Interview Webapp (Mercor)

&#32;Goal: finish the app with clean, small, readable code.

## 1. Current state (already in repo)

- **Monorepo**: Turborepo + Bun. `apps/backend` (Express 5, axios, zod, Prisma 8 `@prisma/orm-postgres`, port 3001), `apps/frontend` (Bun.serve + React 19, react-router, sonner, shadcn/ui, Tailwind 4, port 3000).
- **Done**: `POST /api/pre-interview` validates a GitHub profile URL, scrapes up to 100 repos (`name, fullName, description, starCount`), creates `Interview { status: Pre, githubMetaData }`, returns `{ id }`. `Form.tsx` calls it and navigates to `/interview/:id`.
- **Stubs**: `Interview.tsx` and `Result.tsx` are empty placeholders. Routes `/`, `/interview/:interviewId`, `/result/:interviewId` already exist.
- **Schema** (`apps/backend/prisma/contract.prisma`): `Interview(id, githubMetaData Json, status Pre|InProgress|Done, score Int default 0, conversations Message[])`, `Message(id, message, type User|Assistant, interviewId)`. DB access style: `db.orm.public.Interview.create(...)`.
- **Env**: `apps/backend/.env` has `DATABASE_URL` and the OpenAI key.

## 2. Cleanup first (small commit)

- Add `zod` to backend `package.json` (imported but not declared). Check whether `@prisma/client` and `@prisma/adapter-pg` (v7) are unused and remove them.
- Remove `dotenv` (Bun loads `.env` automatically). Keep Express; it is already in use, so update the backend `CLAUDE.md` rule that says not to use it.
- Add `.npm-cache/` to `.gitignore` and untrack it. Remove unused template code: `APITester.tsx`, `/api/hello` routes, unused `page` state in `App.tsx`.
- Move `BACKEND_URL` to `BUN_PUBLIC_BACKEND_URL`. Extend `.env.example` with `OPENAI_API_KEY`, `FRONTEND_ORIGIN`, `REALTIME_MODEL`, `SCORING_MODEL`. Validate env once in `config/env.ts` using zod.

## 3. Target flow

1. Browser calls `POST /api/pre-interview` (exists) and now also receives an `accessToken`.
2. Browser calls `POST /api/interviews/:id/token`. The backend mints an OpenAI ephemeral key (`POST /v1/realtime/client_secrets`, session type `realtime`, model, voice, input transcription enabled) and returns it. Allowed once, only while status is `Pre`.
3. Browser opens WebRTC: mic track + data channel, SDP POST to `https://api.openai.com/v1/realtime/calls` with the ephemeral key. The `Location` response header contains the `call_id`.
4. Browser calls `POST /api/interviews/:id/start { callId }`. The backend opens the **sideband** WebSocket `wss://api.openai.com/v1/realtime?call_id=...` using `Authorization: Bearer OPENAI_API_KEY` (use the `ws` package, as OpenAI documents). Then it sends `session.update` (the system prompt built from repo metadata), then `response.create` so the AI speaks first. It sets status `InProgress` and starts a 60s server timer.
5. Over the sideband, the backend logs **every** event and saves transcript items as `Message` rows: user speech from `conversation.item.input_audio_transcription.completed`, assistant speech from `response.output_audio_transcript.done`. Verify the event names against the current OpenAI docs.
6. The interview ends on the End button, the frontend countdown reaching 0, or the server timer (fallback if the tab closes). All three call one idempotent `finishInterview(id)`: hang up (`POST /v1/realtime/calls/{call_id}/hangup`), close the sideband, run scoring, save the score and feedback, set status `Done`.
7. The frontend shows an "Evaluating..." state, then navigates to `/result/:id`, which shows the full transcript, the score and the feedback.

## 4. Schema changes

Use the Prisma 8 workflow (see `apps/backend/prisma-8.md` and the bundled skill): edit `contract.prisma`, then run `contract:emit`, `migration:plan`, `migration:apply`. Add:

- `Interview`: `accessToken String`, `callId String?`, `feedback String?`, `createdAt`, `startedAt DateTime?`. Make `score` nullable (`Int?`) so "not scored yet" differs from 0.
- `Message`: `createdAt` (needed to order the transcript).

## 5. API (all except pre-interview require `Authorization: Bearer <accessToken>`)

- `POST /api/pre-interview` → `{ id, accessToken }` (extend existing)
- `POST /api/interviews/:id/token` → `{ clientSecret }`
- `POST /api/interviews/:id/start` body `{ callId }` → `204`
- `POST /api/interviews/:id/end` → `{ status }`; awaits scoring; safe to call repeatedly
- `GET /api/interviews/:id` → `{ status, score, feedback, transcript: [{ type, message, createdAt }] }`

## 6. Security

- `OPENAI_API_KEY` stays server-side only. The browser only ever sees the short-lived ephemeral key.
- `accessToken` is a random 32-byte value generated at creation. A middleware checks it on every interview route, using a constant-time comparison. The frontend keeps it in `sessionStorage`.
- The `callId` is accepted once per interview and only in status `Pre`. The ephemeral key is minted once per interview.
- CORS is restricted to `FRONTEND_ORIGIN`. All request bodies are validated with zod. Basic rate limit on `pre-interview`.
- Never log secrets. Log events with the interview id and event type.

## 7. Scoring

After the interview, call the OpenAI text model (`SCORING_MODEL`) with the repo metadata and transcript, using structured output: `{ score: 0-100, feedback: string }`, validated with zod. Rubric: technical depth, clarity, and relevance to the candidate's repos. An empty or near-empty transcript scores 0 with an explanatory note. If scoring fails, return a clear error and keep the transcript.

## 8. Interviewer prompt

Built in `prompt.ts` from the top \~10 repos. The interviewer asks one short question at a time about specific repos, stays on topic, knows the interview lasts about 1 minute, and wraps up politely near the end.

## 9. Code structure and quality rules

```
apps/backend/
  index.ts                  bootstrap only
  src/config/env.ts         validated env + constants (INTERVIEW_DURATION_MS)
  src/routes/interviews.ts  thin handlers
  src/middleware/auth.ts
  src/services/github.ts    (moved)
  src/services/realtime.ts  mint client secret, hangup
  src/services/sideband.ts  SidebandSession class: connect, send, handle + log events
  src/services/sessions.ts  in-memory map of active sessions + timers
  src/services/prompt.ts
  src/services/scoring.ts
  src/repositories/interview.ts   all db calls
  src/schemas.ts            zod schemas
  src/lib/logger.ts
apps/frontend/src/
  lib/api.ts                axios client that attaches the token
  hooks/useRealtimeInterview.ts   WebRTC lifecycle
  components/Interview.tsx  UI only: status, countdown, End button
  components/Result.tsx     transcript + score
```

Rules:

- TypeScript strict, no `any`. Validate at the boundaries with zod. Files stay small (roughly under 150 lines) with one responsibility each.
- Handlers contain no business logic; they call services. Services contain no HTTP code. Only repositories touch `db`.
- No magic numbers or strings; use named constants. Comments explain why, not what.
- Consistent async error handling (one error middleware). No dead code or unused deps. Run prettier.
- Do not edit `node_modules`, `.npm-cache`, or the `.agents/.claude/.cursor/.devin` skill folders.

## 10. Milestones and acceptance criteria

1. **Cleanup + schema**: app boots, migration applied, types check (`bun run check-types`).
2. **Auth + token endpoint**: a request without a valid token gets 401; the token endpoint returns a working ephemeral key once.
3. **Browser WebRTC**: mic permission handled with a toast on denial; the AI's voice is audible; `callId` is sent to the backend.
4. **Sideband**: the system prompt is applied, the AI opens the conversation, every event is logged, and user and assistant transcripts are saved in order.
5. **End + scoring**: the End button, the countdown and the server timer all end the call exactly once; score and feedback are saved; status becomes `Done`.
6. **Result page**: shows transcript, score and feedback. Revisiting `/interview/:id` after `Done` redirects to the result. A manual run from the form to the result page works end to end.

## 11. Out of scope

User accounts, audio storage, multi-instance scaling (the active-session map is in-memory), deployment.
