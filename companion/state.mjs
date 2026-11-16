// Lo último que se sabe del móvil, de Claude y del calendario, y los mensajes que se mandan a Tinto.
// Los mensajes son los mismos que entiende pet.js: { t: "phone" | "claude" | "cal", ... }.
import { EventEmitter } from "node:events";

const clamp = (value, low = 0, high = 100) => Math.min(high, Math.max(low, value));
const BINDING = ["five_hour", "seven_day"];
export const WEATHER_KINDS = ["clear", "cloud", "fog", "rain", "snow", "storm"];
export const EVENTS = ["claude-done", "claude-ask"];

export function parseBool(value) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "si", "sí", "on", "charging"].includes(text)) return true;
  if (["0", "false", "no", "off", "unplugged", ""].includes(text)) return false;
  throw new RangeError(`charging no se entiende: ${value}`);
}

export class Hub extends EventEmitter {
  constructor(now = () => Date.now()) {
    super();
    this.now = now;
    this.phone = null;
    this.windows = null;
    this.claudeAt = 0;
    this.upcoming = [];
    this.lastUsed = null;
    this.weather = null;
    this.lastEvent = {};
  }

  setPhone(level, charging) {
    const n = Number(level);
    if (level === "" || level === null || level === undefined || !Number.isFinite(n) || n < 0 || n > 100) throw new RangeError("level debe estar entre 0 y 100");
    this.phone = { level: Math.round(n), charging: parseBool(charging ?? false), at: this.now() };
    this.emit("message", { t: "phone", level: this.phone.level, charging: this.phone.charging });
    return this.phone;
  }

  // `windows` es la lista de límites que da Claude Code: [{ kind, percentUsed, resetsAt }].
  setClaude(windows) {
    if (!Array.isArray(windows)) throw new RangeError("windows debe ser una lista");
    const list = [];
    for (const item of windows) {
      const used = Number(item && item.percentUsed);
      if (!Number.isFinite(used)) continue;
      const reset = item.resetsAt ? new Date(item.resetsAt) : null;
      if (reset && Number.isNaN(reset.getTime())) throw new RangeError("resetsAt no es una fecha");
      list.push({ kind: String(item.kind || "").slice(0, 24), percentUsed: Math.round(clamp(used, 0, 1000) * 10) / 10, resetsAt: reset ? reset.toISOString() : null });
    }
    if (!list.length) throw new RangeError("no hay ninguna ventana de uso con un porcentaje");
    this.windows = list;
    this.claudeAt = this.now();
    this.refresh(true);
    return this.snapshot().claude;
  }

  // Lo gastado de la ventana que manda: una ventana que ya se reinició cuenta como vacía.
  claudeUsed(at = this.now()) {
    if (!this.windows) return null;
    const own = this.windows.filter((w) => BINDING.includes(w.kind));
    const pool = own.length ? own : this.windows;
    const used = Math.max(...pool.map((w) => (w.resetsAt && Date.parse(w.resetsAt) <= at ? 0 : w.percentUsed)));
    return Math.round(clamp(used));
  }

  // Avisa de un cambio de uso aunque nadie lo haya mandado (por ejemplo, al reiniciarse la ventana).
  refresh(force = false) {
    const used = this.claudeUsed();
    if (used === null || (!force && used === this.lastUsed)) return;
    this.lastUsed = used;
    this.emit("message", { t: "claude", used });
  }

  notify(title, minutes) {
    const message = { t: "cal", title: String(title).slice(0, 40), minutes: Math.max(0, Math.round(minutes)) };
    this.emit("message", message);
    return message;
  }

  // Un aviso suelto (Claude terminó, Claude te necesita). Se ignora si se repite en cinco segundos.
  event(kind) {
    if (!EVENTS.includes(kind)) throw new RangeError(`event debe ser uno de: ${EVENTS.join(", ")}`);
    const at = this.now();
    if (this.lastEvent[kind] && at - this.lastEvent[kind] < 5000) return false;
    this.lastEvent[kind] = at;
    this.emit("message", { t: kind });
    return true;
  }

  setWeather(kind, temp) {
    if (!WEATHER_KINDS.includes(kind)) throw new RangeError(`kind debe ser uno de: ${WEATHER_KINDS.join(", ")}`);
    const degrees = Number(temp);
    this.weather = { kind, temp: Number.isFinite(degrees) ? Math.round(degrees) : null, at: this.now() };
    this.emit("message", { t: "weather", kind, temp: this.weather.temp });
    return this.weather;
  }

  setUpcoming(list) {
    this.upcoming = list;
  }

  // Lo que se manda a quien se conecta: el último valor conocido de cada cosa.
  replay() {
    const out = [];
    if (this.phone) out.push({ t: "phone", level: this.phone.level, charging: this.phone.charging });
    const used = this.claudeUsed();
    if (used !== null) out.push({ t: "claude", used });
    if (this.weather) out.push({ t: "weather", kind: this.weather.kind, temp: this.weather.temp });
    return out;
  }

  snapshot() {
    const at = this.now();
    return {
      now: at,
      phone: this.phone,
      claude: this.windows ? { used: this.claudeUsed(at), windows: this.windows, at: this.claudeAt } : null,
      weather: this.weather,
      next: this.upcoming,
    };
  }
}
