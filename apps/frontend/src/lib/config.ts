// Development fallback only. Production builds (apps/frontend/build.ts) require
// BUN_PUBLIC_BACKEND_URL, so this value can never reach a production bundle.
const DEVELOPMENT_BACKEND_URL = "http://localhost:3001";

// Bun inlines this exact expression at build time (see `env: "BUN_PUBLIC_*"`
// in build.ts and bunfig.toml). Only BUN_PUBLIC_* variables are ever exposed.
export const BACKEND_URL: string =
  process.env.BUN_PUBLIC_BACKEND_URL ?? DEVELOPMENT_BACKEND_URL;
