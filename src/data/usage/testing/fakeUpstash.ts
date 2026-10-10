import type { UsageCounterConfig } from "@/data/datasource/config";

export type FakeUpstashFailure = "none" | "http_500" | "error_body" | "network" | "hang";

export const FAKE_USAGE_CONFIG: UsageCounterConfig = {
  enabled: true,
  restUrl: "https://fake-redis.example.test",
  restToken: "fake-test-credential",
};

/** In-memory stand-in for Upstash REST. Several callers sharing one instance model several app instances on one Redis. */
export function createFakeUpstash() {
  const members = new Set<string>();
  const commands: string[][] = [];
  const state = { failure: "none" as FakeUpstashFailure };

  const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
    const command = JSON.parse(String(init?.body)) as string[];
    commands.push(command);
    if (state.failure === "network") throw new TypeError("fetch failed");
    if (state.failure === "hang") {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason ?? new Error("aborted")));
      });
    }
    if (state.failure === "http_500") return new Response("boom", { status: 500 });
    if (state.failure === "error_body") return Response.json({ error: "ERR something" });

    const [name, , member] = command;
    if (name === "SADD") {
      const before = members.size;
      members.add(member);
      return Response.json({ result: members.size - before });
    }
    if (name === "SCARD") return Response.json({ result: members.size });
    return Response.json({ error: `ERR unknown command ${name}` }, { status: 400 });
  }) as typeof fetch;

  return { fetch: fetchImpl, members, commands, state };
}
