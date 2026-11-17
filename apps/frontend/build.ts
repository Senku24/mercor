import tailwind from "bun-plugin-tailwind";
import { existsSync } from "node:fs";
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

const projectDir = import.meta.dir;
const outdir = path.join(projectDir, "dist");
const BACKEND_ENV = "BUN_PUBLIC_BACKEND_URL";
// Must never appear in a production bundle.
const FORBIDDEN_DEV_ORIGIN = "localhost:3001";

function fail(message: string): never {
  console.error(`\n✖ Frontend build failed: ${message}\n`);
  process.exit(1);
}

// 1. Validate the public backend URL before compiling anything.
const rawBackendUrl = process.env[BACKEND_ENV]?.trim();
if (!rawBackendUrl) {
  fail(
    `${BACKEND_ENV} is not set. Set it to the public backend origin, e.g. ` +
      `${BACKEND_ENV}=https://api-interview.paulnixon.in`,
  );
}

let backendUrl: URL;
try {
  backendUrl = new URL(rawBackendUrl);
} catch {
  fail(`${BACKEND_ENV} is not a valid absolute URL.`);
}
if (backendUrl.protocol !== "http:" && backendUrl.protocol !== "https:") {
  fail(`${BACKEND_ENV} must use http:// or https://.`);
}

// 2. Discover HTML entrypoints.
const entrypoints = [...new Bun.Glob("src/**/*.html").scanSync({ cwd: projectDir })].map(
  (file) => path.join(projectDir, file),
);
if (entrypoints.length === 0) {
  fail("no HTML entrypoints found under src/. Expected src/index.html.");
}

await rm(outdir, { recursive: true, force: true });

// 3. Build. Only BUN_PUBLIC_* variables are inlined.
const result = await Bun.build({
  entrypoints,
  outdir,
  root: path.join(projectDir, "src"),
  // Absolute asset URLs: relative ones break on nested routes like /result/:id,
  // where the SPA fallback would answer asset requests with index.html.
  publicPath: "/",
  plugins: [tailwind],
  minify: true,
  target: "browser",
  sourcemap: "linked",
  env: "BUN_PUBLIC_*",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  fail("Bun.build reported errors (see logs above).");
}

// 4. Output checks.
if (!existsSync(path.join(outdir, "index.html"))) {
  fail("dist/index.html was not generated. Check that src/index.html is the entrypoint.");
}
if (existsSync(path.join(outdir, "404.html"))) {
  fail("dist/404.html must not exist; Cloudflare Pages provides SPA fallback via index.html.");
}

const files = await readdir(outdir, { recursive: true });
for (const file of files) {
  if (!/\.(js|css|html)$/.test(file)) continue;
  const contents = await readFile(path.join(outdir, file), "utf8");
  if (contents.includes(FORBIDDEN_DEV_ORIGIN)) {
    fail(`${file} contains "${FORBIDDEN_DEV_ORIGIN}". Production bundles must not reference the dev backend.`);
  }
}

for (const output of result.outputs) {
  console.log(` ${path.relative(projectDir, output.path)}  ${(output.size / 1024).toFixed(1)} KB`);
}
console.log(`\n✔ Frontend built to dist/ using backend origin ${backendUrl.origin}`);
