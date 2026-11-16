// El dibujo de los ocho juegos y de un gato de perfil (Tinto corriendo, agazapado, saltando…).
import { BOX_SLOTS, FISH, HOLES, LASER, LANES, MAZE, PADS, POND, RUN, boxX, gameById, timeLeft } from "./games.js";
import { drawTinto } from "./draw.js";
import { drawScene } from "./room.js";
import { FUR, H, NIGHT, TAU, W, blob, clamp01, gameIcon, heart, lin, pal, rad, rr, soft, star, text } from "./gfx.js";

const STARFIELD = [[22, 52, 1.2], [58, 84, 0.9], [92, 62, 1.1], [150, 96, 0.9], [34, 124, 1], [214, 134, 1.1], [180, 70, 0.8], [124, 112, 0.9], [206, 174, 0.9], [76, 160, 0.8]];

function sky(ctx, t, top = "#1b2150", bottom = "#10142c") {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, top], [0.7, "#161b3a"], [1, bottom]]);
  ctx.fillRect(0, 0, W, H);
  STARFIELD.forEach(([x, y, r], i) => {
    ctx.fillStyle = `rgba(255,236,170,${0.35 + 0.4 * Math.sin(t * 1.6 + i * 1.7)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  });
}

// ───────── gato de perfil ─────────
const leg = (ctx, hipX, hipY, ang, len, thick, color) => {
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(ang);
  rr(ctx, -thick / 2, 0, thick, len, thick / 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, len, thick * 0.78, 2.6, 0, 0, TAU);
  ctx.fillStyle = FUR[0];
  ctx.fill();
  ctx.restore();
};

function poseOf(pose, phase) {
  const swing = Math.sin(phase * 2);
  const p = { bodyY: -19, angle: 0, headX: 25, headY: -33, tilt: 0, front: [0, 0], hind: [0, 0], len: 14, tail: [-0.5, 0.15], face: null, wide: false };
  if (pose === "run") Object.assign(p, { bodyY: -19 + Math.abs(swing) * -2, front: [swing * 0.9, -swing * 0.9], hind: [-swing * 0.9, swing * 0.9], tail: [-0.2 + swing * 0.1, 0.4], tilt: 0.05 * swing });
  else if (pose === "jump") Object.assign(p, { bodyY: -22, angle: -0.12, front: [0.9, 0.5], hind: [-0.7, -0.3], len: 11, tail: [0.2, 0.7], headY: -37, tilt: -0.12, face: "contento" });
  else if (pose === "crouch") Object.assign(p, { bodyY: -12, angle: 0.1, headX: 28, headY: -21, front: [0.5, 0.7], hind: [-0.6, -0.9], len: 9, tail: [-0.1 + Math.sin(phase * 5) * 0.25, 0.1], wide: true, tilt: 0.1 });
  else if (pose === "pounce") Object.assign(p, { bodyY: -22, angle: -0.28, headX: 28, headY: -38, front: [1.35, 1.1], hind: [-1.1, -1.35], len: 15, tail: [-0.9, -0.2], wide: true, tilt: -0.2 });
  else if (pose === "sit") Object.assign(p, { bodyY: -17, angle: -0.5, headX: 18, headY: -44, front: [0, 0.1], hind: [-0.1, 0], len: 14, tail: [-0.6, 0.9], face: null });
  else if (pose === "proud") Object.assign(p, { bodyY: -17, angle: -0.5, headX: 18, headY: -46, front: [0, 0.1], hind: [-0.1, 0], len: 14, tail: [-0.3, 1.1], face: "contento", tilt: -0.1 });
  else if (pose === "groom") Object.assign(p, { bodyY: -16, angle: -0.35, headX: 22, headY: -26, front: [0.3, 0.8], hind: [-0.1, 0], len: 13, tail: [-0.5, 0.5], tilt: 0.45, face: "tranquilo" });
  else if (pose === "reach") Object.assign(p, { bodyY: -26, angle: -0.95, headX: 12, headY: -56, front: [1.9, 1.7], hind: [-0.05, 0.05], len: 12, tail: [-0.4, 0.9], wide: true, tilt: -0.2 });
  else if (pose === "hurt") Object.assign(p, { bodyY: -16, front: [0.2, 0.2], hind: [-0.2, -0.2], len: 12, face: "triste", tail: [-0.6, -0.2] });
  return p;
}

export function drawCatSide(ctx, { x, y, dir = 1, pose = "run", t = 0, night = false, s = 1, lift = 0, outfit = null, phase = t * 9 }) {
  const P = pal(night);
  const p = poseOf(pose, phase);
  blob(ctx, x, y + 2, 26 * s, 4 * s, P.shadow);
  ctx.save();
  ctx.translate(x, y - lift);
  ctx.scale(dir * s, s);
  const fur = lin(ctx, 0, -32, 0, 0, [[0, FUR[0]], [0.6, FUR[1]], [1, FUR[2]]]);
  // cola
  ctx.beginPath();
  ctx.moveTo(-26, p.bodyY - 2);
  ctx.bezierCurveTo(-36, p.bodyY - 8 + p.tail[0] * 30, -40, p.bodyY - 14 - p.tail[1] * 22, -34 + p.tail[0] * 8, p.bodyY - 22 - p.tail[1] * 18);
  ctx.lineWidth = 6.5;
  ctx.lineCap = "round";
  ctx.strokeStyle = FUR[1];
  ctx.stroke();
  // patas traseras, cuerpo, patas delanteras
  leg(ctx, -15, p.bodyY + 5, p.hind[1], p.len, 6.5, FUR[2]);
  leg(ctx, -9, p.bodyY + 6, p.hind[0], p.len, 6.5, FUR[1]);
  ctx.save();
  ctx.translate(0, p.bodyY);
  ctx.rotate(p.angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, 23, 11.5, 0, 0, TAU);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-13, 1, 12, 11, 0, 0, TAU);
  ctx.fillStyle = FUR[1];
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 23, 11.5, 0, 0, TAU);
  ctx.clip();
  ctx.fillStyle = lin(ctx, 0, -12, 0, 6, [[0, `rgba(${P.rim},${P.rimA * 0.7})`], [0.45, `rgba(${P.rim},${P.rimA * 0.08})`], [1, "rgba(0,0,0,0)"]]);
  ctx.fillRect(-26, -13, 52, 26);
  ctx.restore();
  ctx.restore();
  leg(ctx, 12, p.bodyY + 6, p.front[1], p.len, 6, FUR[1]);
  leg(ctx, 18, p.bodyY + 5, p.front[0], p.len, 6, FUR[0]);
  // cabeza: la misma de Tinto
  ctx.save();
  ctx.translate(p.headX, p.headY);
  ctx.rotate(p.tilt);
  drawTinto(ctx, { ox: 0, oy: 0, s: 0.36, t, face: p.face || "tranquilo", night, tail: false, headOnly: true, outfit, alarmed: p.wide });
  ctx.restore();
  ctx.restore();
}

// ───────── pieza común: barra superior ─────────
function hud(ctx, g, def, P, { lives = null, score = 0, label = null, light = false } = {}) {
  const ink = light ? "#2b2438" : "#fff";
  ctx.beginPath();
  ctx.arc(20, 22, 12, 0, TAU);
  ctx.fillStyle = light ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.16)";
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(15.5, 17.5);
  ctx.lineTo(24.5, 26.5);
  ctx.moveTo(24.5, 17.5);
  ctx.lineTo(15.5, 26.5);
  ctx.stroke();
  star(ctx, 46, 22, 8, 0, false);
  text(ctx, String(score), 58, 23, { size: 19, color: light ? "#d98a00" : "#ffd75e", weight: 800 });
  if (lives !== null)
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = i < lives ? 1 : 0.25;
      heart(ctx, 118 + i * 17, 22, 1.25);
      ctx.globalAlpha = 1;
    }
  const left = timeLeft(g);
  if (left !== null) {
    const total = def.seconds;
    ctx.lineWidth = 4;
    ctx.strokeStyle = light ? "rgba(40,30,70,0.14)" : "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(212, 25, 13, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = light ? "#5b7fe0" : "#8fb4ff";
    ctx.beginPath();
    ctx.arc(212, 25, 13, -Math.PI / 2, -Math.PI / 2 + TAU * clamp01(left / total));
    ctx.stroke();
    text(ctx, String(Math.ceil(left)), 212, 25.5, { size: 11, color: light ? "#2b2438" : "#eef0ff", align: "center", weight: 800 });
  } else if (label) text(ctx, label, 224, 24, { size: 13, color: light ? "#2b2438" : "#eef0ff", align: "right", weight: 800 });
}

const hint = (ctx, string, color = "#a6aacd") => text(ctx, string, 120, 268, { size: 10, color, align: "center", weight: 700 });

// ───────── Atrapa estrellas ─────────
function drawEstrellas(ctx, g, view) {
  sky(ctx, view.t);
  LANES.forEach((x) => {
    rr(ctx, x - 26, 56, 52, 176, 16);
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    ctx.fill();
  });
  for (const item of g.stars) {
    star(ctx, LANES[item.lane], 58 + item.y * 156, item.gold ? 13 : 11, view.t * 2 + item.lane, true);
    if (item.gold) {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(LANES[item.lane] - 3, 55 + item.y * 156, 2, 0, TAU);
      ctx.fill();
    }
  }
  drawTinto(ctx, { ox: LANES[g.lane], oy: 236, s: 0.52, t: view.t, face: "contento", night: true, tail: false, outfit: view.outfit, basket: view.basket });
  hint(ctx, "toca un carril · PWR y BOOT mueven");
}

// ───────── Caza del láser ─────────
function drawLaser(ctx, g, view) {
  const P = pal(false);
  drawScene(ctx, P, false, view.t, {});
  const { cat, dot } = g;
  const stalk = cat.mode === "stalk";
  const dy = Math.abs(cat.x - dot.x);
  let pose = "run";
  if (cat.mode === "idle") pose = "sit";
  else if (cat.mode === "chase") pose = dot.y < 150 && dy < 46 ? "reach" : dy < 5 ? "sit" : "run";
  else if (stalk) pose = "crouch";
  else if (cat.mode === "pounce") pose = "pounce";
  else if (cat.mode === "proud") pose = "proud";
  else if (cat.mode === "groom") pose = "groom";
  const k = cat.mode === "pounce" ? clamp01(cat.t / LASER.pounce) : 0;
  const lift = cat.mode === "pounce" ? Math.sin(k * Math.PI) * 34 : 0;
  const chasing = cat.mode === "chase" && dy > 6;
  drawCatSide(ctx, { x: cat.x, y: LASER.floor, dir: cat.dir || 1, pose, t: view.t, lift, outfit: view.outfit, phase: chasing ? view.t * 11 : 0 });
  // el punto del láser
  const pulse = 1 + 0.15 * Math.sin(view.t * 14);
  soft(ctx, 14, 0, "rgba(255,40,40,0.95)", () => {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 6.5 * pulse, 0, TAU);
    ctx.fillStyle = "#ff3d3d";
    ctx.fill();
  });
  ctx.beginPath();
  ctx.arc(dot.x, dot.y, 2.6, 0, TAU);
  ctx.fillStyle = "#fff";
  ctx.fill();
  if (stalk) {
    const left = clamp01(1 - cat.t / LASER.stalk);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 18, -Math.PI / 2, -Math.PI / 2 + TAU * left);
    ctx.stroke();
    soft(ctx, 6, 2, "rgba(0,0,0,0.3)", () => {
      rr(ctx, 70, 92, 100, 26, 13);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fill();
    });
    text(ctx, "¡QUIETO!", 120, 105.5, { size: 14, color: "#e5484d", align: "center", weight: 800, spacing: 1 });
  }
  for (const pop of g.pops || []) {
    ctx.globalAlpha = 1 - pop.t / 0.6;
    for (let i = 0; i < 6; i++) star(ctx, pop.x + Math.cos((i / 6) * TAU) * (8 + pop.t * 60), pop.y + Math.sin((i / 6) * TAU) * (8 + pop.t * 60), 5, pop.t * 6, false);
    ctx.globalAlpha = 1;
  }
  hud(ctx, g, gameById("laser"), P, { score: g.catches, light: true });
  text(ctx, "arrastra el láser · quieto cuando se agazape", 120, 268, { size: 10, color: "#fff", align: "center", weight: 700 });
}

// ───────── Carrera de estanterías ─────────
const OBSTACLE_ART = {
  jarron: (ctx, o) => {
    ctx.beginPath();
    ctx.moveTo(o.x + 4, 0);
    ctx.bezierCurveTo(o.x - 2, -8, o.x - 1, -18, o.x + 5, -o.h);
    ctx.lineTo(o.x + o.w - 5, -o.h);
    ctx.bezierCurveTo(o.x + o.w + 1, -18, o.x + o.w + 2, -8, o.x + o.w - 4, 0);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, o.x, 0, o.x + o.w, 0, [[0, "#6fb6e8"], [1, "#3f86c4"]]);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(o.x + 3, -o.h + 6, o.w - 6, 3);
  },
  libros: (ctx, o) => {
    [["#e5484d", 0], ["#4f7fe0", 5], ["#58c96b", 9.5]].forEach(([c, y], i) => {
      rr(ctx, o.x + i * 1.5, -(y + 5), o.w - i * 3, 5, 1.5);
      ctx.fillStyle = c;
      ctx.fill();
    });
  },
  caja: (ctx, o) => {
    rr(ctx, o.x, -o.h, o.w, o.h, 2);
    ctx.fillStyle = lin(ctx, 0, -o.h, 0, 0, [[0, "#e0b070"], [1, "#b07a3e"]]);
    ctx.fill();
    ctx.fillStyle = "rgba(255,240,210,0.7)";
    ctx.fillRect(o.x + o.w / 2 - 2, -o.h, 4, o.h);
  },
  taza: (ctx, o) => {
    rr(ctx, o.x, -o.h, o.w - 3, o.h, 3);
    ctx.fillStyle = lin(ctx, 0, -o.h, 0, 0, [[0, "#ffffff"], [1, "#d8d2e0"]]);
    ctx.fill();
    ctx.strokeStyle = "#d8d2e0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(o.x + o.w - 3, -o.h / 2, 3.4, -1.3, 1.3);
    ctx.stroke();
    ctx.fillStyle = "#6e4a26";
    ctx.fillRect(o.x + 1.5, -o.h + 2, o.w - 6, 2.5);
  },
};

function drawCarrera(ctx, g, view) {
  const P = pal(false);
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#f3ead9"], [1, "#e3d3b8"]]);
  ctx.fillRect(0, 0, W, H);
  // papel pintado que se desplaza
  ctx.fillStyle = "rgba(190,150,110,0.14)";
  for (let x = -((g.dist * 0.3) % 40); x < W; x += 40) ctx.fillRect(x, 0, 14, 204);
  // estantes del fondo con libros
  for (const y of [92, 150]) {
    rr(ctx, 0, y, W, 6, 2);
    ctx.fillStyle = "#b98a56";
    ctx.fill();
    for (let x = -((g.dist * 0.5) % 36) - 36; x < W; x += 36)
      [["#d9695f", 15], ["#6fa0d8", 19], ["#7bc47f", 13]].forEach(([c, h], i) => {
        rr(ctx, x + i * 7, y - h, 6, h, 1.5);
        ctx.fillStyle = c;
        ctx.fill();
      });
  }
  // la estantería por la que corre
  rr(ctx, -4, 204, W + 8, 12, 3);
  ctx.fillStyle = lin(ctx, 0, 204, 0, 216, [[0, "#d29a58"], [1, "#a8723a"]]);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(0, 204, W, 1.5);
  ctx.fillStyle = "#8f6330";
  for (let x = -((g.dist * 1) % 60); x < W; x += 60) ctx.fillRect(x + 20, 216, 6, 24);
  ctx.fillStyle = "rgba(60,34,14,0.12)";
  ctx.fillRect(0, 216, W, 64);
  ctx.save();
  ctx.translate(0, RUN.ground);
  for (const o of g.obs) OBSTACLE_ART[o.kind](ctx, o);
  ctx.restore();
  for (const p of g.pick) star(ctx, p.x, RUN.ground - p.y, 8, view.t * 2 + p.x / 20, true);
  const air = g.y > 0.5;
  ctx.globalAlpha = g.inv > 0 && Math.floor(g.inv * 12) % 2 ? 0.35 : 1;
  drawCatSide(ctx, { x: RUN.px, y: RUN.ground, dir: 1, pose: air ? "jump" : "run", t: view.t, lift: g.y, outfit: view.outfit, phase: g.dist / 7 });
  ctx.globalAlpha = 1;
  hud(ctx, g, gameById("carrera"), P, { lives: g.lives, score: Math.floor(g.dist / 25) + g.coins * 2, light: true });
  text(ctx, "toca para saltar (¡dos veces en el aire!)", 120, 268, { size: 10, color: "#8f6330", align: "center", weight: 700 });
}

// ───────── Laberinto de lana ─────────
function drawLaberinto(ctx, g, view) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#2a2140"], [1, "#1a1530"]]);
  ctx.fillRect(0, 0, W, H);
  rr(ctx, MAZE.ox - 3, MAZE.oy - 3, MAZE.cols * MAZE.cell + 6, MAZE.rows * MAZE.cell + 6, 8);
  ctx.fillStyle = lin(ctx, 0, MAZE.oy, 0, MAZE.oy + MAZE.rows * MAZE.cell, [[0, "#f1dfc0"], [1, "#e2c99c"]]);
  ctx.fill();
  ctx.fillStyle = "#8a5d34";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 3 * 3;
  ctx.shadowOffsetY = 2 * 3;
  for (const r of g.rects) {
    rr(ctx, r.x, r.y, r.w, r.h, 2.2);
    ctx.fill();
  }
  ctx.shadowColor = "transparent";
  ctx.fillStyle = lin(ctx, 0, MAZE.oy, 0, MAZE.oy + 190, [[0, "#b07a45"], [1, "#8a5d34"]]);
  for (const r of g.rects) {
    rr(ctx, r.x, r.y, r.w, r.h - 1, 2.2);
    ctx.fill();
  }
  const goal = { x: MAZE.ox + (g.goal[0] + 0.5) * MAZE.cell, y: MAZE.oy + (g.goal[1] + 0.5) * MAZE.cell };
  gameIcon(ctx, "topos", goal.x, goal.y, 0.95);
  for (const item of g.items) if (!item.taken) star(ctx, item.x, item.y, 6, view.t * 2 + item.c, true);
  const b = g.ball;
  blob(ctx, b.x + 1.5, b.y + 4.5, 8, 3, "rgba(60,30,10,0.45)");
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate((b.x + b.y) / 9);
  ctx.beginPath();
  ctx.arc(0, 0, MAZE.radius, 0, TAU);
  ctx.fillStyle = rad(ctx, -2, -2, 1, 0, 0, 8, [[0, "#ff9cc4"], [1, "#e0589a"]]);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1;
  for (const r of [2.4, 4.4, 6]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0.4, 2.6);
    ctx.stroke();
  }
  ctx.restore();
  hud(ctx, g, gameById("laberinto"), NIGHT, { score: g.level * 5 + g.got });
  text(ctx, `laberinto ${g.level + 1}`, 120, 24, { size: 11, color: "#c9c3dd", align: "center", weight: 800 });
  hint(ctx, "inclina la placa para mover el ovillo");
}

// ───────── ¿Dónde está el ovillo? ─────────
function box3d(ctx, x, y, lift, tone) {
  ctx.save();
  ctx.translate(x, y - lift);
  soft(ctx, 6, 3, "rgba(60,34,14,0.35)", () => {
    rr(ctx, -27, -20, 54, 44, 3);
    ctx.fillStyle = "#b07a3e";
    ctx.fill();
  });
  rr(ctx, -27, -20, 54, 44, 3);
  ctx.fillStyle = lin(ctx, 0, -20, 0, 24, [[0, "#e6b878"], [1, "#b8803f"]]);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-27, -20);
  ctx.lineTo(-20, -30);
  ctx.lineTo(20, -30);
  ctx.lineTo(27, -20);
  ctx.closePath();
  ctx.fillStyle = tone || "#f0c88a";
  ctx.fill();
  ctx.fillStyle = "rgba(255,244,214,0.75)";
  ctx.fillRect(-4, -30, 8, 54);
  ctx.strokeStyle = "rgba(120,80,30,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-27, 6);
  ctx.lineTo(27, 6);
  ctx.stroke();
  ctx.restore();
}

function drawCajas(ctx, g, view) {
  const P = pal(false);
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#f6e9d4"], [1, "#e6cfa8"]]);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = lin(ctx, 0, 176, 0, H, [[0, "#c98f63"], [1, "#a8683c"]]);
  ctx.fillRect(0, 176, W, H - 176);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(0, 176, W, 2);
  const ballBox = g.boxes.find((b) => b.id === g.ball);
  const reveal = g.phase === "reveal";
  for (const b of [...g.boxes].sort((a, c) => a.slot - c.slot)) {
    const x = boxX(g, b);
    let lift = 0;
    let y = 150;
    if (g.phase === "shuffle" && g.cur && g.cur.pair.includes(b.slot)) y += (g.cur.pair[0] === b.slot ? -1 : 1) * Math.sin(Math.PI * clamp01(g.cur.t / g.swapDur)) * 16;
    if (b.id === g.ball && (g.phase === "show" || reveal)) lift = 30;
    if (reveal && g.choice === b.id && b.id !== g.ball) lift = 22;
    if (g.phase === "pick") lift = Math.max(0, Math.sin(view.t * 4 + b.slot) * 2);
    if (b.id === g.ball && (g.phase === "show" || reveal)) {
      blob(ctx, x, y + 14, 16, 5, "rgba(60,34,14,0.3)");
      ctx.beginPath();
      ctx.arc(x, y + 6, 11, 0, TAU);
      ctx.fillStyle = rad(ctx, x - 3, y + 3, 1, x, y + 6, 12, [[0, "#ff9cc4"], [1, "#e0589a"]]);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1;
      for (const r of [3.5, 6.5, 9]) {
        ctx.beginPath();
        ctx.arc(x, y + 6, r, 0.5, 2.6);
        ctx.stroke();
      }
    }
    box3d(ctx, x, y, lift, reveal && g.choice === b.id ? (b.id === g.ball ? "#bfeec5" : "#f3b4b4") : null);
  }
  if (reveal) {
    const good = g.choice === g.ball;
    text(ctx, good ? "¡Bien!" : "¡Era ésa!", 120, 64, { size: 20, color: good ? "#2f9e5a" : "#d1434f", align: "center", weight: 800 });
  } else if (g.phase === "pick") text(ctx, "¿Dónde está el ovillo?", 120, 64, { size: 14, color: "#7a5a34", align: "center", weight: 800 });
  else if (g.phase === "show") text(ctx, "Míralo bien", 120, 64, { size: 14, color: "#7a5a34", align: "center", weight: 800 });
  else text(ctx, "Sigue la caja…", 120, 64, { size: 14, color: "#7a5a34", align: "center", weight: 800 });
  drawTinto(ctx, { ox: 120, oy: 228, s: 0.6, t: view.t, face: reveal ? (g.choice === g.ball ? "contento" : "triste") : "tranquilo", night: false, tail: false, headOnly: true, outfit: view.outfit });
  hud(ctx, g, gameById("cajas"), P, { lives: g.lives, score: g.score * 3, label: `ronda ${Math.min(g.round, 8)}`, light: true });
}

// ───────── Cazaratones ─────────
function mouse(ctx, kind, t) {
  const gold = kind === "oro";
  const body = gold ? ["#ffe27a", "#f0a030"] : ["#b4bac8", "#8a91a3"];
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 11, -17, 7.2, 0, TAU);
    ctx.fillStyle = body[1];
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 11, -17, 4.4, 0, TAU);
    ctx.fillStyle = "#ffb3c4";
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, -5, 15, 16, 0, 0, TAU);
  ctx.fillStyle = lin(ctx, 0, -20, 0, 10, [[0, body[0]], [1, body[1]]]);
  ctx.fill();
  ctx.fillStyle = "#2b2438";
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 5.5, -8, 1.9, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, -1, 2.4, 0, TAU);
  ctx.fillStyle = "#ff8aa8";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 0.9;
  for (const s of [-1, 1])
    for (const dy of [-2, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 4, dy);
      ctx.lineTo(s * 15, dy + dy * 1.4);
      ctx.stroke();
    }
  if (gold) star(ctx, 0, -26, 5, t * 3, true);
}

function bird(ctx, t) {
  ctx.beginPath();
  ctx.ellipse(0, -6, 14, 15, 0, 0, TAU);
  ctx.fillStyle = lin(ctx, 0, -20, 0, 10, [[0, "#7fc4ff"], [1, "#4a8fe0"]]);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -1, 8, 9, 0, 0, TAU);
  ctx.fillStyle = "#e8f5ff";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-2, -8);
  ctx.lineTo(5, -5);
  ctx.lineTo(-2, -3);
  ctx.closePath();
  ctx.fillStyle = "#ffb03a";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-6, -11, 2.2, 0, TAU);
  ctx.arc(6, -11, 2.2, 0, TAU);
  ctx.fillStyle = "#2b2438";
  ctx.fill();
  const flap = Math.sin(t * 16) * 4;
  ctx.fillStyle = "#4a8fe0";
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 15, -4 + flap * s, 5, 9, s * 0.6, 0, TAU);
    ctx.fill();
  }
}

function paw(ctx, x, y, k) {
  ctx.save();
  ctx.translate(x, y - 40 + k * 40);
  ctx.globalAlpha = 1 - k * 0.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 11, 0, 0, TAU);
  ctx.fillStyle = FUR[1];
  ctx.fill();
  for (const dx of [-9, -3, 3, 9]) {
    ctx.beginPath();
    ctx.ellipse(dx, 9 + 2, 3, 4.6, 0, 0, TAU);
    ctx.fillStyle = FUR[0];
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(dx - 1.4, 14);
    ctx.lineTo(dx, 18);
    ctx.lineTo(dx + 1.4, 14);
    ctx.fillStyle = "#f1ecf7";
    ctx.fill();
  }
  ctx.restore();
}

function drawTopos(ctx, g, view) {
  const P = pal(false);
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#e4eef8"], [1, "#cfdcec"]]);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(120,150,190,0.14)";
  for (let y = 64; y < H; y += 26) ctx.fillRect(0, y, W, 2);
  for (const [hx, hy] of HOLES) {
    ctx.beginPath();
    ctx.ellipse(hx, hy + 8, 29, 13, 0, 0, TAU);
    ctx.fillStyle = "#8a6b4d";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(hx, hy + 8, 25, 10, 0, 0, TAU);
    ctx.fillStyle = "#1c1424";
    ctx.fill();
  }
  const ents = [...g.ents].sort((a, b) => HOLES[a.hole][1] - HOLES[b.hole][1]);
  for (const e of ents) {
    const [hx, hy] = HOLES[e.hole];
    const up = e.state === "up" ? Math.min(1, e.age / 0.14) * (e.life - e.age < 0.14 ? clamp01((e.life - e.age) / 0.14) : 1) : clamp01(1 - (e.age - e.life) / 0.2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(hx - 40, hy - 70, 80, 78);
    ctx.clip();
    ctx.translate(hx, hy + 8 - 34 * up);
    if (e.kind === "pajaro") bird(ctx, view.t);
    else mouse(ctx, e.kind, view.t);
    ctx.restore();
    if (e.state === "hit" && e.age - e.life < 0.25) {
      paw(ctx, hx, hy - 6, clamp01((e.age - e.life) / 0.25));
      if (e.kind === "pajaro") text(ctx, "−2", hx, hy - 52, { size: 14, color: "#e5484d", align: "center", weight: 800 });
      else text(ctx, e.kind === "oro" ? "+3" : "+1", hx, hy - 52 - (e.age - e.life) * 40, { size: 14, color: "#d98a00", align: "center", weight: 800 });
    }
  }
  drawTinto(ctx, { ox: 120, oy: 244, s: 0.55, t: view.t, face: "contento", night: false, tail: false, headOnly: true, outfit: view.outfit });
  hud(ctx, g, gameById("topos"), P, { score: g.points, light: true });
  text(ctx, "¡a los ratones, no a los pájaros!", 120, 270, { size: 10, color: "#5a6b84", align: "center", weight: 700 });
}

// ───────── Simón de maullidos ─────────
const PAD_COLORS = [["#ff7a7a", "#d63a4a"], ["#6aa6ff", "#3f6fe0"], ["#6fe08a", "#2fa85a"], ["#ffdf6e", "#e0a420"]];
function drawSimon(ctx, g, view) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#2b2147"], [1, "#171231"]]);
  ctx.fillRect(0, 0, W, H);
  PADS.forEach(([x, y], i) => {
    const lit = g.lit === i;
    soft(ctx, lit ? 22 : 5, 0, lit ? PAD_COLORS[i][0] : "rgba(0,0,0,0.4)", () => {
      ctx.beginPath();
      ctx.arc(x, y, 34, 0, TAU);
      ctx.fillStyle = lit ? lin(ctx, 0, y - 34, 0, y + 34, [[0, "#fff"], [0.3, PAD_COLORS[i][0]], [1, PAD_COLORS[i][1]]]) : lin(ctx, 0, y - 34, 0, y + 34, [[0, PAD_COLORS[i][1] + "99"], [1, "#0e0a20"]]);
      ctx.fill();
    });
    // huella
    ctx.fillStyle = lit ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.ellipse(x, y + 7, 11, 9, 0, 0, TAU);
    ctx.fill();
    for (const dx of [-12, -4.5, 4.5, 12]) {
      ctx.beginPath();
      ctx.ellipse(x + dx, y - 9 + Math.abs(dx) * 0.35, 4.2, 5.2, 0, 0, TAU);
      ctx.fill();
    }
  });
  const msg = g.phase === "input" ? "¡Tu turno!" : g.phase === "pause" ? "¡Muy bien!" : "Escucha…";
  text(ctx, msg, 120, 62, { size: 16, color: "#eef0ff", align: "center", weight: 800 });
  drawTinto(ctx, { ox: 120, oy: 252, s: 0.5, t: view.t, face: g.phase === "input" ? "tranquilo" : "contento", night: true, tail: false, headOnly: true, outfit: view.outfit });
  hud(ctx, g, gameById("simon"), NIGHT, { score: g.round * 2, label: `ronda ${g.round + 1}` });
}

// ───────── Pesca ─────────
function fishArt(ctx, f, t) {
  const def = FISH[f.kind];
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.vx >= 0 ? 1 : -1, 1);
  const r = def.r;
  const wag = Math.sin(t * 9 + f.x * 0.1) * 0.25;
  ctx.save();
  ctx.translate(-r * 0.9, 0);
  ctx.rotate(wag);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-r * 0.7, -r * 0.6);
  ctx.lineTo(-r * 0.7, r * 0.6);
  ctx.closePath();
  ctx.fillStyle = f.kind === "dorado" ? "#f0a030" : f.kind === "globo" ? "#e0a020" : "#e8672a";
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.68, 0, 0, TAU);
  const c = { pequeno: ["#ffb347", "#ff7a3d"], grande: ["#ff8a5c", "#d9482a"], dorado: ["#fff1a6", "#f0a82a"], globo: ["#ffe27a", "#e0a020"] }[f.kind];
  ctx.fillStyle = lin(ctx, 0, -r, 0, r, [[0, c[0]], [1, c[1]]]);
  ctx.fill();
  if (f.kind === "globo") {
    ctx.strokeStyle = "#b9790c";
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.68);
      ctx.lineTo(Math.cos(a) * (r + 4), Math.sin(a) * (r * 0.68 + 4));
      ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.arc(r * 0.45, -r * 0.15, 1.7, 0, TAU);
  ctx.fillStyle = "#2b2438";
  ctx.fill();
  if (f.kind === "dorado") {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 8);
    star(ctx, 0, -r - 4, 3.4, t, false);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawPesca(ctx, g, view) {
  const P = pal(false);
  ctx.fillStyle = lin(ctx, 0, 0, 0, POND.top, [[0, "#dff1ff"], [1, "#f4ead6"]]);
  ctx.fillRect(0, 0, W, POND.top);
  ctx.fillStyle = lin(ctx, 0, POND.top, 0, H, [[0, "#6fc4f0"], [0.6, "#3f8fd0"], [1, "#245c9c"]]);
  ctx.fillRect(0, POND.top, W, H - POND.top);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  for (let i = 0; i < 5; i++) {
    const x = ((i * 53 + view.t * 12) % (W + 40)) - 20;
    ctx.beginPath();
    ctx.ellipse(x, POND.top + 4 + i * 2, 26, 3, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "#d9b87a";
  ctx.fillRect(0, 232, W, 48);
  ctx.fillStyle = "#4fbf6a";
  for (const x of [20, 60, 150, 214]) {
    ctx.beginPath();
    ctx.ellipse(x, 224 + Math.sin(view.t * 2 + x) * 1.5, 4, 14, 0.1 * Math.sin(view.t + x), 0, TAU);
    ctx.fill();
  }
  for (const f of g.fish) if (!f.hooked) fishArt(ctx, f, view.t);
  const h = g.hook;
  const tip = { x: h.x, y: 38 };
  ctx.strokeStyle = "#8f6330";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(52, 70);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(h.x, h.y);
  ctx.stroke();
  ctx.strokeStyle = "#d8dbe6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(h.x, h.y + 4, 4, -0.4, Math.PI * 1.1);
  ctx.stroke();
  if (h.fish) fishArt(ctx, h.fish, view.t);
  drawTinto(ctx, { ox: 36, oy: 68, s: 0.58, t: view.t, face: h.fish ? "contento" : "tranquilo", night: false, tail: false, headOnly: true, outfit: view.outfit });
  hud(ctx, g, gameById("pesca"), P, { score: Math.max(0, g.points), light: true });
  text(ctx, "mantén para bajar · suelta para subir", 120, 268, { size: 10, color: "#e8f5ff", align: "center", weight: 700 });
}

const DRAW = { estrellas: drawEstrellas, laser: drawLaser, carrera: drawCarrera, laberinto: drawLaberinto, cajas: drawCajas, topos: drawTopos, simon: drawSimon, pesca: drawPesca };
export function drawGame(ctx, view) {
  DRAW[view.game.id](ctx, view.game, view);
}
