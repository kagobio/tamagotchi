import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { configPath, loadConfig } from "../config.mjs";
import { parseOutlookJson } from "../outlook.mjs";
import { installStatusline } from "../settings.mjs";
import { lineFor, windowsFrom } from "../statusline.mjs";

const temp = () => mkdtempSync(join(tmpdir(), "tinto-"));

test("la primera vez se crea una clave y queda guardada solo para el usuario", () => {
  const path = join(temp(), "tinto", "config.json");
  const config = loadConfig(path);
  assert.match(config.key, /^[0-9a-f]{32}$/);
  assert.equal(loadConfig(path).key, config.key);
  if (process.platform !== "win32") assert.equal(statSync(path).mode & 0o077, 0);
});

test("la configuración mala se rechaza con un mensaje claro", () => {
  const path = join(temp(), "c.json");
  writeFileSync(path, JSON.stringify({ port: 99999 }));
  assert.throws(() => loadConfig(path), /puerto/);
  writeFileSync(path, JSON.stringify({ calendar: { source: "google" } }));
  assert.throws(() => loadConfig(path), /off, com o ics/);
  writeFileSync(path, "{roto");
  assert.throws(() => loadConfig(path), /No puedo leer/);
});

test("la ruta de la configuración depende del sistema", () => {
  assert.match(configPath({ APPDATA: "C:\\Users\\a\\AppData\\Roaming" }, "C:\\Users\\a", "win32"), /tinto/);
  assert.equal(configPath({ XDG_CONFIG_HOME: "/x" }, "/h", "linux"), "/x/tinto/config.json");
  assert.equal(configPath({ TINTO_CONFIG: "/otra.json" }), "/otra.json");
});

test("Outlook: lee una lista, un solo evento y la salida vacía, con BOM", () => {
  const one = '\uFEFF{"id":"1","title":"Hola","start":"2026-01-01T10:00:00.0000000Z","end":"2026-01-01T11:00:00Z","allDay":false,"busy":2}';
  assert.equal(parseOutlookJson(one)[0].start, Date.parse("2026-01-01T10:00:00Z"));
  assert.deepEqual(parseOutlookJson(""), []);
  assert.deepEqual(parseOutlookJson("[]"), []);
  const list = parseOutlookJson('[{"id":"a","title":"Cancelado: Sync","start":"2026-01-01T10:00:00Z","end":"2026-01-01T11:00:00Z","allDay":false,"busy":0}]');
  assert.equal(list[0].cancelled, true);
  assert.equal(list[0].free, true);
});

test("statusline: saca las ventanas y la línea", () => {
  const windows = windowsFrom({ rate_limits: { five_hour: { used_percentage: 23.5, resets_at: 1767225600 }, seven_day: { used_percentage: 41.2 } } });
  assert.equal(windows[0].resetsAt, "2026-01-01T00:00:00.000Z");
  assert.equal(lineFor(windows), "5h 24% · 7d 41%");
  assert.deepEqual(windowsFrom({}), []);
  assert.deepEqual(windowsFrom({ rate_limits: { five_hour: {} } }), []);
});

test("instalar el statusline no pisa uno existente salvo con --force", () => {
  const path = join(temp(), ".claude", "settings.json");
  assert.equal(installStatusline(path, "node a").changed, true);
  assert.equal(JSON.parse(readFileSync(path, "utf8")).statusLine.command, "node a");
  assert.equal(installStatusline(path, "node a").changed, false);
  const blocked = installStatusline(path, "node b");
  assert.equal(blocked.changed, false);
  assert.match(blocked.message, /--force/);
  assert.equal(installStatusline(path, "node b", { force: true }).changed, true);
  assert.equal(JSON.parse(readFileSync(`${path}.tinto-copia`, "utf8")).statusLine.command, "node a");
  writeFileSync(path, "{roto");
  assert.match(installStatusline(path, "node c", { force: true }).message, /no es un JSON válido/);
});
