// Minimal in-memory Upstash REST stand-in for the e2e suite. Test-only: no real Redis, no real credential.
//   POST /            body ["SADD", key, member] | ["SCARD", key]  ->  { result }
//   GET  /__state     -> { members: [...], commands: [...] }  (inspected by the specs)
import { createServer } from "node:http";

const port = Number(process.env.FAKE_UPSTASH_PORT ?? 3917);
const sets = new Map();
const commands = [];

function reply(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

createServer((request, response) => {
  if (request.method === "GET" && request.url === "/__state") {
    const members = [...(sets.get("ghrpg:v1:invoked-profiles") ?? [])];
    return reply(response, 200, { members, commands });
  }
  if (request.method !== "POST") return reply(response, 405, { error: "method" });

  let raw = "";
  request.on("data", (chunk) => (raw += chunk));
  request.on("end", () => {
    let command;
    try {
      command = JSON.parse(raw);
    } catch {
      return reply(response, 400, { error: "ERR invalid json" });
    }
    if (request.headers.authorization !== "Bearer e2e-test-credential") return reply(response, 401, { error: "Unauthorized" });
    commands.push(command);

    const [name, key, member] = command;
    const set = sets.get(key) ?? new Set();
    sets.set(key, set);
    if (name === "SADD") {
      const before = set.size;
      set.add(member);
      return reply(response, 200, { result: set.size - before });
    }
    if (name === "SCARD") return reply(response, 200, { result: set.size });
    return reply(response, 400, { error: `ERR unknown command ${name}` });
  });
}).listen(port, "127.0.0.1", () => console.log(`fake upstash listening on ${port}`));
