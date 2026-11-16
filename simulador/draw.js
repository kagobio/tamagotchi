// Todo lo que se pinta en la pantalla de 240 × 280. Solo usa rectángulos y texto,
// las mismas primitivas que tendrá la placa.
import { GAME, LOW, NAME, age, energy, feeling, sleeping, whisper } from "./pet.js";

export const W = 240;
export const H = 280;
export const MENU = ["comer", "jugar", "dormir", "estado"];
export const SLOTS = [48, 96, 144, 192];
export const BAR = { y: 232, size: 40 };
export const LANES = [60, 120, 180];

const C = {
  ink: "#1b1530",
  fur: "#34313f",
  sheen: "#524e64",
  rim: "#a19eba",
  lid: "#8a86a3",
  ear: "#d68ba0",
  nose: "#c97b8c",
  mouth: "#7a2e3f",
  eyeG: "#b4de5e",
  eyeW: "#d9ecf2",
  eyeCloud: "#9cb9c7",
  white: "#ffffff",
  leaf: "#5cc96b",
  stem: "#3a9a4c",
  yellow: "#ffd45e",
  red: "#ff5d5d",
  blue: "#6bb6ff",
  wall: "#ffe3c2",
  wallLine: "#f7d2a8",
  floor: "#d99a6c",
  floorLine: "#c4855a",
  night: "#171a2b",
  nightLine: "#20253d",
  nightFloor: "#2f3a5f",
  grey: "#8c93b3",
  card: "#f4f6ff",
  dim: "#59607f",
};

const ICONS = {
  comer: ["....g....", "...gg....", ".rrr.rrr.", "rrrrrrrrr", "rwrrrrrrr", "rrrrrrrrr", "rrrrrrrrr", ".rrrrrrr.", "..rr.rr.."],
  jugar: ["....y....", "....y....", "...yyy...", "yyyyyyyyy", ".yyyyyyy.", "..yyyyy..", "..yyyyy..", ".yyy.yyy.", ".y.....y."],
  dormir: ["...bbbb..", "..bbb....", ".bbb.....", ".bbb.....", ".bbb.....", ".bbbb...b", "..bbbbbbb", "...bbbbb.", "........."],
  estado: [".........", "......ww.", "......ww.", "...ww.ww.", "...ww.ww.", "ww.ww.ww.", "ww.ww.ww.", "ww.ww.ww.", "........."],
  heart: [".r.r.", "rrrrr", "rrrrr", ".rrr.", "..r.."],
  bell: ["..y..", ".yyy.", ".yyy.", "yyyyy", "..y.."],
  bolt: ["..y", ".y.", "yyy", ".y.", "y.."],
};
const INK = { g: C.leaf, r: C.red, w: C.white, y: C.yellow, b: C.blue };

function map(ctx, rows, x, y, unit, hide = 0) {
  rows.forEach((row, dy) => {
    for (let dx = 0; dx < row.length - hide; dx++) {
      if (row[dx] === ".") continue;
      ctx.fillStyle = INK[row[dx]];
      ctx.fillRect(x + dx * unit, y + dy * unit, unit, unit);
    }
  });
}

function text(ctx, string, x, y, { size = 12, color = C.ink, align = "left", weight = 600, max = 0 } = {}) {
  ctx.font = `${weight} ${size}px "IBM Plex Mono", ui-monospace, Menlo, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillStyle = color;
  let shown = string;
  if (max) while (shown.length > 1 && ctx.measureText(shown).width > max) shown = `${shown.slice(0, -2)}…`;
  ctx.fillText(shown, x, y);
}

function box(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x + r, y, w - r * 2, h);
  ctx.fillRect(x, y + r, w, h - r * 2);
  for (let step = 1; step < r; step++) {
    const inset = r - Math.round(Math.sqrt(r * r - (r - step) * (r - step)));
    ctx.fillRect(x + inset, y + step, w - inset * 2, 1);
    ctx.fillRect(x + inset, y + h - step - 1, w - inset * 2, 1);
  }
}

// Una rejilla de píxeles gordos: rect y elipse en unidades de `unit` píxeles de pantalla.
function grid(ctx, ox, oy, unit) {
  const rect = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(ox + x * unit, oy + y * unit, w * unit, h * unit);
  };
  const ellipse = (cx, cy, rx, ry, color) => {
    for (let dy = -ry; dy <= ry; dy++) {
      const half = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry + 0.5)));
      rect(cx - half, cy + dy, half * 2 + 1, 1, color);
    }
  };
  return { rect, ellipse };
}

// Tinto: un gatito negro de orejas grandes, con el ojo izquierdo velado y el derecho verde, como en la foto.
// `x`, `ground` en píxeles de pantalla; `face` es cómo se encuentra.
export function drawPet(ctx, { x, ground, unit = 4, t, face, anim = null, alarmed = false, night = false }) {
  const asleep = face === "dormido";
  const down = face === "triste" || face === "hambriento" || face === "cansado";
  let lift = 0;
  let sway = 0;
  if (anim && anim.kind === "love") lift = Math.round(Math.abs(Math.sin(anim.t * 6)) * 3);
  else if (anim && anim.kind === "no") sway = Math.round(Math.sin(anim.t * 20));
  else if (face === "contento" && t % 3 < 0.5) lift = Math.round(Math.sin(((t % 3) / 0.5) * Math.PI) * 4);

  const floor = grid(ctx, x, ground, unit);
  const g = grid(ctx, x, ground - lift * unit, unit);
  // Negro sobre fondo oscuro no se ve: de noche el contorno es una luz clara.
  const line = night ? C.rim : C.ink;
  const cx = sway;
  const bob = asleep ? Math.floor(t * 0.6) % 2 : Math.floor(t * 1.6) % 2;
  const hy = -16 + bob + (asleep ? 2 : 0);

  floor.ellipse(0, 0, 11 - Math.min(3, lift), 1, night ? C.nightLine : C.floorLine);

  const wag = asleep ? 0 : Math.round(Math.sin(t * 2.2) * 1.4);
  const tail = [[6, -3], [8, -4], [9, -6], [9, -8], [9 + wag, -10]];
  for (const [tx, ty] of tail) g.rect(cx + tx - 1, ty - 1, 4, 4, line);
  for (const [tx, ty] of tail) g.rect(cx + tx, ty, 2, 2, C.fur);

  g.ellipse(cx, -6, 7, 6, line);
  g.ellipse(cx, -6, 6, 5, C.fur);
  g.ellipse(cx, -5, 2, 3, C.sheen);
  for (const side of [-1, 1]) {
    g.ellipse(cx + side * 3, -2, 2, 2, line);
    g.ellipse(cx + side * 3, -2, 1, 1, C.fur);
    g.rect(cx + side * 3, -1, 1, 1, C.sheen);
  }

  const lean = alarmed ? 0 : down || asleep ? 4 : 2;
  const height = alarmed ? 9 : down || asleep ? 6 : 8;
  const tri = (mid, base, half, rows, tilt, color) => {
    for (let r = 0; r < rows; r++) {
      const w = Math.max(1, Math.round(half * 2 * (1 - r / rows)) + 1);
      g.rect(Math.round(mid + tilt * (r / rows)) - Math.floor(w / 2), base - r, w, 1, color);
    }
  };
  for (const side of [-1, 1]) {
    const mid = cx + side * 7;
    tri(mid, hy - 5, 5, height + 1, side * lean, line);
    tri(mid, hy - 5, 4, height, side * lean, C.fur);
    if (!down && !asleep) tri(mid, hy - 6, 2, height - 3, side * lean, C.ear);
  }

  g.ellipse(cx, hy, 12, 9, line);
  g.ellipse(cx, hy, 11, 8, C.fur);
  g.ellipse(cx - 4, hy - 4, 4, 2, C.sheen);
  g.rect(cx + 3, hy - 6, 2, 1, C.sheen);

  const ey = hy - 1;
  const happy = (anim && anim.kind === "love") || (face === "contento" && lift > 0);
  const shut = asleep || t % 4 < 0.14;
  for (const side of [-1, 1]) {
    const ex = cx + side * 5;
    if (shut) g.rect(ex - 2, ey + 1, 5, 1, C.lid);
    else if (happy) {
      g.rect(ex - 2, ey + 1, 1, 1, C.lid);
      g.rect(ex - 1, ey, 3, 1, C.lid);
      g.rect(ex + 2, ey + 1, 1, 1, C.lid);
    } else {
      const tired = face === "cansado";
      const tall = alarmed ? 3 : tired ? 1 : 2;
      const cy = tired ? ey + 1 : ey;
      if (side < 0) {
        g.ellipse(ex, cy, 2, tall, C.eyeW);
        g.rect(ex - 1, cy, 1, 1, C.eyeCloud);
        g.rect(ex + 1, cy - 1, 1, 1, C.eyeCloud);
      } else {
        g.ellipse(ex, cy, 2, tall, C.eyeG);
        g.rect(ex, cy - tall, 1, tall * 2 + 1, C.ink);
        g.rect(ex - 1, cy - 1, 1, 1, C.white);
      }
    }
  }

  const ny = ey + 3;
  g.rect(cx - 1, ny, 3, 1, C.nose);
  g.rect(cx, ny + 1, 1, 1, C.nose);
  const my = ny + 3;
  const dots = (points) => points.forEach(([dx, dy]) => g.rect(cx + dx, my + dy, 1, 1, C.lid));
  const chewing = anim && anim.kind === "eat" && Math.floor(anim.t * 4) % 2 === 0;
  const yawning = face === "cansado" && t % 6 < 1.2;
  if (chewing || alarmed) g.rect(cx - 1, my - 1, 3, 3, C.mouth);
  else if (yawning) {
    g.rect(cx - 2, my - 1, 5, 4, C.mouth);
    g.rect(cx - 1, my + 2, 3, 1, C.ear);
  } else if (asleep) g.rect(cx, my, 1, 1, C.lid);
  else if (anim && anim.kind === "eat") g.rect(cx - 1, my, 3, 1, C.lid);
  else if (face === "triste" || face === "hambriento" || (anim && anim.kind === "no")) dots([[0, -1], [-2, 1], [-1, 0], [1, 0], [2, 1]]);
  else if (face === "cansado") dots([[0, -1], [-1, 0], [0, 0], [1, 0]]);
  else dots([[0, -1], [-2, 0], [-1, 1], [1, 1], [2, 0]]);
  const whisker = night ? "#c9c6dc" : "#3f3b52";
  for (const side of [-1, 1]) {
    const from = side < 0 ? cx - 14 : cx + 10;
    g.rect(from, my - 1, 4, 1, whisker);
    g.rect(from + (side < 0 ? 0 : 1), my + 1, 3, 1, whisker);
  }

  const sx = x + cx * unit;
  const sy = ground - lift * unit + hy * unit;
  if (anim && anim.kind === "eat") map(ctx, ICONS.comer, sx + 15 * unit, ground - 12 * unit, unit - 1, Math.min(8, Math.floor(anim.t / 0.55) * 2));
  if (anim && anim.kind === "love")
    [0, 1, 2].forEach((index) => {
      const rise = ((anim.t * 26 + index * 14) % 44) | 0;
      map(ctx, ICONS.heart, sx + (index - 1) * 11 * unit - 5, sy - 18 * unit - rise, 2);
    });
  if (asleep)
    [0, 1, 2].forEach((index) => {
      const rise = ((t * 9 + index * 16) % 48) | 0;
      text(ctx, "z", sx + 12 * unit + index * 7, sy - 12 * unit - rise, { size: 11 + index * 3, color: C.blue, weight: 700 });
    });
  if (face === "cansado" && !yawning) g.rect(cx + 12, hy - 6 + (Math.floor(t * 2) % 3), 1, 2, C.blue);
  if (face === "hambriento" && !anim) {
    box(ctx, sx + 12 * unit, sy - 21 * unit, 30, 30, 8, C.card);
    map(ctx, ICONS.comer, sx + 12 * unit + 6, sy - 21 * unit + 6, 2);
  }
  if (alarmed) {
    g.rect(cx - 17, hy - 12, 2, 6, C.yellow);
    g.rect(cx - 17, hy - 5, 2, 2, C.yellow);
  }
}

function room(ctx, night) {
  ctx.fillStyle = night ? C.night : C.wall;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = night ? C.nightLine : C.wallLine;
  for (let x = 12; x < W; x += 36) ctx.fillRect(x, 0, 8, 190);
  if (night) {
    ctx.fillStyle = C.yellow;
    [[40, 66], [84, 96], [200, 74], [168, 120], [58, 140], [214, 150]].forEach(([x, y]) => ctx.fillRect(x, y, 2, 2));
    map(ctx, ICONS.dormir, 172, 54, 4);
  }
  ctx.fillStyle = night ? C.nightFloor : C.floor;
  ctx.fillRect(0, 190, W, H - 190);
  ctx.fillStyle = night ? C.nightLine : C.floorLine;
  ctx.fillRect(0, 190, W, 3);
}

function hud(ctx, pet, night) {
  const ink = night ? C.card : C.ink;
  const soft = night ? C.grey : C.dim;
  const now = new Date(pet.now);
  text(ctx, `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`, 26, 11, { size: 15, color: ink, weight: 700 });
  if (pet.phone) {
    const low = pet.phone.level <= LOW.phone && !pet.phone.charging;
    ctx.fillStyle = ink;
    ctx.fillRect(190, 12, 22, 12);
    ctx.fillRect(212, 15, 2, 6);
    ctx.fillStyle = night ? C.night : C.wall;
    ctx.fillRect(192, 14, 18, 8);
    ctx.fillStyle = low ? C.red : pet.phone.charging ? C.leaf : ink;
    ctx.fillRect(193, 15, Math.max(1, Math.round((16 * pet.phone.level) / 100)), 6);
    text(ctx, `${pet.phone.level}%`, 185, 12, { size: 11, color: low ? C.red : ink, align: "right" });
    if (pet.phone.charging) map(ctx, ICONS.bolt, 141, 13, 2);
  } else text(ctx, "móvil —", 214, 12, { size: 11, color: soft, align: "right" });

  const left = energy(pet);
  text(ctx, "CLAUDE", 26, 33, { size: 9, color: soft, weight: 700 });
  for (let index = 0; index < 20; index++) {
    const on = pet.claude && index < Math.ceil(left / 5);
    ctx.fillStyle = !on ? (night ? C.nightLine : C.wallLine) : left <= LOW.energy ? C.red : left <= 50 ? "#e8a52c" : C.stem;
    ctx.fillRect(70 + index * 6, 34, 5, 8);
  }
  text(ctx, pet.claude ? `${left}%` : "—", 214, 32, { size: 10, color: left <= LOW.energy ? C.red : ink, align: "right", weight: 700 });
}

function menu(ctx, selected, night, pet) {
  MENU.forEach((name, index) => {
    const x = SLOTS[index] - BAR.size / 2;
    const on = index === selected;
    box(ctx, x, BAR.y, BAR.size, BAR.size, 9, on ? C.card : night ? C.night : "#b9794c");
    if (on) {
      box(ctx, x + 2, BAR.y + 2, BAR.size - 4, BAR.size - 4, 7, C.ink);
    }
    map(ctx, ICONS[name === "dormir" && sleeping(pet) ? "dormir" : name], x + 6.5, BAR.y + 6.5, 3);
  });
}

function card(ctx, alert) {
  box(ctx, 14, 46, 212, 46, 10, C.ink);
  box(ctx, 16, 48, 208, 42, 8, C.card);
  if (alert.kind === "cal") map(ctx, ICONS.bell, 24, 56, 4);
  else if (alert.kind === "phone") {
    ctx.fillStyle = C.red;
    ctx.fillRect(24, 60, 20, 12);
    ctx.fillRect(44, 63, 2, 6);
  } else map(ctx, ICONS.bolt, 28, 55, 5);
  text(ctx, alert.top, 54, 53, { size: 9, color: C.dim, weight: 700 });
  text(ctx, alert.text, 54, 66, { size: 12, color: C.ink, weight: 700, max: 162 });
}

function home(ctx, view) {
  const { pet, t } = view;
  const night = sleeping(pet);
  room(ctx, night);
  hud(ctx, pet, night);
  drawPet(ctx, { x: 120, ground: 196, t, face: feeling(pet), anim: pet.anim, alarmed: Boolean(pet.alert) && !night, night });
  if (pet.alert) card(ctx, pet.alert);
  text(ctx, whisper(pet), 120, 209, { size: 11, color: night ? C.card : C.ink, align: "center", max: 200 });
  menu(ctx, view.menu, night, pet);
}

function meter(ctx, label, value, y, note, color) {
  text(ctx, label, 30, y, { size: 11, color: C.dim, weight: 700 });
  text(ctx, note, 210, y, { size: 11, color: C.ink, align: "right" });
  ctx.fillStyle = "#dfe3f3";
  ctx.fillRect(30, y + 16, 180, 8);
  ctx.fillStyle = color;
  ctx.fillRect(30, y + 16, Math.round(180 * (value / 100)), 8);
}

function info(ctx, { pet }) {
  ctx.fillStyle = C.card;
  ctx.fillRect(0, 0, W, H);
  text(ctx, NAME.toUpperCase(), 30, 22, { size: 18, weight: 700 });
  text(ctx, feeling(pet), 210, 27, { size: 11, color: C.dim, align: "right" });
  const tone = (value, low) => (value <= low ? C.red : C.stem);
  meter(ctx, "HAMBRE", pet.fullness, 56, `${Math.round(pet.fullness)} %`, tone(pet.fullness, LOW.fullness));
  meter(ctx, "ÁNIMO", pet.mood, 92, `${Math.round(pet.mood)} %`, tone(pet.mood, LOW.mood));
  meter(ctx, "ENERGÍA · CLAUDE", energy(pet), 128, pet.claude ? `${energy(pet)} % libre` : "sin datos", tone(energy(pet), LOW.energy));
  meter(ctx, "MÓVIL", pet.phone ? pet.phone.level : 0, 164, pet.phone ? `${pet.phone.level} %${pet.phone.charging ? " cargando" : ""}` : "sin datos", pet.phone ? tone(pet.phone.level, LOW.phone) : C.grey);
  text(ctx, "EDAD", 30, 204, { size: 11, color: C.dim, weight: 700 });
  text(ctx, age(pet), 210, 204, { size: 11, align: "right" });
  const next = pet.events.find((event) => !event.rung);
  text(ctx, "PRÓXIMO", 30, 224, { size: 11, color: C.dim, weight: 700 });
  text(ctx, next ? `${next.title} · ${Math.max(1, Math.round((next.at - pet.now) / 60000))} min` : "nada", 210, 224, { size: 11, align: "right", max: 125 });
  text(ctx, "toca o pulsa BOOT para volver", 120, 252, { size: 9, color: C.grey, align: "center" });
}

function game(ctx, { game: play, t }) {
  ctx.fillStyle = C.night;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.nightLine;
  LANES.forEach((x) => ctx.fillRect(x - 26, 44, 52, 200));
  ctx.fillStyle = C.nightFloor;
  ctx.fillRect(0, 244, W, 36);
  text(ctx, `★ ${play.caught}`, 28, 14, { size: 15, color: C.yellow, weight: 700 });
  text(ctx, `${Math.max(0, Math.ceil(GAME.seconds - play.t))} s`, 212, 14, { size: 15, color: C.card, align: "right", weight: 700 });
  for (const star of play.stars) map(ctx, ICONS.jugar, LANES[star.lane] - 13, 46 + star.y * 150, 3);
  drawPet(ctx, { x: LANES[play.lane], ground: 244, unit: 2, t, face: "contento", night: true });
  text(ctx, "toca un carril · PWR mueve", 120, 258, { size: 9, color: C.grey, align: "center" });
}

function result(ctx, { game: play, t }) {
  ctx.fillStyle = C.night;
  ctx.fillRect(0, 0, W, H);
  drawPet(ctx, { x: 120, ground: 190, t, face: play.caught ? "contento" : "triste", anim: play.caught ? { kind: "love", t } : null, night: true });
  text(ctx, play.caught === 1 ? "¡1 estrella!" : `¡${play.caught} estrellas!`, 120, 208, { size: 17, color: C.yellow, align: "center", weight: 700 });
  text(ctx, play.caught ? "Tinto está más contento" : "Otra vez será", 120, 234, { size: 11, color: C.card, align: "center" });
}

export function drawScreen(ctx, view) {
  ctx.imageSmoothingEnabled = false;
  if (view.off) {
    ctx.fillStyle = "#050507";
    ctx.fillRect(0, 0, W, H);
    return;
  }
  ({ home, info, game, result })[view.screen](ctx, view);
}
