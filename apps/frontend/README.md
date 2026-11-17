# bun-react-tailwind-shadcn-template

To install dependencies:

```bash
bun install
```

To start a development server:

```bash
bun dev
```

## Backend URL

The browser reads `BUN_PUBLIC_BACKEND_URL` at build time (`src/lib/config.ts`):

- Development: falls back to `http://localhost:3001` when unset.
- Production build: `bun run build` requires it and fails if it is missing or not an http(s) URL.

Only `BUN_PUBLIC_*` variables are inlined. Never add secrets such as `OPENAI_API_KEY` or `DATABASE_URL` here.

## Static production build

```bash
BUN_PUBLIC_BACKEND_URL=https://api-interview.paulnixon.in bun run build
```

Output goes to `dist/` (`index.html`, JS, CSS, and assets). Deploy the `dist` directory to Cloudflare Pages with build command `bun run build` and output directory `dist`.

To run the static build locally, point it at your local backend and serve `dist`:

```bash
BUN_PUBLIC_BACKEND_URL=http://localhost:3001 bun run build
bunx serve dist
```

`bun start` runs the Bun dev server in production mode (`src/index.ts`); it is not needed for Cloudflare Pages.

This project was created using `bun init` in bun v1.3.13. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
