// Las pantallas de la interfaz: menú de juegos, tienda, estado (con retos y logros), resultado, concentración y reloj.
import { GAMES, gameById } from "./games.js";
import { KINDS, itemsOf } from "./items.js";
import { ACHIEVEMENTS, isEquipped, isUnlocked } from "./meta.js";
import { LOW, age, energy, feeling, sleeping, stage } from "./pet.js";
import { drawTinto } from "./draw.js";
import { drawDecorItem } from "./room.js";
import { DAY, H, TAU, W, check, clamp01, gameIcon, lin, lock, rad, rr, soft, star, text, trophy } from "./gfx.js";

// Zonas donde se toca, para dibujarlas y para detectarlas con el mismo dato.
export const UI = {
  back: { x: 20, y: 22, r: 16 },
  hub: { prev: { x: 12, y: 126, r: 17 }, next: { x: 228, y: 126, r: 17 }, card: { x: 26, y: 50, w: 188, h: 150 }, play: { x: 60, y: 226, w: 120, h: 34 } },
  shop: {
    tabs: KINDS.map((k, i) => ({ id: k.id, x: 10 + i * 58, y: 42, w: 54, h: 22 })),
    prev: { x: 12, y: 128, r: 17 },
    next: { x: 228, y: 128, r: 17 },
    action: { x: 40, y: 228, w: 160, h: 34 },
  },
  info: {
    tabs: [0, 1, 2].map((i) => ({ x: 50 + i * 62, y: 10, w: 58, h: 22 })),
    focus: { x: 18, y: 236, w: 100, h: 28 },
    clock: { x: 122, y: 236, w: 100, h: 28 },
  },
  result: { again: { x: 20, y: 232, w: 96, h: 34 }, exit: { x: 124, y: 232, w: 96, h: 34 } },
  focus: { exit: { x: 70, y: 230, w: 100, h: 32 } },
};
export const inRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
export const inCircle = (c, x, y) => Math.hypot(x - c.x, y - c.y) <= c.r;

const bgLight = (ctx) => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#f8f5ff"], [1, "#e9e3f6"]]);
  ctx.fillRect(0, 0, W, H);
};

function wrap(ctx, string, maxWidth, size, weight = 700) {
  ctx.font = `${weight} ${size}px "Nunito", system-ui, sans-serif`;
  const lines = [];
  let line = "";
  for (const word of string.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function backButton(ctx, dark = false) {
  ctx.beginPath();
  ctx.arc(UI.back.x, UI.back.y, 13, 0, TAU);
  ctx.fillStyle = dark ? "rgba(255,255,255,0.16)" : "rgba(90,70,120,0.12)";
  ctx.fill();
  ctx.strokeStyle = dark ? "#fff" : "#4a3f66";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(23, 14);
  ctx.lineTo(16, 22);
  ctx.lineTo(23, 30);
  ctx.stroke();
}

function walletPill(ctx, meta, right = 234, y = 12) {
  ctx.font = '800 12px "Nunito", system-ui, sans-serif';
  const label = String(meta.stars);
  const w = 30 + ctx.measureText(label).width;
  const x = right - w;
  soft(ctx, 4, 1, "rgba(60,40,100,0.25)", () => {
    rr(ctx, x, y, w, 22, 11);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fill();
  });
  star(ctx, x + 11, y + 11, 6.2, 0, false);
  text(ctx, label, x + 21, y + 11.5, { size: 12, color: "#2b2438", weight: 800 });
}

function arrow(ctx, c, dir, enabled = true) {
  ctx.beginPath();
  ctx.arc(c.x, c.y, 13, 0, TAU);
  ctx.fillStyle = enabled ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)";
  ctx.fill();
  ctx.strokeStyle = enabled ? "#4a3f66" : "#b8b0c9";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(c.x - dir * 3, c.y - 6);
  ctx.lineTo(c.x + dir * 3, c.y);
  ctx.lineTo(c.x - dir * 3, c.y + 6);
  ctx.stroke();
}

function pillButton(ctx, r, label, { fill = ["#a678ff", "#7c4ddb"], color = "#fff", disabled = false, size = 14 } = {}) {
  soft(ctx, 5, 2, "rgba(60,40,100,0.3)", () => {
    rr(ctx, r.x, r.y, r.w, r.h, r.h / 2);
    ctx.fillStyle = disabled ? "#cfc8dd" : fill[1];
    ctx.fill();
  });
  rr(ctx, r.x, r.y, r.w, r.h, r.h / 2);
  ctx.fillStyle = disabled ? "#d8d2e4" : lin(ctx, 0, r.y, 0, r.y + r.h, [[0, fill[0]], [1, fill[1]]]);
  ctx.fill();
  text(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + 0.5, { size, color: disabled ? "#8a8499" : color, align: "center", weight: 800 });
}

const ribbon = (ctx, x, y, label, tone) => {
  ctx.font = '800 9px "Nunito", system-ui, sans-serif';
  const w = ctx.measureText(label).width + 16;
  rr(ctx, x - w, y, w, 17, 8.5);
  ctx.fillStyle = tone;
  ctx.fill();
  text(ctx, label, x - w / 2, y + 9, { size: 9, color: "#fff", align: "center", weight: 800, spacing: 0.6 });
};

// ───────── menú de juegos ─────────
export function drawHub(ctx, view) {
  const { meta, hub } = view;
  bgLight(ctx);
  backButton(ctx);
  text(ctx, "Juegos", 44, 22.5, { size: 20, color: "#2b2438", weight: 800 });
  walletPill(ctx, meta);
  const def = GAMES[hub.i];
  const unlocked = isUnlocked(meta, def.id);
  const c = UI.hub.card;
  soft(ctx, 12, 5, "rgba(60,40,100,0.25)", () => {
    rr(ctx, c.x, c.y, c.w, c.h, 22);
    ctx.fillStyle = "#fff";
    ctx.fill();
  });
  ctx.beginPath();
  ctx.arc(120, 96, 36, 0, TAU);
  ctx.fillStyle = lin(ctx, 0, 60, 0, 132, [[0, "#f3ecff"], [1, "#ded2fb"]]);
  ctx.fill();
  ctx.globalAlpha = unlocked ? 1 : 0.35;
  gameIcon(ctx, def.id, 120, 96, 2.4);
  ctx.globalAlpha = 1;
  text(ctx, def.name, 120, 144, { size: 16, color: unlocked ? "#2b2438" : "#8a8499", align: "center", weight: 800, max: 172 });
  wrap(ctx, unlocked ? def.blurb : "Sigue jugando para abrir este juego.", 164, 11.5).slice(0, 2).forEach((line, i) => text(ctx, line, 120, 162 + i * 14, { size: 11.5, color: "#7b7589", align: "center", weight: 700 }));
  if (unlocked) {
    text(ctx, def.how, 38, 190, { size: 10, color: "#8f5be0", weight: 800 });
    text(ctx, meta.best[def.id] ? `Récord ${meta.best[def.id]}` : "Sin récord", 202, 190, { size: 10, color: "#b07a00", align: "right", weight: 800 });
    if (meta.daily && meta.daily.game === def.id && !meta.daily.done) ribbon(ctx, c.x + c.w - 10, c.y + 10, "JUEGO DEL DÍA ×2", "#f0a030");
    else if (view.wants === def.id) ribbon(ctx, c.x + c.w - 10, c.y + 10, "TINTO LO PIDE ×1,5", "#e0589a");
  } else {
    lock(ctx, 120, 96, 1.7);
    text(ctx, `Se abre con ${def.unlock} estrellas ganadas`, 38, 190, { size: 10, color: "#8a8499", weight: 800, max: 160 });
    text(ctx, `faltan ${Math.max(0, def.unlock - meta.lifetime)}`, 202, 190, { size: 10, color: "#d1434f", align: "right", weight: 800 });
  }
  arrow(ctx, UI.hub.prev, -1);
  arrow(ctx, UI.hub.next, 1);
  GAMES.forEach((g, i) => {
    ctx.beginPath();
    ctx.arc(120 + (i - (GAMES.length - 1) / 2) * 12, 212, i === hub.i ? 3.8 : 2.6, 0, TAU);
    ctx.fillStyle = i === hub.i ? "#7c4ddb" : isUnlocked(meta, g.id) ? "#b9a8e6" : "#d4cde2";
    ctx.fill();
  });
  pillButton(ctx, UI.hub.play, unlocked ? "Jugar" : "Bloqueado", { disabled: !unlocked, fill: ["#ffb347", "#f08a1e"], size: 16 });
}

// ───────── tienda ─────────
export function drawShop(ctx, view) {
  const { meta, shop, t } = view;
  bgLight(ctx);
  backButton(ctx);
  text(ctx, "Tienda", 44, 22.5, { size: 20, color: "#2b2438", weight: 800 });
  walletPill(ctx, meta);
  KINDS.forEach((k, i) => {
    const r = UI.shop.tabs[i];
    const on = k.id === shop.tab;
    rr(ctx, r.x, r.y, r.w, r.h, 11);
    ctx.fillStyle = on ? "#7c4ddb" : "rgba(124,77,219,0.12)";
    ctx.fill();
    text(ctx, k.name, r.x + r.w / 2, r.y + r.h / 2 + 0.5, { size: 8.8, color: on ? "#fff" : "#5a4a86", align: "center", weight: 800, max: r.w - 2 });
  });
  const list = itemsOf(shop.tab);
  const item = list[Math.min(shop.i, list.length - 1)];
  const eq = meta.equipped;
  soft(ctx, 12, 5, "rgba(60,40,100,0.22)", () => {
    rr(ctx, 30, 74, 180, 112, 22);
    ctx.fillStyle = "#fff";
    ctx.fill();
  });
  ctx.save();
  rr(ctx, 30, 74, 180, 112, 22);
  ctx.clip();
  ctx.fillStyle = rad(ctx, 120, 150, 10, 120, 150, 110, [[0, "#f3ecff"], [1, "#ffffff"]]);
  ctx.fillRect(30, 74, 180, 112);
  if (item.kind === "hat" || item.kind === "collar") drawTinto(ctx, { ox: 120, oy: 138, s: 0.95, t, face: "contento", night: false, tail: false, headOnly: true, outfit: { hat: item.kind === "hat" ? item.id : eq.hat, collar: item.kind === "collar" ? item.id : eq.collar } });
  else if (item.kind === "basket") drawTinto(ctx, { ox: 120, oy: 156, s: 0.66, t, face: "contento", night: false, tail: false, outfit: { hat: eq.hat, collar: eq.collar }, basket: item.id });
  else drawDecorItem(ctx, item.id, 120, 158, item.id === "alfombra" ? 0.8 : 2.1, DAY, false, t);
  ctx.restore();
  const owned = Boolean(meta.owned[item.id]);
  const on = owned && isEquipped(meta, item.id);
  text(ctx, item.name, 120, 200, { size: 15, color: "#2b2438", align: "center", weight: 800, max: 170 });
  if (owned) text(ctx, on ? "Puesto" : "Lo tienes", 120, 216, { size: 11, color: on ? "#2f9e5a" : "#7b7589", align: "center", weight: 800 });
  else {
    star(ctx, 108, 216, 6, 0, false);
    text(ctx, String(item.price), 118, 216.5, { size: 12, color: meta.stars >= item.price ? "#b07a00" : "#d1434f", weight: 800 });
    if (meta.stars < item.price) text(ctx, `faltan ${item.price - meta.stars}`, 142, 216.5, { size: 10, color: "#d1434f", weight: 700 });
  }
  arrow(ctx, UI.shop.prev, -1);
  arrow(ctx, UI.shop.next, 1);
  const label = owned ? (item.kind === "basket" ? (on ? "Puesta" : "Poner") : on ? "Quitar" : "Poner") : "Comprar";
  pillButton(ctx, UI.shop.action, label, { disabled: !owned && meta.stars < item.price, fill: owned ? ["#6fe08a", "#2fa85a"] : ["#ffb347", "#f08a1e"], size: 15 });
  if (view.shopMsg && view.shopMsg.t > 0) text(ctx, view.shopMsg.text, 120, 270, { size: 10.5, color: "#7c4ddb", align: "center", weight: 800 });
}

// ───────── estado, retos y logros ─────────
const TAB_NAMES = ["Estado", "Hoy", "Logros"];

function meter(ctx, label, value, y, note, colors) {
  text(ctx, label, 26, y, { size: 10, color: "#7b7589", weight: 800, spacing: 1 });
  text(ctx, note, 214, y, { size: 12, color: "#2b2438", align: "right", weight: 800 });
  rr(ctx, 26, y + 10, 188, 11, 5.5);
  ctx.fillStyle = "rgba(90,70,120,0.12)";
  ctx.fill();
  if (value > 0) {
    rr(ctx, 26, y + 10, Math.max(11, 188 * (value / 100)), 11, 5.5);
    ctx.fillStyle = lin(ctx, 0, y + 10, 0, y + 21, [[0, colors[0]], [1, colors[1]]]);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    rr(ctx, 30, y + 12, Math.max(5, 188 * (value / 100) - 8), 2.6, 1.3);
    ctx.fill();
  }
}

export function drawInfo(ctx, view) {
  const { pet, meta, info, t } = view;
  bgLight(ctx);
  backButton(ctx);
  TAB_NAMES.forEach((name, i) => {
    const r = UI.info.tabs[i];
    const on = i === info.tab;
    rr(ctx, r.x, r.y, r.w, r.h, 11);
    ctx.fillStyle = on ? "#7c4ddb" : "rgba(124,77,219,0.12)";
    ctx.fill();
    text(ctx, name, r.x + r.w / 2, r.y + r.h / 2 + 0.5, { size: 10.5, color: on ? "#fff" : "#5a4a86", align: "center", weight: 800 });
  });
  walletPill(ctx, meta, 234, 40);
  if (info.tab === 0) {
    text(ctx, "Tinto", 26, 62, { size: 22, color: "#2b2438", weight: 800 });
    text(ctx, `${feeling(pet)} · ${stage(pet)}`, 26, 82, { size: 11.5, color: "#7b7589", weight: 700 });
    const good = ["#8fe39a", "#3fb26a"];
    const bad = ["#ff9a9a", "#e5484d"];
    meter(ctx, "HAMBRE", pet.fullness, 96, `${Math.round(pet.fullness)} %`, pet.fullness <= LOW.fullness ? bad : good);
    meter(ctx, "ÁNIMO", pet.mood, 128, `${Math.round(pet.mood)} %`, pet.mood <= LOW.mood ? bad : ["#ffd778", "#f0a030"]);
    meter(ctx, "ENERGÍA · CLAUDE", energy(pet), 160, pet.claude ? `${energy(pet)} % libre` : "sin datos", energy(pet) <= LOW.energy ? bad : ["#d9b7ff", "#8f5be0"]);
    meter(ctx, "MÓVIL", pet.phone ? pet.phone.level : 0, 192, pet.phone ? `${pet.phone.level} %${pet.phone.charging ? " cargando" : ""}` : "sin datos", pet.phone && pet.phone.level <= LOW.phone ? bad : ["#8fb4ff", "#4f7fe0"]);
    const next = pet.events.find((e) => !e.rung);
    text(ctx, `edad ${age(pet)} · ${pet.stepsToday} pasos hoy`, 26, 228, { size: 10, color: "#7b7589", weight: 700 });
    if (next) text(ctx, `${next.title} · ${Math.max(1, Math.round((next.at - pet.now) / 60000))} min`, 214, 228, { size: 10, color: "#7b7589", align: "right", weight: 700, max: 110 });
    pillButton(ctx, UI.info.focus, "Concentración", { fill: ["#8fb4ff", "#4f7fe0"], size: 11.5 });
    pillButton(ctx, UI.info.clock, "Reloj", { fill: ["#c59bff", "#8f5be0"], size: 12 });
  } else if (info.tab === 1) {
    const d = gameById(meta.daily.game);
    soft(ctx, 8, 3, "rgba(60,40,100,0.2)", () => {
      rr(ctx, 16, 66, 208, 58, 18);
      ctx.fillStyle = "#fff";
      ctx.fill();
    });
    ctx.beginPath();
    ctx.arc(46, 95, 20, 0, TAU);
    ctx.fillStyle = lin(ctx, 0, 75, 0, 115, [[0, "#fff1c4"], [1, "#ffd27a"]]);
    ctx.fill();
    if (d) gameIcon(ctx, d.id, 46, 95, 1.3);
    text(ctx, "JUEGO DEL DÍA", 76, 82, { size: 9.5, color: "#b07a00", weight: 800, spacing: 1 });
    text(ctx, d ? d.name : "—", 76, 99, { size: 14, color: "#2b2438", weight: 800, max: 140 });
    text(ctx, meta.daily.done ? "¡Hecho hoy!" : "Estrellas ×2 si juegas hoy", 76, 114, { size: 10.5, color: meta.daily.done ? "#2f9e5a" : "#7b7589", weight: 700 });
    text(ctx, "RETOS DE HOY", 20, 138, { size: 9.5, color: "#7b7589", weight: 800, spacing: 1 });
    meta.challenges.list.forEach((c, i) => {
      const y = 148 + i * 26;
      rr(ctx, 16, y, 208, 23, 11.5);
      ctx.fillStyle = c.done ? "rgba(63,178,106,0.16)" : "#fff";
      ctx.fill();
      if (c.done) check(ctx, 30, y + 11.5, 0.9, "#2f9e5a", 2.6);
      else {
        ctx.beginPath();
        ctx.arc(30, y + 11.5, 6, 0, TAU);
        ctx.strokeStyle = "#cfc8dd";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(30, y + 11.5, 6, -Math.PI / 2, -Math.PI / 2 + TAU * clamp01(c.progress / c.goal));
        ctx.strokeStyle = "#7c4ddb";
        ctx.stroke();
      }
      text(ctx, c.text, 42, y + 12, { size: 10.5, color: c.done ? "#6d8a78" : "#2b2438", weight: 800, max: 144 });
      text(ctx, `+${c.reward}`, 216, y + 12, { size: 11, color: "#b07a00", align: "right", weight: 800 });
    });
    text(ctx, `Racha: ${meta.streak.days} ${meta.streak.days === 1 ? "día" : "días"} seguidos`, 120, 238, { size: 12, color: "#2b2438", align: "center", weight: 800 });
    text(ctx, meta.streak.days >= 2 ? `+${Math.min(5, meta.streak.days)} estrellas cada día` : "Vuelve mañana para empezar la racha", 120, 254, { size: 10, color: "#7b7589", align: "center", weight: 700 });
  } else {
    ACHIEVEMENTS.forEach((a, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 12 + col * 110;
      const y = 68 + row * 28;
      const got = Boolean(meta.achievements[a.id]);
      rr(ctx, x, y, 104, 24, 12);
      ctx.fillStyle = got ? "rgba(255,210,100,0.3)" : "rgba(124,77,219,0.07)";
      ctx.fill();
      if (got) trophy(ctx, x + 12, y + 12, 0.8, "#d98a00");
      else lock(ctx, x + 12, y + 12.5, 0.62, "#b8b0c9");
      text(ctx, a.name, x + 23, y + 12.5, { size: 8.6, color: got ? "#2b2438" : "#8a8499", weight: 800, max: 80 });
    });
    text(ctx, `${Object.keys(meta.achievements).length} de ${ACHIEVEMENTS.length}`, 120, 262, { size: 10.5, color: "#7b7589", align: "center", weight: 800 });
  }
}

// ───────── resultado ─────────
export function drawResult(ctx, view) {
  const { result: r, t } = view;
  const sum = r.summary;
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#1b2150"], [1, "#10142c"]]);
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = `rgba(255,236,170,${0.35 + 0.4 * Math.sin(t * 1.6 + i * 1.7)})`;
    ctx.beginPath();
    ctx.arc(20 + ((i * 53) % 200), 30 + ((i * 41) % 150), 1.1, 0, TAU);
    ctx.fill();
  }
  const good = r.result.stars > 0;
  drawTinto(ctx, { ox: 120, oy: 74, s: 0.85, t, face: good ? "contento" : "triste", night: true, tail: false, headOnly: true, outfit: view.outfit, anim: good ? { kind: "love", t: Math.min(t % 3, 1.6), length: 1.6 } : null });
  text(ctx, gameById(r.id).name, 120, 128, { size: 12, color: "#a6aacd", align: "center", weight: 800 });
  const shown = Math.round(sum.stars * clamp01(r.t / 0.9));
  star(ctx, 82, 152, 13, r.t * 3, true);
  text(ctx, `+${shown}`, 102, 153, { size: 30, color: "#ffd75e", weight: 800 });
  text(ctx, r.result.line, 150, 144, { size: 11, color: "#eef0ff", weight: 800, max: 80 });
  text(ctx, `${r.result.score} puntos`, 150, 160, { size: 10.5, color: "#a6aacd", weight: 700 });
  const lines = [];
  if (sum.newBest) lines.push(["¡Nuevo récord!", "#ffd75e"]);
  for (const b of sum.bonuses) lines.push([b, "#8fe3b0"]);
  for (const e of sum.events) lines.push([`${e.type === "reto" ? "Reto" : "Logro"}: ${e.text} +${e.reward}`, "#c9b4ff"]);
  lines.slice(0, 4).forEach(([line, color], i) => text(ctx, line, 120, 182 + i * 14, { size: 10.5, color, align: "center", weight: 800, max: 200 }));
  pillButton(ctx, UI.result.again, "Otra vez", { fill: ["#ffb347", "#f08a1e"] });
  pillButton(ctx, UI.result.exit, "Salir", { fill: ["#8fb4ff", "#4f7fe0"] });
}

// ───────── concentración ─────────
export function drawFocus(ctx, view) {
  const { pet, focus, t } = view;
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#171b3a"], [1, "#0d1029"]]);
  ctx.fillRect(0, 0, W, H);
  const total = focus.length;
  const left = Math.max(0, focus.length - (pet.now - focus.start));
  const k = clamp01(1 - left / total);
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.arc(120, 108, 72, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = focus.done ? "#6fe08a" : "#8fb4ff";
  ctx.beginPath();
  ctx.arc(120, 108, 72, -Math.PI / 2, -Math.PI / 2 + TAU * k);
  ctx.stroke();
  drawTinto(ctx, { ox: 120, oy: 112, s: 0.74, t, face: "dormido", night: true, tail: false, headOnly: true, outfit: view.outfit });
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);
  text(ctx, focus.done ? "¡Lo has conseguido!" : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`, 120, 202, { size: focus.done ? 16 : 30, color: focus.done ? "#8fe3b0" : "#eef0ff", align: "center", weight: 800 });
  text(ctx, focus.done ? `+${focus.reward} estrellas` : "Concentración · Tinto duerme a tu lado", 120, 222, { size: 10.5, color: "#a6aacd", align: "center", weight: 700 });
  rr(ctx, UI.focus.exit.x, UI.focus.exit.y, UI.focus.exit.w, UI.focus.exit.h, 16);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fill();
  text(ctx, focus.done ? "Volver" : "Salir", 120, 246.5, { size: 13, color: "#fff", align: "center", weight: 800 });
}

// ───────── reloj ─────────
export function drawClock(ctx, view) {
  const { pet, t } = view;
  const night = sleeping(pet);
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#0f1230"], [1, "#07081a"]]);
  ctx.fillRect(0, 0, W, H);
  const now = new Date(pet.now);
  text(ctx, `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`, 120, 76, { size: 62, color: "#eef0ff", align: "center", weight: 800 });
  const date = now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  text(ctx, date.charAt(0).toUpperCase() + date.slice(1), 120, 118, { size: 13, color: "#a6aacd", align: "center", weight: 700 });
  if (pet.weather && Number.isFinite(pet.weather.temp)) text(ctx, `${pet.weather.temp}°`, 120, 142, { size: 15, color: "#c9b4ff", align: "center", weight: 800 });
  drawTinto(ctx, { ox: 120, oy: 232, s: 0.5, t, face: night ? "dormido" : "tranquilo", night: true, tail: false, outfit: view.outfit, basket: view.basket });
  text(ctx, "toca para volver", 120, 270, { size: 9.5, color: "#5d6390", align: "center", weight: 700 });
}
