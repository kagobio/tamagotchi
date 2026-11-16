// El servidor local: recibe lo del móvil y de Claude, y se lo reparte a Tinto (el simulador hoy, la placa mañana).
import { createHash, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import http from "node:http";
import { fileURLToPath } from "node:url";

const SIMULATOR = fileURLToPath(new URL("../simulador/simulador.html", import.meta.url));
const digest = (text) => createHash("sha256").update(String(text)).digest();
const MAX_BODY = 16 * 1024;

export function createServer({ hub, key, log = () => {}, simulator = SIMULATOR }) {
  const wanted = digest(key);
  const clients = new Set();
  hub.on("message", (message) => {
    for (const res of clients) res.write(`data: ${JSON.stringify(message)}\n\n`);
  });

  const send = (res, status, body, type = "application/json; charset=utf-8") => {
    res.writeHead(status, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff" });
    res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };
  const readBody = (req) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on("data", (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY) {
          chunks.length = 0;
          reject(Object.assign(new Error("el cuerpo es demasiado grande"), { status: 413 }));
        } else if (size <= MAX_BODY) chunks.push(chunk);
      });
      req.on("end", () => {
        if (!chunks.length) return resolve({});
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch {
          reject(Object.assign(new Error("el cuerpo no es JSON"), { status: 400 }));
        }
      });
      req.on("error", reject);
    });

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/health") return send(res, 200, { ok: true });
      const given = url.searchParams.get("key") || req.headers["x-tinto-key"] || "";
      if (!timingSafeEqual(digest(given), wanted)) return send(res, 401, { error: "falta la clave o no es la correcta" });
      const q = (name) => url.searchParams.get(name);

      if (url.pathname === "/" && req.method === "GET") {
        try {
          return send(res, 200, await readFile(simulator), "text/html; charset=utf-8");
        } catch {
          return send(res, 200, `<!doctype html><meta charset="utf-8"><title>Tinto</title><pre>${JSON.stringify(hub.snapshot(), null, 2)}</pre>`, "text/html; charset=utf-8");
        }
      }
      if (url.pathname === "/state" && req.method === "GET") return send(res, 200, hub.snapshot());

      if (url.pathname === "/events" && req.method === "GET") {
        res.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", connection: "keep-alive", "x-accel-buffering": "no" });
        res.write("retry: 3000\n\n");
        for (const message of hub.replay()) res.write(`data: ${JSON.stringify(message)}\n\n`);
        clients.add(res);
        const beat = setInterval(() => res.write(": latido\n\n"), 20000);
        req.on("close", () => {
          clearInterval(beat);
          clients.delete(res);
        });
        return undefined;
      }

      if (url.pathname === "/phone" && (req.method === "GET" || req.method === "POST")) {
        const body = req.method === "POST" ? await readBody(req) : {};
        const level = body.level ?? q("level");
        const charging = body.charging ?? q("charging") ?? false;
        const phone = hub.setPhone(level, charging);
        log(`móvil: ${phone.level} %${phone.charging ? " cargando" : ""}`);
        return send(res, 200, { ok: true, phone });
      }
      if (url.pathname === "/claude" && (req.method === "POST" || req.method === "GET")) {
        const body = req.method === "POST" ? await readBody(req) : {};
        const windows = body.windows ?? (q("used") !== null ? [{ kind: "five_hour", percentUsed: q("used") }] : undefined);
        const claude = hub.setClaude(windows);
        log(`claude: ${claude.used} % usado`);
        return send(res, 200, { ok: true, claude });
      }
      if (url.pathname === "/cal" && req.method === "POST") {
        const body = await readBody(req);
        return send(res, 200, { ok: true, message: hub.notify(body.title || "Evento de prueba", Number(body.minutes) || 0) });
      }
      return send(res, 404, { error: "no existe" });
    } catch (error) {
      const status = error.status || (error instanceof RangeError ? 400 : 500);
      if (status === 500) log(`error: ${error.message}`);
      if (status === 413) res.setHeader("connection", "close");
      return send(res, status, { error: error.message });
    }
  });
  server.on("close", () => clients.forEach((res) => res.end()));
  return server;
}
