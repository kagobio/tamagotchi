// Lector de calendarios ICS (el enlace público de Outlook): eventos sueltos y repetidos, con zonas horarias.
import https from "node:https";
import http from "node:http";

// Los nombres de zona de Windows que usa Outlook, y su equivalente estándar.
const WINDOWS_ZONES = {
  UTC: "UTC", "GMT Standard Time": "Europe/London", "Greenwich Standard Time": "Atlantic/Reykjavik",
  "W. Europe Standard Time": "Europe/Berlin", "Central Europe Standard Time": "Europe/Budapest", "Romance Standard Time": "Europe/Madrid",
  "Central European Standard Time": "Europe/Warsaw", "E. Europe Standard Time": "Europe/Chisinau", "FLE Standard Time": "Europe/Kiev",
  "GTB Standard Time": "Europe/Bucharest", "Russian Standard Time": "Europe/Moscow", "Turkey Standard Time": "Europe/Istanbul",
  "Eastern Standard Time": "America/New_York", "Central Standard Time": "America/Chicago", "Mountain Standard Time": "America/Denver",
  "Pacific Standard Time": "America/Los_Angeles", "US Mountain Standard Time": "America/Phoenix", "Alaskan Standard Time": "America/Anchorage",
  "Hawaiian Standard Time": "Pacific/Honolulu", "Atlantic Standard Time": "America/Halifax", "Canada Central Standard Time": "America/Regina",
  "Mexico Standard Time": "America/Mexico_City", "SA Pacific Standard Time": "America/Bogota", "Argentina Standard Time": "America/Argentina/Buenos_Aires",
  "E. South America Standard Time": "America/Sao_Paulo", "SA Western Standard Time": "America/La_Paz", "Pacific SA Standard Time": "America/Santiago",
  "Venezuela Standard Time": "America/Caracas", "W. Central Africa Standard Time": "Africa/Lagos", "South Africa Standard Time": "Africa/Johannesburg",
  "Egypt Standard Time": "Africa/Cairo", "Morocco Standard Time": "Africa/Casablanca", "Israel Standard Time": "Asia/Jerusalem",
  "Arab Standard Time": "Asia/Riyadh", "Arabian Standard Time": "Asia/Dubai", "India Standard Time": "Asia/Kolkata", "China Standard Time": "Asia/Shanghai",
  "Tokyo Standard Time": "Asia/Tokyo", "Korea Standard Time": "Asia/Seoul", "Singapore Standard Time": "Asia/Singapore",
  "AUS Eastern Standard Time": "Australia/Sydney", "E. Australia Standard Time": "Australia/Brisbane", "New Zealand Standard Time": "Pacific/Auckland",
};

const formatters = new Map();
function offsetAt(utcMs, zone) {
  let format = formatters.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
    formatters.set(zone, format);
  }
  const parts = {};
  for (const { type, value } of format.formatToParts(new Date(utcMs))) parts[type] = Number(value);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - Math.floor(utcMs / 1000) * 1000;
}

// La hora de pared (año, mes, día…) de una zona, convertida a milisegundos UTC, con el cambio de hora bien.
export function zonedToUtc(y, mo, d, h, mi, s, zone) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const first = offsetAt(guess, zone);
  let utc = guess - first;
  const second = offsetAt(utc, zone);
  if (second !== first) utc = guess - second;
  return utc;
}

export function zoneName(tzid) {
  const name = WINDOWS_ZONES[tzid] || tzid;
  try {
    offsetAt(0, name);
    return name;
  } catch {
    return null;
  }
}

const unescapeText = (text) => text.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");

function unfold(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function parseLine(line) {
  let quoted = false;
  let split = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    else if (line[i] === ":" && !quoted) {
      split = i;
      break;
    }
  }
  if (split < 0) return null;
  const [name, ...rest] = line.slice(0, split).split(";");
  const params = {};
  for (const part of rest) {
    const eq = part.indexOf("=");
    if (eq > 0) params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: name.toUpperCase(), params, value: line.slice(split + 1) };
}

// "20260115T093000Z", "20260115T093000" (con TZID) o "20260115" (todo el día).
function parseDate(value, params, warn) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d, h = 0, mi = 0, s = 0] = m.slice(1, 7).map((x) => (x === undefined ? 0 : Number(x)));
  const allDay = m[4] === undefined || params.VALUE === "DATE";
  if (m[7]) return { local: { y, mo, d, h, mi, s }, zone: "UTC", allDay, ms: Date.UTC(y, mo - 1, d, h, mi, s) };
  let zone = params.TZID ? zoneName(params.TZID) : null;
  if (params.TZID && !zone) {
    warn(`zona horaria desconocida: ${params.TZID}; uso la de este ordenador`);
    zone = null;
  }
  const ms = zone ? zonedToUtc(y, mo, d, h, mi, s, zone) : new Date(y, mo - 1, d, h, mi, s).getTime();
  return { local: { y, mo, d, h, mi, s }, zone, allDay, ms };
}

const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function parseRule(value) {
  const rule = { freq: "", interval: 1, count: Infinity, until: Infinity, byDay: [], byMonthDay: [], byMonth: [] };
  for (const part of value.split(";")) {
    const [key, val] = part.split("=");
    if (key === "FREQ") rule.freq = val;
    else if (key === "INTERVAL") rule.interval = Math.max(1, Number(val) || 1);
    else if (key === "COUNT") rule.count = Number(val);
    else if (key === "UNTIL") {
      const date = parseDate(val, {}, () => {});
      if (date) rule.until = date.allDay ? date.ms + 86400000 - 1 : date.ms;
    } else if (key === "BYDAY") {
      rule.byDay = val.split(",").map((d) => {
        const m = /^([+-]?\d+)?([A-Z]{2})$/.exec(d);
        return m ? { n: m[1] ? Number(m[1]) : 0, dow: DAYS.indexOf(m[2]) } : null;
      }).filter(Boolean);
    } else if (key === "BYMONTHDAY") rule.byMonthDay = val.split(",").map(Number);
    else if (key === "BYMONTH") rule.byMonth = val.split(",").map(Number);
  }
  return rule;
}

const daysInMonth = (y, mo) => new Date(Date.UTC(y, mo, 0)).getUTCDate();
const dowOf = (y, mo, d) => new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
const addDays = ({ y, mo, d }, n) => {
  const date = new Date(Date.UTC(y, mo - 1, d + n));
  return { y: date.getUTCFullYear(), mo: date.getUTCMonth() + 1, d: date.getUTCDate() };
};
const dayKey = ({ y, mo, d }) => y * 10000 + mo * 100 + d;

// Los días que cumple la regla en el periodo k (día, semana, mes o año contados desde el inicio).
function periodDays(rule, start, k) {
  const step = k * rule.interval;
  if (rule.freq === "DAILY") return [addDays(start, step)];
  if (rule.freq === "WEEKLY") {
    const weekStart = addDays(start, -((dowOf(start.y, start.mo, start.d) + 6) % 7) + step * 7);
    const wanted = rule.byDay.length ? rule.byDay.map((b) => b.dow) : [dowOf(start.y, start.mo, start.d)];
    return wanted.map((dow) => addDays(weekStart, (dow + 6) % 7)).sort((a, b) => dayKey(a) - dayKey(b));
  }
  if (rule.freq === "MONTHLY" || rule.freq === "YEARLY") {
    const months = rule.freq === "MONTHLY" ? [((start.mo - 1 + step) % 12) + 1] : (rule.byMonth.length ? rule.byMonth : [start.mo]);
    const year = rule.freq === "MONTHLY" ? start.y + Math.floor((start.mo - 1 + step) / 12) : start.y + step;
    const out = [];
    for (const mo of months) {
      const last = daysInMonth(year, mo);
      if (rule.byDay.length) {
        for (const { n, dow } of rule.byDay) {
          const days = [];
          for (let d = 1; d <= last; d++) if (dowOf(year, mo, d) === dow) days.push(d);
          if (!n) days.forEach((d) => out.push({ y: year, mo, d }));
          else {
            const pick = n > 0 ? days[n - 1] : days[days.length + n];
            if (pick) out.push({ y: year, mo, d: pick });
          }
        }
      } else if (rule.byMonthDay.length) {
        for (const d of rule.byMonthDay) {
          const day = d > 0 ? d : last + d + 1;
          if (day >= 1 && day <= last) out.push({ y: year, mo, d: day });
        }
      } else if (start.d <= last) out.push({ y: year, mo, d: start.d });
    }
    return out.sort((a, b) => dayKey(a) - dayKey(b));
  }
  return [];
}

// Todas las veces que empieza una serie entre `from` y `to` (milisegundos).
export function occurrences(event, from, to) {
  if (!event.rule) return event.start.ms >= from && event.start.ms <= to ? [event.start.ms] : [];
  const { rule } = event;
  const { local, zone } = event.start;
  const out = [];
  let counted = 0;
  for (let k = 0; k < 20000; k++) {
    let passed = false;
    for (const day of periodDays(rule, local, k)) {
      if (dayKey(day) < dayKey(local)) continue;
      const ms = zone ? zonedToUtc(day.y, day.mo, day.d, local.h, local.mi, local.s, zone) : new Date(day.y, day.mo - 1, day.d, local.h, local.mi, local.s).getTime();
      if (ms > rule.until || counted >= rule.count) return out;
      counted += 1;
      if (ms > to) passed = true;
      else if (ms >= from) out.push(ms);
    }
    if (passed) return out;
  }
  return out;
}

export function parseIcs(text, { from, to, warn = () => {} }) {
  const lines = unfold(text);
  const raw = [];
  let current = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") current = { ex: [], props: {} };
    else if (line === "END:VEVENT") {
      if (current) raw.push(current);
      current = null;
    } else if (current) {
      const prop = parseLine(line);
      if (!prop) continue;
      if (prop.name === "EXDATE") for (const v of prop.value.split(",")) {
        const d = parseDate(v, prop.params, warn);
        if (d) current.ex.push(d.ms);
      } else current.props[prop.name] = prop;
    }
  }
  const masters = [];
  const overrides = new Map();
  for (const item of raw) {
    const p = item.props;
    if (!p.DTSTART) continue;
    const start = parseDate(p.DTSTART.value, p.DTSTART.params, warn);
    if (!start) continue;
    let duration = 0;
    if (p.DTEND) {
      const end = parseDate(p.DTEND.value, p.DTEND.params, warn);
      if (end) duration = end.ms - start.ms;
    } else if (start.allDay) duration = 86400000;
    const event = {
      id: p.UID ? p.UID.value : `${p.SUMMARY ? p.SUMMARY.value : "evento"}@${start.ms}`,
      title: unescapeText(p.SUMMARY ? p.SUMMARY.value : "Evento"),
      start, duration, allDay: start.allDay, ex: item.ex,
      cancelled: Boolean(p.STATUS && p.STATUS.value.toUpperCase() === "CANCELLED"),
      free: Boolean(p.TRANSP && p.TRANSP.value.toUpperCase() === "TRANSPARENT"),
      rule: p.RRULE ? parseRule(p.RRULE.value) : null,
    };
    if (p["RECURRENCE-ID"]) {
      const original = parseDate(p["RECURRENCE-ID"].value, p["RECURRENCE-ID"].params, warn);
      if (original) overrides.set(`${event.id}|${original.ms}`, event);
    } else masters.push(event);
  }
  const out = [];
  const push = (event, ms) => out.push({ id: event.id, title: event.title, start: ms, end: ms + event.duration, allDay: event.allDay, free: event.free, cancelled: event.cancelled });
  for (const event of masters) {
    for (const ms of occurrences(event, from, to)) {
      if (event.ex.includes(ms)) continue;
      const moved = overrides.get(`${event.id}|${ms}`);
      if (moved) {
        if (moved.start.ms >= from && moved.start.ms <= to) push(moved, moved.start.ms);
      } else push(event, ms);
    }
  }
  for (const [key, moved] of overrides) {
    const id = key.slice(0, key.lastIndexOf("|"));
    if (!masters.some((m) => m.id === id) && moved.start.ms >= from && moved.start.ms <= to) push(moved, moved.start.ms);
  }
  return out;
}

function download(url, redirects = 3) {
  return new Promise((resolve, reject) => {
    const target = new URL(url.replace(/^webcal:/i, "https:"));
    const client = target.protocol === "http:" ? http : https;
    const req = client.get(target, { headers: { accept: "text/calendar, */*", "user-agent": "tinto-companion" }, timeout: 20000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        resolve(download(new URL(res.headers.location, target).toString(), redirects - 1));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`el calendario respondió ${res.statusCode}`));
        return;
      }
      const chunks = [];
      let size = 0;
      res.on("data", (chunk) => {
        size += chunk.length;
        if (size > 20 * 1024 * 1024) req.destroy(new Error("el calendario es demasiado grande"));
        else chunks.push(chunk);
      });
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("timeout", () => req.destroy(new Error("el calendario tardó demasiado en responder")));
    req.on("error", reject);
  });
}

export function icsSource({ url, fetchText = download, warn = () => {} }) {
  return { async fetchUpcoming(from, to) { return parseIcs(await fetchText(url), { from, to, warn }); } };
}
