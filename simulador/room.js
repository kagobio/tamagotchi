// El cuarto de Tinto: pared, ventana con el tiempo de verdad, suelo, rascador, la decoración que se compra y las sorpresas.
import { H, TAU, W, blob, clamp01, lin, rad, rr, soft } from "./gfx.js";

const STARS = [[16, 30, 1.1], [62, 22, 0.9], [96, 40, 1], [34, 96, 0.9], [118, 24, 0.8], [8, 150, 0.9]];

// ───────── ventana ─────────
const SKY = {
  clear: ["#a9dcff", "#e8f6ff"],
  cloud: ["#b9c7d8", "#e2e8ef"],
  fog: ["#c9d0d8", "#e6e9ed"],
  rain: ["#8196ad", "#c1ccd8"],
  snow: ["#c4cfdc", "#eef3f8"],
  storm: ["#586274", "#8b94a4"],
};
const WIN = { x: 150, y: 60, w: 74, h: 70 };

function cloud(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 13 * s, 6.5 * s, 0, 0, TAU);
  ctx.ellipse(x - 9 * s, y + 2 * s, 8 * s, 5 * s, 0, 0, TAU);
  ctx.ellipse(x + 10 * s, y + 2 * s, 9 * s, 5.5 * s, 0, 0, TAU);
  ctx.ellipse(x + 2 * s, y - 5 * s, 8 * s, 6 * s, 0, 0, TAU);
  ctx.fill();
}

function windowView(ctx, P, night, t, weather) {
  const kind = weather && SKY[weather.kind] ? weather.kind : "clear";
  const dull = ["cloud", "fog", "rain", "snow", "storm"].includes(kind);
  ctx.save();
  rr(ctx, WIN.x, WIN.y, WIN.w, WIN.h, 9);
  ctx.clip();
  const sky = night ? ["#0d1230", "#1d2653"] : SKY[kind];
  ctx.fillStyle = lin(ctx, 0, WIN.y, 0, WIN.y + WIN.h, [[0, sky[0]], [1, sky[1]]]);
  ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
  if (night) {
    for (const [i, [x, y, r]] of STARS.entries()) {
      ctx.fillStyle = `rgba(255,240,180,${0.45 + 0.5 * Math.sin(t * 1.6 + i * 1.7)})`;
      ctx.beginPath();
      ctx.arc(WIN.x + 6 + ((x * 7) % (WIN.w - 12)), WIN.y + 8 + ((y * 3) % 30), r, 0, TAU);
      ctx.fill();
    }
    soft(ctx, 10, 0, "rgba(170,196,255,0.8)", () => {
      ctx.beginPath();
      ctx.arc(WIN.x + 52, WIN.y + 22, 9, 0, TAU);
      ctx.fillStyle = "#e9f0ff";
      ctx.fill();
    });
    ctx.beginPath();
    ctx.arc(WIN.x + 56, WIN.y + 19, 8, 0, TAU);
    ctx.fillStyle = "#0f1536";
    ctx.fill();
  } else if (kind === "clear") {
    ctx.fillStyle = rad(ctx, WIN.x + 50, WIN.y + 22, 2, WIN.x + 50, WIN.y + 22, 30, [[0, "rgba(255,244,190,0.95)"], [1, "rgba(255,244,190,0)"]]);
    ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
    ctx.beginPath();
    ctx.arc(WIN.x + 50, WIN.y + 22, 10, 0, TAU);
    ctx.fillStyle = "#ffd75e";
    ctx.fill();
  }
  const drift = (t * 3) % (WIN.w + 40);
  const tone = night ? "rgba(70,78,130,0.9)" : dull ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.88)";
  cloud(ctx, WIN.x - 20 + drift, WIN.y + 26, 0.9, tone);
  if (dull || night) cloud(ctx, WIN.x + ((drift * 0.7 + 50) % (WIN.w + 40)) - 20, WIN.y + 14, 1.15, night ? "rgba(55,62,112,0.9)" : kind === "storm" ? "rgba(70,76,92,0.95)" : "rgba(255,255,255,0.95)");
  else cloud(ctx, WIN.x + ((drift * 0.6 + 40) % (WIN.w + 40)) - 20, WIN.y + 44, 0.6, "rgba(255,255,255,0.8)");
  if (kind === "rain" || kind === "storm") {
    ctx.strokeStyle = night ? "rgba(170,196,255,0.6)" : "rgba(70,100,150,0.65)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 22; i++) {
      const x = WIN.x + ((i * 37) % WIN.w);
      const y = WIN.y + (((i * 53 + t * 110) % (WIN.h + 10)) - 5);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2.2, y + 7);
      ctx.stroke();
    }
  }
  if (kind === "snow") {
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    for (let i = 0; i < 20; i++) {
      const x = WIN.x + ((i * 29 + Math.sin(t + i) * 4 + WIN.w) % WIN.w);
      const y = WIN.y + (((i * 47 + t * 22) % (WIN.h + 6)) - 3);
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, TAU);
      ctx.fill();
    }
  }
  if (kind === "storm" && t % 7 < 0.22) {
    ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - (t % 7) / 0.22)})`;
    ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
    ctx.fillStyle = "#fff3a0";
    ctx.beginPath();
    ctx.moveTo(WIN.x + 38, WIN.y + 22);
    ctx.lineTo(WIN.x + 30, WIN.y + 40);
    ctx.lineTo(WIN.x + 38, WIN.y + 40);
    ctx.lineTo(WIN.x + 32, WIN.y + 58);
    ctx.lineTo(WIN.x + 48, WIN.y + 34);
    ctx.lineTo(WIN.x + 40, WIN.y + 34);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Marco, cruceta, alféizar y cortinas.
  rr(ctx, WIN.x, WIN.y, WIN.w, WIN.h, 9);
  ctx.lineWidth = 4;
  ctx.strokeStyle = night ? "#3b3760" : "#fffaf0";
  ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = night ? "rgba(90,86,140,0.9)" : "rgba(235,224,205,0.95)";
  ctx.beginPath();
  ctx.moveTo(WIN.x + WIN.w / 2, WIN.y + 3);
  ctx.lineTo(WIN.x + WIN.w / 2, WIN.y + WIN.h - 3);
  ctx.moveTo(WIN.x + 3, WIN.y + WIN.h / 2);
  ctx.lineTo(WIN.x + WIN.w - 3, WIN.y + WIN.h / 2);
  ctx.stroke();
  soft(ctx, 4, 2, P.shadow, () => {
    rr(ctx, WIN.x - 5, WIN.y + WIN.h - 1, WIN.w + 10, 6, 3);
    ctx.fillStyle = night ? "#3b3760" : "#fffaf0";
    ctx.fill();
  });
  for (const side of [0, 1]) {
    const x = side ? WIN.x + WIN.w - 4 : WIN.x - 12;
    ctx.beginPath();
    ctx.moveTo(x, WIN.y - 6);
    ctx.quadraticCurveTo(x + (side ? 8 : 4), WIN.y + 30, x + (side ? 10 : 2), WIN.y + WIN.h + 4);
    ctx.lineTo(x + (side ? 14 : 6), WIN.y + WIN.h + 4);
    ctx.quadraticCurveTo(x + (side ? 18 : 12), WIN.y + 30, x + (side ? 12 : 12), WIN.y - 6);
    ctx.closePath();
    ctx.fillStyle = night ? "rgba(96,80,150,0.92)" : "rgba(246,196,206,0.95)";
    ctx.fill();
  }
  if (weather && Number.isFinite(weather.temp)) {
    ctx.font = '800 9.5px "Nunito", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = night ? "#c8cdf0" : "#7b6f62";
    ctx.fillText(`${weather.temp}°`, WIN.x + WIN.w / 2, WIN.y + WIN.h + 13);
  }
}

// ───────── decoración ─────────
function rug(ctx, night, at = [120, 216]) {
  ctx.save();
  ctx.translate(at[0], at[1]);
  ctx.scale(1, 0.14);
  ctx.beginPath();
  ctx.arc(0, 0, 100, 0, TAU);
  ctx.fillStyle = lin(ctx, 0, -100, 0, 100, [[0, night ? "#6a3f58" : "#e07a7f"], [1, night ? "#4c2a42" : "#b94d5a"]]);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, 80, 0, TAU);
  ctx.strokeStyle = night ? "rgba(255,210,220,0.25)" : "rgba(255,240,235,0.7)";
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 58, 0, TAU);
  ctx.strokeStyle = night ? "rgba(255,210,220,0.18)" : "rgba(255,240,235,0.45)";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
}

function plant(ctx, P, night, t, at = [30, 218]) {
  ctx.save();
  ctx.translate(at[0], at[1]);
  blob(ctx, 0, 4, 18, 4, P.shadow);
  ctx.fillStyle = night ? "#2f7a4a" : "#4fbf6a";
  for (const [a, l] of [[-0.7, 20], [-0.25, 26], [0.2, 24], [0.65, 19]]) {
    ctx.save();
    ctx.rotate(a + 0.05 * Math.sin(t * 1.3 + a));
    ctx.beginPath();
    ctx.ellipse(0, -14 - l / 2, 4.6, l / 2, 0, 0, TAU);
    ctx.fillStyle = lin(ctx, 0, -14 - l, 0, -12, [[0, night ? "#3f9a5f" : "#6ee08a"], [1, night ? "#235d38" : "#3ca85a"]]);
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.moveTo(-9, -12);
  ctx.lineTo(9, -12);
  ctx.lineTo(7, 4);
  ctx.lineTo(-7, 4);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -12, 0, 4, [[0, night ? "#9a5a3f" : "#e08a5e"], [1, night ? "#6f3d2a" : "#b8603c"]]);
  ctx.fill();
  rr(ctx, -10.5, -14, 21, 4.5, 2);
  ctx.fillStyle = night ? "#a8644a" : "#eb9a6e";
  ctx.fill();
  ctx.restore();
}

function lamp(ctx, P, night, at = [64, 226]) {
  ctx.save();
  ctx.translate(at[0], at[1]);
  if (night) {
    ctx.fillStyle = rad(ctx, 0, -14, 2, 0, -14, 40, [[0, "rgba(255,220,140,0.5)"], [1, "rgba(255,220,140,0)"]]);
    ctx.fillRect(-40, -54, 80, 80);
  }
  blob(ctx, 0, 3, 13, 3, P.shadow);
  rr(ctx, -2, -14, 4, 15, 2);
  ctx.fillStyle = night ? "#8c7f9a" : "#a89b86";
  ctx.fill();
  rr(ctx, -8, 0, 16, 4, 2);
  ctx.fillStyle = night ? "#7a6f88" : "#9a8d78";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-10, -12);
  ctx.lineTo(10, -12);
  ctx.lineTo(6, -26);
  ctx.lineTo(-6, -26);
  ctx.closePath();
  ctx.fillStyle = night ? "#ffe3a0" : "#ffd98a";
  ctx.fill();
  ctx.strokeStyle = "rgba(160,110,30,0.4)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function yarn(ctx, P, night, at = [186, 226]) {
  ctx.save();
  ctx.translate(at[0], at[1]);
  blob(ctx, 0, 8, 12, 3, P.shadow);
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, TAU);
  ctx.fillStyle = rad(ctx, -3, -3, 1, 0, 0, 10, [[0, night ? "#d77aa6" : "#ff9cc4"], [1, night ? "#8e3f6a" : "#e0589a"]]);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 0.9;
  for (const r of [3, 5.5, 7.5]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0.6, 2.4);
    ctx.stroke();
  }
  ctx.strokeStyle = night ? "#d77aa6" : "#ff9cc4";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(8, 4);
  ctx.quadraticCurveTo(16, 8, 20, 3);
  ctx.stroke();
  ctx.restore();
}

function bowl(ctx, P, night, t, at = [214, 205]) {
  ctx.save();
  ctx.translate(at[0], at[1]);
  blob(ctx, 0, 18, 18, 4, P.shadow);
  rr(ctx, -9, 8, 18, 10, 3);
  ctx.fillStyle = night ? "#5b4a78" : "#c89a6a";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -4, 15, 0, TAU);
  ctx.fillStyle = rad(ctx, -4, -9, 2, 0, -4, 16, [[0, night ? "rgba(120,160,230,0.55)" : "rgba(190,230,255,0.85)"], [1, night ? "rgba(60,90,170,0.7)" : "rgba(120,190,240,0.75)"]]);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, -4, 14, 0, TAU);
  ctx.clip();
  const fx = Math.sin(t * 0.9) * 8;
  const dir = Math.cos(t * 0.9) > 0 ? 1 : -1;
  ctx.translate(fx, -2 + Math.sin(t * 1.7) * 2);
  ctx.scale(dir, 1);
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 3, 0, 0, TAU);
  ctx.moveTo(-4, 0);
  ctx.lineTo(-9, -3);
  ctx.lineTo(-9, 3);
  ctx.closePath();
  ctx.fillStyle = "#ff8a3d";
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -4, 15, 3.6, 4.8);
  ctx.stroke();
  ctx.restore();
}

function decor(ctx, P, night, t, list) {
  if (list.includes("alfombra")) rug(ctx, night);
  if (list.includes("planta")) plant(ctx, P, night, t);
  if (list.includes("lampara")) lamp(ctx, P, night);
  if (list.includes("ovillo")) yarn(ctx, P, night);
  if (list.includes("pecera")) bowl(ctx, P, night, t);
}

// La decoración suelta, para la vista previa de la tienda.
export function drawDecorItem(ctx, id, x, y, s, P, night, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const at = [0, 0];
  if (id === "alfombra") rug(ctx, night, at);
  else if (id === "planta") plant(ctx, P, night, t, at);
  else if (id === "lampara") lamp(ctx, P, night, at);
  else if (id === "ovillo") yarn(ctx, P, night, at);
  else if (id === "pecera") bowl(ctx, P, night, t, at);
  ctx.restore();
}

// ───────── escena ─────────
export function drawScene(ctx, P, night, t, { weather = null, decor: list = [] } = {}) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, 192, [[0, P.wall[0]], [1, P.wall[1]]]);
  ctx.fillRect(0, 0, W, 192);
  ctx.save();
  ctx.fillStyle = lin(ctx, 150, 0, 220, 190, [[0, P.shaft], [1, "rgba(255,255,255,0)"]]);
  ctx.beginPath();
  ctx.moveTo(118, 0);
  ctx.lineTo(176, 0);
  ctx.lineTo(262, 190);
  ctx.lineTo(196, 190);
  ctx.fill();
  ctx.restore();
  windowView(ctx, P, night, t, weather);
  ctx.fillStyle = lin(ctx, 0, 182, 0, 194, [[0, P.base[0]], [1, P.base[1]]]);
  ctx.fillRect(0, 182, W, 12);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(0, 182, W, 1);
  ctx.fillStyle = lin(ctx, 0, 194, 0, H, [[0, P.floor[0]], [1, P.floor[1]]]);
  ctx.fillRect(0, 194, W, H - 194);
  ctx.strokeStyle = P.seam;
  ctx.lineWidth = 1.2;
  for (const y of [194, 209, 226, 246, 270]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (const [a, b, xs] of [[194, 209, [40, 112, 176, 232]], [209, 226, [72, 150, 214]], [226, 246, [22, 102, 172]], [246, 270, [64, 140, 210]]])
    for (const x of xs) {
      ctx.beginPath();
      ctx.moveTo(x, a);
      ctx.lineTo(x, b);
      ctx.stroke();
    }
  ctx.fillStyle = P.gloss;
  ctx.beginPath();
  ctx.moveTo(154, 194);
  ctx.lineTo(240, 194);
  ctx.lineTo(262, 276);
  ctx.lineTo(168, 276);
  ctx.fill();
  decor(ctx, P, night, t, list);
  ctx.fillStyle = rad(ctx, 120, 130, 40, 120, 130, 210, [[0, "rgba(0,0,0,0)"], [1, P.vignette]]);
  ctx.fillRect(0, 0, W, H);
}

export function drawTree(ctx, P, t) {
  soft(ctx, 5, 2, P.shadow, () => {
    rr(ctx, 2, 186, 54, 10, 5);
    ctx.fillStyle = P.cream[1];
    ctx.fill();
  });
  rr(ctx, 2, 186, 54, 9, 4.5);
  ctx.fillStyle = lin(ctx, 0, 186, 0, 195, [[0, P.cream[0]], [1, P.cream[1]]]);
  ctx.fill();
  ctx.save();
  rr(ctx, 17, 80, 26, 108, 5);
  ctx.clip();
  ctx.fillStyle = lin(ctx, 17, 0, 43, 0, [[0, P.sisalLight], [0.45, P.sisal], [1, P.sisalDark]]);
  ctx.fillRect(17, 80, 26, 108);
  for (let y = 83; y < 188; y += 4.2) {
    ctx.strokeStyle = P.sisalDark;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(17, y);
    ctx.quadraticCurveTo(30, y + 1.8, 43, y - 0.4);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(17, y + 1.6);
    ctx.quadraticCurveTo(30, y + 3.4, 43, y + 1.2);
    ctx.stroke();
  }
  ctx.restore();
  soft(ctx, 6, 3, P.shadow, () => {
    rr(ctx, -14, 62, 76, 20, 9);
    ctx.fillStyle = P.cream[1];
    ctx.fill();
  });
  rr(ctx, -14, 60, 76, 20, 9);
  ctx.fillStyle = lin(ctx, 0, 60, 0, 80, [[0, P.cream[0]], [1, P.cream[1]]]);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6, 63);
  ctx.lineTo(54, 63);
  ctx.stroke();
  ctx.save();
  ctx.translate(52, 80);
  ctx.rotate(0.12 * Math.sin(t * 1.4));
  ctx.strokeStyle = P.string;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 24);
  ctx.stroke();
  soft(ctx, 3, 2, P.shadow, () => {
    ctx.beginPath();
    ctx.arc(0, 31, 8, 0, TAU);
    ctx.fillStyle = P.cream[1];
    ctx.fill();
  });
  ctx.beginPath();
  ctx.arc(0, 31, 8, 0, TAU);
  ctx.fillStyle = rad(ctx, -2.5, 28, 1, 0, 31, 9, [[0, "#ffffff"], [1, P.cream[1]]]);
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 6.5, 31 + Math.sin(a) * 6.5);
    ctx.lineTo(Math.cos(a) * 9.2, 31 + Math.sin(a) * 9.2);
    ctx.stroke();
  }
  ctx.restore();
}

// ───────── sorpresas ─────────
export function drawSurprise(ctx, s, t) {
  if (!s) return;
  const fade = clamp01(Math.min(s.t / 0.3, (s.kind === "mariposa" ? 6.4 : 9) - s.t));
  ctx.save();
  ctx.globalAlpha = fade;
  if (s.kind === "mariposa") {
    ctx.translate(s.x, s.y);
    ctx.rotate(0.2 * Math.sin(t * 5));
    const flap = Math.abs(Math.sin(t * 13));
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side * (0.25 + 0.75 * flap), 1);
      ctx.beginPath();
      ctx.ellipse(7, -4, 8, 6, -0.4, 0, TAU);
      ctx.ellipse(5, 5, 6, 4.4, 0.5, 0, TAU);
      ctx.fillStyle = lin(ctx, 0, -10, 0, 9, [[0, "#ffb347"], [1, "#e0589a"]]);
      ctx.fill();
      ctx.restore();
    }
    rr(ctx, -1.2, -6, 2.4, 12, 1.2);
    ctx.fillStyle = "#4a3a52";
    ctx.fill();
    soft(ctx, 8, 0, "rgba(255,200,120,0.8)", () => {
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, TAU);
      ctx.fill();
    });
  } else {
    ctx.translate(s.x, s.y + Math.sin(t * 4) * 1.5);
    soft(ctx, 5, 2, "rgba(60,34,14,0.3)", () => {
      rr(ctx, -12, -8, 24, 18, 3);
      ctx.fillStyle = "#e5484d";
      ctx.fill();
    });
    rr(ctx, -12, -8, 24, 18, 3);
    ctx.fillStyle = lin(ctx, 0, -8, 0, 10, [[0, "#ff7a86"], [1, "#d12f43"]]);
    ctx.fill();
    ctx.fillStyle = "#ffd75e";
    ctx.fillRect(-2.5, -8, 5, 18);
    ctx.fillRect(-12, -1, 24, 4);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * 5, -11, 5.5, 3.4, side * 0.5, 0, TAU);
      ctx.fillStyle = "#ffd75e";
      ctx.fill();
    }
  }
  ctx.restore();
}
