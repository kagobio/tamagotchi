import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createServer } from "../server.mjs";
import { Hub } from "../state.mjs";

const KEY = "clave-de-prueba";

async function boot() {
  const hub = new Hub();
  const server = createServer({ hub, key: KEY, simulator: "/no/existe.html" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { hub, server, base, close: () => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }) };
}

test("sin clave o con otra clave no deja pasar, y /health sí", async () => {
  const { base, close } = await boot();
  assert.equal((await fetch(`${base}/state`)).status, 401);
  assert.equal((await fetch(`${base}/state?key=otra`)).status, 401);
  assert.equal((await fetch(`${base}/phone?level=50`)).status, 401);
  assert.equal((await fetch(`${base}/health`)).status, 200);
  assert.equal((await fetch(`${base}/state`, { headers: { "x-tinto-key": KEY } })).status, 200);
  await close();
});

test("el móvil entra por GET (Atajos de iPhone) y por POST", async () => {
  const { base, hub, close } = await boot();
  assert.equal((await fetch(`${base}/phone?key=${KEY}&level=17&charging=1`)).status, 200);
  assert.deepEqual({ level: hub.phone.level, charging: hub.phone.charging }, { level: 17, charging: true });
  const post = await fetch(`${base}/phone?key=${KEY}`, { method: "POST", body: JSON.stringify({ level: 63, charging: false }) });
  assert.equal(post.status, 200);
  assert.equal(hub.phone.level, 63);
  for (const query of ["level=abc", "level=150", "", "level=5&charging=quizá"]) assert.equal((await fetch(`${base}/phone?key=${KEY}&${query}`)).status, 400, query);
  assert.equal((await fetch(`${base}/phone?key=${KEY}`, { method: "POST", body: "{no es json" })).status, 400);
  await close();
});

test("Claude entra con la lista de ventanas y se ve en /state", async () => {
  const { base, close } = await boot();
  const body = JSON.stringify({ windows: [{ kind: "five_hour", percentUsed: 61.5, resetsAt: "2099-01-01T00:00:00Z" }] });
  assert.equal((await fetch(`${base}/claude?key=${KEY}`, { method: "POST", body })).status, 200);
  const state = await (await fetch(`${base}/state?key=${KEY}`)).json();
  assert.equal(state.claude.used, 62);
  assert.equal((await fetch(`${base}/claude?key=${KEY}`, { method: "POST", body: JSON.stringify({ windows: [] }) })).status, 400);
  assert.equal((await fetch(`${base}/claude?key=${KEY}`, { method: "POST", body: "x".repeat(20000) })).status, 413);
  await close();
});

test("el flujo de eventos repite lo último y lleva lo nuevo", async () => {
  const { base, hub, close } = await boot();
  hub.setPhone(55, false);
  const got = [];
  const req = http.get(`${base}/events?key=${KEY}`, (res) => {
    res.setEncoding("utf8");
    res.on("data", (chunk) => {
      for (const line of chunk.split("\n")) if (line.startsWith("data: ")) got.push(JSON.parse(line.slice(6)));
    });
  });
  await new Promise((resolve) => setTimeout(resolve, 150));
  await fetch(`${base}/cal?key=${KEY}`, { method: "POST", body: JSON.stringify({ title: "Prueba", minutes: 5 }) });
  await new Promise((resolve) => setTimeout(resolve, 150));
  req.destroy();
  assert.deepEqual(got, [{ t: "phone", level: 55, charging: false }, { t: "cal", title: "Prueba", minutes: 5 }]);
  await close();
});

test("lo desconocido es 404 y sin simulador la raíz enseña el estado", async () => {
  const { base, close } = await boot();
  assert.equal((await fetch(`${base}/nada?key=${KEY}`)).status, 404);
  const root = await fetch(`${base}/?key=${KEY}`);
  assert.equal(root.status, 200);
  assert.match(await root.text(), /"phone"/);
  await close();
});

test("la raíz sirve el simulador tal cual, sin convertirlo", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tinto-"));
  const file = join(dir, "sim.html");
  writeFileSync(file, "<!doctype html><title>Tinto</title><p id=\"live\">ñ</p>");
  const hub = new Hub();
  const server = createServer({ hub, key: KEY, simulator: file });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const res = await fetch(`http://127.0.0.1:${server.address().port}/?key=${KEY}`);
  assert.match(res.headers.get("content-type"), /text\/html/);
  assert.equal(await res.text(), "<!doctype html><title>Tinto</title><p id=\"live\">ñ</p>");
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});
