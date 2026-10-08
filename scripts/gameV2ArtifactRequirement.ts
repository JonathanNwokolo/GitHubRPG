import { existsSync } from "node:fs";
import path from "node:path";

export function requireGameV2Artifacts(relativePaths: readonly string[]): void {
  const missing = relativePaths.filter((item) => !existsSync(path.resolve(item)));
  if (!missing.length) return;
  throw new Error([
    "Archived Game V2 research inputs are missing.",
    ...missing.map((item) => `- ${item}`),
    "Restore and verify them explicitly with: npm run artifacts:restore",
    "Use ARTIFACTS_RAW_DIR or --target for an isolated restore root.",
  ].join("\n"));
}
