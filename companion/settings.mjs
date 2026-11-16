// Pone el statusline de Tinto en los ajustes de Claude Code sin pisar uno que ya exista.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const claudeSettingsPath = (home = homedir()) => join(home, ".claude", "settings.json");

export function installStatusline(path, command, { force = false } = {}) {
  let settings = {};
  if (existsSync(path)) {
    try {
      settings = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      return { changed: false, message: `No he tocado ${path}: no es un JSON válido (${error.message}).` };
    }
  }
  const current = settings.statusLine;
  if (current && current.command === command) return { changed: false, message: "El statusline de Tinto ya estaba puesto." };
  if (current && !force) return { changed: false, message: `Ya tienes un statusline en ${path} (${current.command || current.type}). No lo he cambiado; usa --force para sustituirlo.` };
  if (existsSync(path)) copyFileSync(path, `${path}.tinto-copia`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ ...settings, statusLine: { type: "command", command } }, null, 2)}\n`);
  return { changed: true, message: `Statusline puesto en ${path}${existsSync(`${path}.tinto-copia`) ? " (copia del anterior en settings.json.tinto-copia)" : ""}.` };
}
