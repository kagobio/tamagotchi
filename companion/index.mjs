#!/usr/bin/env node
// Programa del ordenador de Tinto. Uso:  node companion/index.mjs [start | setup | urls | install-statusline]
import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCalendar } from "./calendar.mjs";
import { configPath, loadConfig, saveConfig } from "./config.mjs";
import { icsSource } from "./ics.mjs";
import { outlookSource } from "./outlook.mjs";
import { claudeSettingsPath, installStatusline } from "./settings.mjs";
import { createServer } from "./server.mjs";
import { Hub } from "./state.mjs";

const stamp = () => new Date().toLocaleTimeString("es-ES");
const log = (text) => console.log(`${stamp()}  ${text}`);
const flag = (args, name) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
};

export function lanAddresses(interfaces = networkInterfaces()) {
  return Object.values(interfaces).flat().filter((a) => a && a.family === "IPv4" && !a.internal).map((a) => a.address);
}

function printUrls(config) {
  const base = `http://localhost:${config.port}`;
  console.log(`\n  Simulador de Tinto con tus datos:\n    ${base}/?key=${config.key}\n`);
  for (const ip of lanAddresses()) console.log(`  Para el iPhone (misma WiFi), la dirección del ordenador es:\n    http://${ip}:${config.port}/phone?key=${config.key}&level=NIVEL&charging=0\n`);
  console.log(`  Clave y ajustes: ${configPath()}\n`);
}

async function start(config) {
  const hub = new Hub();
  const server = createServer({ hub, key: config.key, log });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.host, resolve);
  }).catch((error) => {
    console.error(error.code === "EADDRINUSE" ? `El puerto ${config.port} ya está en uso: ¿hay otro programa de Tinto abierto?` : error.message);
    process.exit(1);
  });
  log(`Tinto escucha en el puerto ${config.port}${config.host === "0.0.0.0" ? " (visible en tu red local)" : " (solo este ordenador)"}`);
  printUrls(config);
  setInterval(() => hub.refresh(), 30000).unref();

  const { source, icsUrl, leadMinutes, skipAllDay, skipFree, pollSeconds } = config.calendar;
  if (source === "off") log("Calendario: desactivado (usa «setup» para elegir Outlook).");
  else {
    const reader = source === "com" ? outlookSource() : icsSource({ url: icsUrl, warn: log });
    const calendar = createCalendar({ hub, source: reader, leadMinutes, skipAllDay, skipFree, log });
    let failing = false;
    const tick = async () => {
      try {
        await calendar.poll();
        if (failing) log("Calendario: vuelve a funcionar.");
        failing = false;
      } catch (error) {
        if (!failing) log(`Calendario: no he podido leerlo (${error.message}). Sigo intentándolo.`);
        failing = true;
      }
    };
    log(`Calendario: ${source === "com" ? "Outlook clásico" : "enlace ICS"}, aviso ${leadMinutes.join(" y ")} min antes.`);
    tick();
    setInterval(tick, Math.max(15, pollSeconds) * 1000).unref();
  }
}

async function main() {
  const [command = "start", ...args] = process.argv.slice(2);
  if (command === "install-statusline") {
    const script = fileURLToPath(new URL("./statusline.mjs", import.meta.url));
    const result = installStatusline(claudeSettingsPath(), `node "${script}"`, { force: args.includes("--force") });
    console.log(result.message);
    return;
  }
  const config = loadConfig();
  if (command === "urls") return printUrls(config);
  if (command === "setup") {
    const calendar = flag(args, "calendar");
    if (calendar) {
      if (!["off", "com", "ics"].includes(calendar)) throw new Error("--calendar debe ser off, com o ics");
      config.calendar.source = calendar;
    }
    if (flag(args, "ics")) config.calendar.icsUrl = flag(args, "ics");
    if (flag(args, "lead")) config.calendar.leadMinutes = flag(args, "lead").split(",").map(Number);
    if (flag(args, "port")) config.port = Number(flag(args, "port"));
    if (flag(args, "host")) config.host = flag(args, "host");
    if (config.calendar.source === "ics" && !config.calendar.icsUrl) throw new Error("Falta el enlace: --ics https://…/calendar.ics");
    saveConfig(config);
    console.log(`Guardado en ${configPath()}`);
    return printUrls(config);
  }
  if (command === "start") return start(config);
  console.error("Uso: node companion/index.mjs [start | setup --calendar com|ics|off [--ics URL] [--lead 10,5] | urls | install-statusline [--force]]");
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
