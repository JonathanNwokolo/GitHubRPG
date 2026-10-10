import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const action = process.argv[2];
const nextCli = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

function environment(context) {
  const env = { ...process.env, GITHUBRPG_NEXT_CONTEXT: context };
  // NEXT_DIST_DIR used to be a public override. It is deliberately removed so an inherited shell/CI value cannot
  // redirect development, Vercel, local builds or Playwright into another context's output directory.
  delete env.NEXT_DIST_DIR;
  return env;
}

function run(command, args, env) {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

if (action === "dev") {
  const server = spawn(process.execPath, [nextCli, "dev", ...process.argv.slice(3)], {
    stdio: "inherit",
    env: environment("dev"),
  });
  server.on("error", (error) => {
    throw error;
  });
  server.on("exit", (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
} else if (action === "build") {
  process.exitCode = run(process.execPath, [nextCli, "build"], environment("local-build"));
} else if (action === "start") {
  const server = spawn(process.execPath, [nextCli, "start", ...process.argv.slice(3)], {
    stdio: "inherit",
    env: environment("local-build"),
  });
  server.on("error", (error) => {
    throw error;
  });
  server.on("exit", (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
} else if (action === "e2e-build") {
  process.exitCode = run(process.execPath, [nextCli, "build"], environment("e2e"));
} else if (action === "e2e-server") {
  const env = environment("e2e");
  if (process.env.E2E_SKIP_BUILD !== "1") {
    const status = run(process.execPath, [nextCli, "build"], env);
    if (status !== 0) process.exit(status);
  }

  const server = spawn(process.execPath, [nextCli, "start", "-p", "3005"], { stdio: "inherit", env });
  const stop = (signal) => {
    if (!server.killed) server.kill(signal);
  };
  process.on("SIGINT", () => stop("SIGINT"));
  process.on("SIGTERM", () => stop("SIGTERM"));
  server.on("error", (error) => {
    throw error;
  });
  server.on("exit", (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
} else {
  console.error("Usage: node scripts/runNextContext.mjs <dev|build|start|e2e-build|e2e-server>");
  process.exitCode = 1;
}
