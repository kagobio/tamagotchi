// Lo que da sentido a seguir jugando: estrellas, tienda, juego del día, retos, racha y logros.
// Trabaja sobre un objeto `meta` sencillo que se guarda con la mascota; no toca la pantalla.
import { GAMES, makeRng } from "./games.js";
import { ITEMS, itemById } from "./items.js";

const pad = (n) => String(n).padStart(2, "0");
export const dayKey = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const hash = (text) => {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};
const previousDay = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d - 1).getTime());
};

export function createMeta() {
  return {
    stars: 0,
    lifetime: 0,
    best: {},
    plays: {},
    lastGame: null,
    daily: { day: "", game: "", done: false },
    today: { day: "", games: [] },
    streak: { days: 0, last: "" },
    challenges: { day: "", list: [] },
    owned: { natural: true },
    equipped: { hat: null, collar: null, basket: "natural", decor: [] },
    achievements: {},
    counters: { plays: 0, feed: 0, pet: 0, steps: 0, claps: 0, focus: 0, surprises: 0 },
  };
}

// Rellena lo que le falte a un `meta` guardado por una versión anterior.
export function fixMeta(saved) {
  const base = createMeta();
  const meta = { ...base, ...(saved || {}) };
  for (const key of ["daily", "today", "streak", "challenges", "owned", "equipped", "counters", "best", "plays", "achievements"]) meta[key] = { ...base[key], ...(meta[key] || {}) };
  meta.owned.natural = true;
  if (!Array.isArray(meta.equipped.decor)) meta.equipped.decor = [];
  return meta;
}

export const unlockedIds = (meta) => GAMES.filter((g) => g.unlock <= meta.lifetime).map((g) => g.id);
export const isUnlocked = (meta, id) => unlockedIds(meta).includes(id);

// ───────── el día ─────────
const TARGETS = { estrellas: 12, laser: 9, laberinto: 14, carrera: 22, cajas: 12, topos: 14, simon: 10, pesca: 12 };
const TEMPLATES = [
  { id: "plays", make: (r) => ({ goal: 3 + Math.floor(r() * 3), text: (g) => `Juega ${g} partidas`, event: "play", reward: 5 }) },
  { id: "variety", make: (r) => ({ goal: 2 + Math.floor(r() * 2), text: (g) => `Juega a ${g} juegos distintos`, event: "distinct", reward: 7 }) },
  { id: "stars", make: (r) => ({ goal: 10 + Math.floor(r() * 3) * 5, text: (g) => `Gana ${g} estrellas`, event: "stars", reward: 6 }) },
  { id: "feed", make: () => ({ goal: 2, text: (g) => `Dale de comer ${g} veces`, event: "feed", reward: 3 }) },
  { id: "pet", make: (r) => ({ goal: 3 + Math.floor(r() * 3), text: (g) => `Acaricia a Tinto ${g} veces`, event: "pet", reward: 3 }) },
  { id: "score", make: (r, games) => {
    const id = games[Math.floor(r() * games.length)];
    const name = GAMES.find((x) => x.id === id).name;
    return { goal: TARGETS[id], text: (g) => `Llega a ${g} puntos en ${name}`, event: `score:${id}`, reward: 8, mode: "max" };
  } },
];

export function dailyGame(day, ids) {
  return ids[hash(`diario|${day}`) % ids.length];
}

export function makeChallenges(day, ids) {
  const r = makeRng(hash(`retos|${day}`));
  const pool = [...TEMPLATES];
  const list = [];
  while (list.length < 3) {
    const t = pool.splice(Math.floor(r() * pool.length), 1)[0];
    const c = t.make(r, ids);
    list.push({ id: t.id, text: c.text(c.goal), event: c.event, goal: c.goal, progress: 0, reward: c.reward, mode: c.mode || "sum", done: false });
  }
  return list;
}

// Se llama al abrir y cuando cambia la fecha: renueva el juego del día y los retos y cuenta la racha.
export function refreshDay(meta, now) {
  const day = dayKey(now);
  const out = { newDay: false, streakBonus: 0 };
  const ids = unlockedIds(meta);
  if (meta.daily.day !== day) {
    meta.daily = { day, game: dailyGame(day, ids), done: false };
    meta.today = { day, games: [] };
    meta.challenges = { day, list: makeChallenges(day, ids) };
    out.newDay = true;
  }
  if (meta.streak.last !== day) {
    meta.streak.days = meta.streak.last === previousDay(day) ? meta.streak.days + 1 : 1;
    meta.streak.last = day;
    if (meta.streak.days >= 2) {
      out.streakBonus = Math.min(5, meta.streak.days);
      earn(meta, out.streakBonus);
    }
  }
  return out;
}

function earn(meta, amount) {
  meta.stars += amount;
  meta.lifetime += amount;
}

// ───────── lo que ocurre ─────────
export function record(meta, event, amount = 1) {
  const done = [];
  if (event in meta.counters) meta.counters[event] += amount;
  for (const c of meta.challenges.list) {
    if (c.done || c.event !== event) continue;
    c.progress = c.mode === "max" ? Math.max(c.progress, amount) : c.progress + amount;
    if (c.progress >= c.goal) {
      c.done = true;
      c.progress = c.goal;
      earn(meta, c.reward);
      done.push({ type: "reto", text: c.text, reward: c.reward });
    }
  }
  return done;
}

export const ACHIEVEMENTS = [
  { id: "primera", name: "Primera partida", test: (m) => m.counters.plays >= 1, reward: 3 },
  { id: "diez", name: "10 partidas", test: (m) => m.counters.plays >= 10, reward: 5 },
  { id: "cincuenta", name: "50 partidas", test: (m) => m.counters.plays >= 50, reward: 15 },
  { id: "variado", name: "Cinco juegos distintos", test: (m) => Object.keys(m.plays).length >= 5, reward: 10 },
  { id: "todos", name: "Todos los juegos", test: (m) => GAMES.every((g) => m.plays[g.id]), reward: 25 },
  { id: "cien", name: "100 estrellas ganadas", test: (m) => m.lifetime >= 100, reward: 8 },
  { id: "quinientas", name: "500 estrellas ganadas", test: (m) => m.lifetime >= 500, reward: 20 },
  { id: "racha3", name: "Tres días seguidos", test: (m) => m.streak.days >= 3, reward: 6 },
  { id: "racha7", name: "Una semana seguida", test: (m) => m.streak.days >= 7, reward: 15 },
  { id: "tienda", name: "Cinco cosas compradas", test: (m) => Object.keys(m.owned).length >= 6, reward: 10 },
  { id: "concentrado", name: "Una sesión de concentración", test: (m) => m.counters.focus >= 1, reward: 6 },
  { id: "paseador", name: "1000 pasos con Tinto", test: (m) => m.counters.steps >= 1000, reward: 8 },
];

export function checkAchievements(meta, now) {
  const won = [];
  for (const a of ACHIEVEMENTS) {
    if (meta.achievements[a.id] || !a.test(meta)) continue;
    meta.achievements[a.id] = now;
    earn(meta, a.reward);
    won.push({ type: "logro", text: a.name, reward: a.reward });
  }
  return won;
}

// Lo que Tinto pide ahora: otro juego distinto del último, y cambia cada diez minutos.
export function wantedGame(meta, now, mood = 0) {
  if (mood >= 70) return null;
  const ids = unlockedIds(meta).filter((id) => id !== meta.lastGame);
  return ids.length ? ids[hash(`quiere|${Math.floor(now / 600000)}`) % ids.length] : null;
}

export function finishGame(meta, id, result, now, { wanted = null } = {}) {
  const base = result.stars;
  const bonuses = [];
  let factor = 1;
  if (meta.lastGame && meta.lastGame !== id) {
    factor *= 1.5;
    bonuses.push("variedad ×1,5");
  }
  if (!meta.daily.done && meta.daily.game === id) {
    factor *= 2;
    meta.daily.done = true;
    bonuses.push("juego del día ×2");
  }
  if (wanted === id) {
    factor *= 1.5;
    bonuses.push("lo que pedía ×1,5");
  }
  let stars = Math.round(base * factor);
  if (base > 0 && stars < 1) stars = 1;
  earn(meta, stars);
  const newBest = result.score > (meta.best[id] || 0);
  if (newBest) meta.best[id] = result.score;
  meta.plays[id] = (meta.plays[id] || 0) + 1;
  meta.lastGame = id;
  if (!meta.today.games.includes(id)) meta.today.games.push(id);
  const events = [];
  events.push(...record(meta, "plays", 1), ...record(meta, "play", 1), ...record(meta, "stars", stars));
  events.push(...record(meta, `score:${id}`, result.score));
  const distinct = meta.today.games.length;
  for (const c of meta.challenges.list) if (c.event === "distinct" && !c.done) events.push(...record(meta, "distinct", Math.max(0, distinct - c.progress)));
  events.push(...checkAchievements(meta, now));
  return { stars, base, bonuses, newBest, events };
}

// Estrellas que no vienen de un juego (sorpresas, pasos, concentración…).
export function award(meta, amount, event = null) {
  earn(meta, amount);
  const events = event ? record(meta, event, 1) : [];
  events.push(...checkAchievements(meta, Date.now()));
  return events;
}

// ───────── tienda ─────────
export function buy(meta, id) {
  const item = itemById(id);
  if (!item) return { ok: false, reason: "no existe" };
  if (meta.owned[id]) return { ok: false, reason: "ya lo tienes" };
  if (meta.stars < item.price) return { ok: false, reason: `faltan ${item.price - meta.stars} estrellas` };
  meta.stars -= item.price;
  meta.owned[id] = true;
  return { ok: true, events: checkAchievements(meta, Date.now()) };
}

export function equip(meta, id) {
  const item = itemById(id);
  if (!item || !meta.owned[id]) return false;
  const eq = meta.equipped;
  if (item.kind === "decor") eq.decor = eq.decor.includes(id) ? eq.decor.filter((x) => x !== id) : [...eq.decor, id];
  else if (item.kind === "basket") eq.basket = id;
  else eq[item.kind] = eq[item.kind] === id ? null : id;
  return true;
}

export const isEquipped = (meta, id) => {
  const item = itemById(id);
  const eq = meta.equipped;
  return item.kind === "decor" ? eq.decor.includes(id) : item.kind === "basket" ? eq.basket === id : eq[item.kind] === id;
};
export { ITEMS };
