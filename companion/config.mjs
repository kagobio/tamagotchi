// Configuración del programa del ordenador: un JSON en la carpeta de datos del usuario, con una clave al azar.
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const DEFAULTS = {
  port: 8787,
  host: "0.0.0.0",
  key: "",
  calendar: { source: "off", icsUrl: "", leadMinutes: [10], skipAllDay: true, skipFree: true, pollSeconds: 60 },
};

export function configPath(env = process.env, home = homedir(), platform = process.platform) {
  if (env.TINTO_CONFIG) return env.TINTO_CONFIG;
  if (platform === "win32") return join(env.APPDATA || join(home, "AppData", "Roaming"), "tinto", "config.json");
  return join(env.XDG_CONFIG_HOME || join(home, ".config"), "tinto", "config.json");
}

export function saveConfig(config, path = configPath()) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

export function loadConfig(path = configPath()) {
  let saved = {};
  if (existsSync(path)) {
    try {
      saved = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      throw new Error(`No puedo leer ${path}: ${error.message}`);
    }
  }
  const config = { ...DEFAULTS, ...saved, calendar: { ...DEFAULTS.calendar, ...(saved.calendar || {}) } };
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error(`El puerto de ${path} no es válido: ${config.port}`);
  if (!["off", "com", "ics"].includes(config.calendar.source)) throw new Error(`calendar.source debe ser off, com o ics (${path})`);
  if (!Array.isArray(config.calendar.leadMinutes) || !config.calendar.leadMinutes.every((n) => Number.isFinite(n) && n >= 0)) throw new Error(`calendar.leadMinutes debe ser una lista de minutos (${path})`);
  if (!config.key) {
    config.key = randomBytes(16).toString("hex");
    saveConfig(config, path);
  }
  return config;
}
