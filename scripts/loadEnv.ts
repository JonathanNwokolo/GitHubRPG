/** Loads GITHUB_TOKEN & co. from .env.local / .env when present (Node >= 20.12). Never prints anything. */
export function loadEnvFiles(): void {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile?.(file);
    } catch {
      /* file not present: fine */
    }
  }
}
