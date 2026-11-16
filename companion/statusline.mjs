// Se pone como `statusLine` de Claude Code (terminal): manda el uso al programa del ordenador y escribe una línea corta.
// Claude Code le da por la entrada estándar un JSON con `rate_limits` (puede faltar, sobre todo sin suscripción).
import http from "node:http";
import { loadConfig } from "./config.mjs";

export function windowsFrom(input) {
  const limits = input && input.rate_limits;
  if (!limits) return [];
  return ["five_hour", "seven_day"]
    .filter((kind) => limits[kind] && Number.isFinite(Number(limits[kind].used_percentage)))
    .map((kind) => ({
      kind,
      percentUsed: Number(limits[kind].used_percentage),
      resetsAt: Number.isFinite(Number(limits[kind].resets_at)) ? new Date(Number(limits[kind].resets_at) * 1000).toISOString() : undefined,
    }));
}

export const lineFor = (windows) => windows.map((w) => `${w.kind === "five_hour" ? "5h" : "7d"} ${Math.round(w.percentUsed)}%`).join(" · ");

function post(config, windows) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ windows });
    const req = http.request({ host: "127.0.0.1", port: config.port, path: "/claude", method: "POST", timeout: 1500, headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body), "x-tinto-key": config.key } }, (res) => {
      res.resume();
      res.on("end", resolve);
    });
    req.on("error", resolve);
    req.on("timeout", () => req.destroy());
    req.end(body);
  });
}

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  let input = {};
  try {
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    /* sin entrada: se escribe una línea vacía */
  }
  const windows = windowsFrom(input);
  if (windows.length) await post(loadConfig(), windows);
  process.stdout.write(`${lineFor(windows)}\n`);
}

if (process.argv[1]?.endsWith("statusline.mjs")) main();
