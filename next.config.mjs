import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const context = process.env.GITHUBRPG_NEXT_CONTEXT;
const distDirByContext = {
  dev: ".next",
  "local-build": ".next-build",
  e2e: ".next-e2e",
};

if (!process.env.VERCEL && context !== undefined && !Object.hasOwn(distDirByContext, context)) {
  throw new Error(`Unsupported GITHUBRPG_NEXT_CONTEXT: ${JSON.stringify(context)}`);
}

// Vercel always owns .next. Outside Vercel, only the project's wrapper selects an isolated context.
const distDir = process.env.VERCEL ? ".next" : (distDirByContext[context] ?? ".next");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  distDir,
};

export default nextConfig;
