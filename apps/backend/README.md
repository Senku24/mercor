# backend

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Configuration

See the root README for the full variable table. Backend-specific notes:

- `HOST` defaults to `0.0.0.0` for development. Production sets `HOST=127.0.0.1` so Nginx is the only entry point.
- `PORT` defaults to `3001`.
- `GET /health` returns `{"status":"ok"}` without secrets or environment details.
- `DATABASE_URL` is the runtime connection. On Neon use the **direct** string (no `-pooler`): Prisma 8's Postgres runtime sends a `lc_monetary` startup parameter that Neon's pooler rejects.
- `DIRECT_DATABASE_URL` is optional and used only by Prisma migration commands (`migration:plan`, `migration:apply`, `migration:status`) through `prisma.config.ts`. It falls back to `DATABASE_URL` when unset.
- Never expose `OPENAI_API_KEY`, `DATABASE_URL`, or `DIRECT_DATABASE_URL` to frontend code.

This project was created using `bun init` in bun v1.3.13. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
