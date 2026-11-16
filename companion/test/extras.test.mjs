import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadConfig } from "../config.mjs";
import { createServer } from "../server.mjs";
import { Hub } from "../state.mjs";
import { createWeather, kindOf, urlFor } from "../weather.mjs";

const KEY = "clave-extras";

test("avisos de Claude: se mandan una vez y se ignoran si se repiten enseguida", () => {
  let now = 1000;
  const hub = new Hub(() => now);
  const got = [];
  hub.on("message", (m) => got.push(m));
  assert.equal(hub.event("claude-done"), true);
  assert.equal(hub.event("claude-done"), false);
  assert.equal(hub.event("claude-ask"), true);
  now += 6000;
  assert.equal(hub.event("claude-done"), true);
  assert.deepEqual(got.map((m) => m.t), ["claude-done", "claude-ask", "claude-done"]);
  assert.throws(() => hub.event("otra-cosa"), RangeError);
});

test("el tiempo se valida, se manda y se repite a quien se conecta", () => {
  const hub = new Hub();
  const got = [];
  hub.on("message", (m) => got.push(m));
  hub.setWeather("rain", 11.6);
  assert.deepEqual(got[0], { t: "weather", kind: "rain", temp: 12 });
  assert.deepEqual(hub.replay().at(-1), { t: "weather", kind: "rain", temp: 12 });
  assert.equal(hub.setWeather("snow", "frío").temp, null);
  assert.throws(() => hub.setWeather("granizo", 3), RangeError);
  assert.equal(hub.snapshot().weather.kind, "snow");
});

test("los códigos del tiempo se traducen y la dirección usa coordenadas redondeadas", () => {
  assert.deepEqual([0, 3, 45, 63, 73, 82, 95, 999].map(kindOf), ["clear", "cloud", "fog", "rain", "snow", "rain", "storm", "cloud"]);
  const url = urlFor({ lat: 40.416775, lon: -3.703790 });
  assert.match(url, /latitude=40\.42&longitude=-3\.70/);
  assert.doesNotMatch(url, /40\.4167/);
});

test("el tiempo consulta, avisa y falla con un mensaje claro", async () => {
  const hub = new Hub();
  const got = [];
  hub.on("message", (m) => got.push(m));
  const weather = createWeather({ hub, lat: 40.4, lon: -3.7, fetchJson: async () => ({ current: { weather_code: 61, temperature_2m: 9.4 } }) });
  assert.deepEqual(await weather.poll(), { kind: "rain", temp: 9, at: hub.weather.at });
  assert.equal(got.length, 1);
  const bad = createWeather({ hub, lat: 1, lon: 1, fetchJson: async () => ({ nada: true }) });
  await assert.rejects(bad.poll(), /inesperada/);
});

test("el servidor recibe los avisos de Claude y rechaza los que no existen", async () => {
  const hub = new Hub();
  const server = createServer({ hub, key: KEY, simulator: "/no/existe.html" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const got = [];
  hub.on("message", (m) => got.push(m));
  const post = (body) => fetch(`${base}/notify?key=${KEY}`, { method: "POST", body: JSON.stringify(body) });
  assert.deepEqual(await (await post({ event: "claude-done" })).json(), { ok: true, sent: true });
  assert.deepEqual(await (await post({ event: "claude-done" })).json(), { ok: true, sent: false });
  assert.equal((await post({ event: "borrar-todo" })).status, 400);
  assert.equal((await fetch(`${base}/notify`, { method: "POST", body: "{}" })).status, 401);
  assert.deepEqual(got, [{ t: "claude-done" }]);
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

test("la configuración del tiempo se valida", () => {
  const path = join(mkdtempSync(join(tmpdir(), "tinto-")), "c.json");
  writeFileSync(path, JSON.stringify({ weather: { enabled: true, lat: 95, lon: 0 } }));
  assert.throws(() => loadConfig(path), /coordenadas/);
  writeFileSync(path, JSON.stringify({ weather: { enabled: true, lat: 40.4, lon: -3.7 } }));
  assert.equal(loadConfig(path).weather.lat, 40.4);
  writeFileSync(path, JSON.stringify({}));
  assert.equal(loadConfig(path).weather.enabled, false);
});
