// Outlook clásico de Windows, leído con PowerShell (outlook.ps1). No funciona con el «nuevo Outlook».
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const SCRIPT = fileURLToPath(new URL("./outlook.ps1", import.meta.url));
const CANCELLED = /^(canceled|cancelled|cancelado|annul[ée]|abgesagt)\s*:/i;

export function parseOutlookJson(text) {
  const clean = text.replace(/^﻿/, "").trim();
  if (!clean) return [];
  const list = JSON.parse(clean);
  return (Array.isArray(list) ? list : [list]).map((item) => ({
    id: String(item.id),
    title: String(item.title || "Evento"),
    start: Date.parse(item.start),
    end: Date.parse(item.end),
    allDay: Boolean(item.allDay),
    free: Number(item.busy) === 0,
    cancelled: CANCELLED.test(String(item.title || "")),
  })).filter((event) => Number.isFinite(event.start));
}

export function outlookSource({ exec = promisify(execFile), script = SCRIPT } = {}) {
  return {
    async fetchUpcoming(from, to) {
      try {
        const { stdout } = await exec("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script, "-From", new Date(from).toISOString(), "-To", new Date(to).toISOString()], { timeout: 45000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
        return parseOutlookJson(stdout);
      } catch (error) {
        if (error && (error.code === 2 || /OUTLOOK_NO_COM/.test(String(error.stderr)))) throw new Error("no encuentro Outlook clásico (¿usas el «nuevo Outlook»? Prueba con el enlace ICS)");
        throw error;
      }
    },
  };
}
