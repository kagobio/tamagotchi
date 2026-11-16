// Todo lo que se pinta en la pantalla de 240 × 280: ilustración suave con volumen y luz.
// Se dibuja con trazados y degradados a SCALE veces la resolución; en la placa saldrán de sprites ya renderizados.
import { ALERT_SECONDS, GAME, LOW, NAME, age, energy, feeling, sleeping, whisper } from "./pet.js";

export const SCALE = 3;
export const W = 240;
export const H = 280;
export const MENU = ["comer", "jugar", "dormir", "estado"];
export const SLOTS = [48, 96, 144, 192];
export const BAR = { y: 240, size: 36 };
export const LANES = [60, 120, 180];

const FONT = '"Nunito", ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
const TAU = Math.PI * 2;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, k) => a + (b - a) * k;

const DAY = {
  wall: ["#f8f2e9", "#ebe0cf"], shaft: "rgba(255,255,255,0.5)", vignette: "rgba(90,55,20,0.13)",
  base: ["#aa7850", "#7c5134"], floor: ["#e2b07a", "#b47849"], seam: "rgba(105,62,30,0.30)", gloss: "rgba(255,255,255,0.22)",
  cream: ["#fffaf0", "#e9dcc2"], inner: ["#c6b48e", "#e4d7bb"], edge: "#c9b794",
  sisal: "#dcc590", sisalDark: "#b2935a", sisalLight: "#f1e0b0", string: "#bfb299",
  rim: "176,190,255", rimA: 0.55,
  ink: "#2b2438", soft: "#7b7589", pill: "rgba(255,255,255,0.86)", glass: "rgba(255,255,255,0.96)",
  btn: "rgba(255,255,255,0.30)", btnLine: "rgba(255,255,255,0.5)", shadow: "rgba(60,34,14,0.30)",
  whisker: "#f6f3fb", whiskerShadow: "rgba(0,0,0,0.32)", lid: "#b4b0d2",
};
const NIGHT = {
  wall: ["#232b55", "#161b37"], shaft: "rgba(150,180,255,0.11)", vignette: "rgba(0,0,22,0.4)",
  base: ["#2f2c4e", "#1f1c37"], floor: ["#31406a", "#1c2444"], seam: "rgba(8,10,28,0.5)", gloss: "rgba(150,180,255,0.09)",
  cream: ["#6e6e98", "#4b4b70"], inner: ["#2c2c4a", "#41416a"], edge: "#3a3a5d",
  sisal: "#7d7862", sisalDark: "#58543f", sisalLight: "#979278", string: "#6e6c8c",
  rim: "150,178,255", rimA: 0.95,
  ink: "#eef0ff", soft: "#a6aacd", pill: "rgba(32,38,74,0.86)", glass: "rgba(40,46,88,0.96)",
  btn: "rgba(255,255,255,0.09)", btnLine: "rgba(255,255,255,0.16)", shadow: "rgba(0,0,10,0.55)",
  whisker: "#dad8ef", whiskerShadow: "rgba(0,0,0,0.5)", lid: "#9d9abf",
};
const pal = (night) => (night ? NIGHT : DAY);
const FUR = ["#403d50", "#27242f", "#14121a"];

const lin = (ctx, x0, y0, x1, y1, stops) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  return g;
};
const rad = (ctx, x0, y0, r0, x1, y1, r1, stops) => {
  const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  return g;
};
const rr = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};
const soft = (ctx, blur, dy, color, draw) => {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * SCALE;
  ctx.shadowOffsetY = dy * SCALE;
  draw();
  ctx.restore();
};
// Una sombra elíptica difusa, sin filtros: un degradado radial aplastado.
const blob = (ctx, x, y, rx, ry, color) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = rad(ctx, 0, 0, 0, 0, 0, rx, [[0, color], [1, "rgba(0,0,0,0)"]]);
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
};
const text = (ctx, string, x, y, { size = 12, color = "#000", align = "left", weight = 700, max = 0, spacing = 0 } = {}) => {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  if ("letterSpacing" in ctx) ctx.letterSpacing = spacing ? `${spacing}px` : "0px";
  let shown = string;
  if (max) while (shown.length > 1 && ctx.measureText(shown).width > max) shown = `${shown.slice(0, -2)}…`;
  ctx.fillText(shown, x, y);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
};

// ───────────────────────── iconos ─────────────────────────
function heart(ctx, x, y, s, color = "#ff6f91") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-9, -1, -6, -8, 0, -3.5);
  ctx.bezierCurveTo(6, -8, 9, -1, 0, 5);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-3.2, -3, 1.6, 1, -0.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function star(ctx, x, y, r, spin = 0, glow = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  const path = () => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 ? r * 0.46 : r;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    }
    ctx.closePath();
  };
  if (glow) soft(ctx, r * 1.1, 0, "rgba(255,214,90,0.8)", () => { path(); ctx.fillStyle = "#ffd75e"; ctx.fill(); });
  path();
  ctx.fillStyle = lin(ctx, 0, -r, 0, r, [[0, "#fff1a6"], [1, "#ffb627"]]);
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineWidth = r * 0.16;
  ctx.strokeStyle = "#f09a10";
  ctx.stroke();
  ctx.restore();
}

function apple(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.bezierCurveTo(6, -11, 15, -5, 12, 4);
  ctx.bezierCurveTo(10, 11, 4, 13, 0, 11);
  ctx.bezierCurveTo(-4, 13, -10, 11, -12, 4);
  ctx.bezierCurveTo(-15, -5, -6, -11, 0, -6);
  ctx.fillStyle = rad(ctx, -4, -3, 1, 0, 2, 15, [[0, "#ff8b8b"], [1, "#d62f45"]]);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.ellipse(-6, -2, 2.2, 3.6, 0.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#7a4a2a";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.quadraticCurveTo(1, -10, 3, -12);
  ctx.stroke();
  ctx.fillStyle = "#58c96b";
  ctx.beginPath();
  ctx.ellipse(6, -10, 5, 2.4, -0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function moon(ctx, x, y, r, color = "#9bbcff") {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.clip();
  ctx.beginPath();
  ctx.rect(-r * 2, -r * 2, r * 4, r * 4);
  ctx.arc(r * 0.45, -r * 0.3, r * 0.82, 0, TAU);
  ctx.fillStyle = lin(ctx, -r, -r, r, r, [[0, "#d9e6ff"], [1, color]]);
  ctx.fill("evenodd");
  ctx.restore();
}

function bars(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  [[-8, 9, "#7ee0c2", "#35b595"], [-1, 15, "#8fb4ff", "#4f7fe0"], [6, 21, "#d9a7ff", "#a35be0"]].forEach(([bx, h, a, b]) => {
    rr(ctx, bx - 2.6, 11 - h, 5.2, h, 2.6);
    ctx.fillStyle = lin(ctx, 0, 11 - h, 0, 11, [[0, a], [1, b]]);
    ctx.fill();
  });
  ctx.restore();
}

function icon(ctx, name, x, y, s = 1) {
  if (name === "comer") apple(ctx, x, y + 1, s * 0.95);
  else if (name === "jugar") star(ctx, x, y + 1, 11 * s, 0, false);
  else if (name === "dormir") moon(ctx, x, y, 11 * s);
  else bars(ctx, x, y - 1, s * 0.85);
}

function bell(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-7, 5);
  ctx.quadraticCurveTo(-5, 4, -5, -2);
  ctx.bezierCurveTo(-5, -8, 5, -8, 5, -2);
  ctx.quadraticCurveTo(5, 4, 7, 5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 7, 2.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function battery(ctx, x, y, level, color, ink, bolt) {
  rr(ctx, x, y, 24, 12, 3.4);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  rr(ctx, x + 24.5, y + 3.8, 2.4, 4.4, 1.2);
  ctx.fillStyle = ink;
  ctx.fill();
  rr(ctx, x + 2.2, y + 2.2, Math.max(2.6, (19.6 * level) / 100), 7.6, 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (bolt) {
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 13.4, y + 1.6);
    ctx.lineTo(x + 8.4, y + 6.8);
    ctx.lineTo(x + 11.6, y + 6.8);
    ctx.lineTo(x + 10.2, y + 10.6);
    ctx.lineTo(x + 15.6, y + 5.2);
    ctx.lineTo(x + 12.4, y + 5.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// ───────────────────────── el cuarto ─────────────────────────
const STARS = [[22, 38, 1.2], [58, 70, 0.9], [92, 28, 1.1], [150, 82, 0.9], [34, 110, 1], [214, 120, 1.1], [180, 30, 0.8], [124, 60, 0.9], [206, 160, 0.9]];

function scene(ctx, P, night, t) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, 192, [[0, P.wall[0]], [1, P.wall[1]]]);
  ctx.fillRect(0, 0, W, 192);
  // La luz de la ventana cae en diagonal sobre la pared y el suelo.
  ctx.save();
  ctx.fillStyle = lin(ctx, 150, 0, 220, 190, [[0, P.shaft], [1, "rgba(255,255,255,0)"]]);
  ctx.beginPath();
  ctx.moveTo(118, 0); ctx.lineTo(176, 0); ctx.lineTo(262, 190); ctx.lineTo(196, 190);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(188, 0); ctx.lineTo(204, 0); ctx.lineTo(262, 130); ctx.lineTo(244, 130);
  ctx.fill();
  ctx.restore();
  if (night) {
    soft(ctx, 24, 0, "rgba(160,190,255,0.55)", () => moon(ctx, 198, 62, 15, "#b9ceff"));
    STARS.forEach(([x, y, r], i) => {
      ctx.fillStyle = `rgba(255,236,170,${0.45 + 0.5 * Math.sin(t * 1.6 + i * 1.7)})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    });
  }
  // Rodapié y suelo de tablas.
  ctx.fillStyle = lin(ctx, 0, 182, 0, 194, [[0, P.base[0]], [1, P.base[1]]]);
  ctx.fillRect(0, 182, W, 12);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(0, 182, W, 1);
  ctx.fillStyle = lin(ctx, 0, 194, 0, H, [[0, P.floor[0]], [1, P.floor[1]]]);
  ctx.fillRect(0, 194, W, H - 194);
  const rows = [194, 209, 226, 246, 270];
  ctx.strokeStyle = P.seam;
  ctx.lineWidth = 1.2;
  rows.forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  });
  [[194, 209, [40, 112, 176, 232]], [209, 226, [72, 150, 214]], [226, 246, [22, 102, 172]], [246, 270, [64, 140, 210]]].forEach(([a, b, xs]) =>
    xs.forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, a);
      ctx.lineTo(x, b);
      ctx.stroke();
    }),
  );
  ctx.fillStyle = P.gloss;
  ctx.beginPath();
  ctx.moveTo(154, 194); ctx.lineTo(240, 194); ctx.lineTo(262, 276); ctx.lineTo(168, 276);
  ctx.fill();
  ctx.fillStyle = rad(ctx, 120, 130, 40, 120, 130, 210, [[0, "rgba(0,0,0,0)"], [1, P.vignette]]);
  ctx.fillRect(0, 0, W, H);
}

function tree(ctx, P, t) {
  // Rascador: base, poste de sisal, plataforma y un pompón que se balancea.
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

// ───────────────────────── Tinto ─────────────────────────
// Un gatito negro de orejas enormes, el ojo izquierdo velado y el derecho verde, como en la foto.
// Se dibuja en coordenadas locales con el centro del borde de su cesta en (0, 0).
const FURSTROKES = (() => {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 52 }, () => {
    const a = rnd() * TAU;
    const r = 8 + rnd() * 26;
    return { x: Math.cos(a) * r * 1.15, y: Math.sin(a) * r * 0.85, a, l: 4 + rnd() * 5 };
  });
})();

const headPath = (ctx, hx, hy) => {
  ctx.beginPath();
  ctx.moveTo(hx, hy - 32);
  ctx.bezierCurveTo(hx + 24, hy - 32, hx + 40, hy - 18, hx + 41, hy - 2);
  ctx.bezierCurveTo(hx + 42, hy + 8, hx + 46, hy + 14, hx + 40, hy + 22);
  ctx.bezierCurveTo(hx + 32, hy + 32, hx + 14, hy + 33, hx, hy + 33);
  ctx.bezierCurveTo(hx - 14, hy + 33, hx - 32, hy + 32, hx - 40, hy + 22);
  ctx.bezierCurveTo(hx - 46, hy + 14, hx - 42, hy + 8, hx - 41, hy - 2);
  ctx.bezierCurveTo(hx - 40, hy - 18, hx - 24, hy - 32, hx, hy - 32);
  ctx.closePath();
};

function rimPuffs(ctx, P, from, to) {
  const spots = [];
  for (let a = from; a <= to + 0.001; a += 0.1) spots.push([Math.cos(a) * 74, Math.sin(a) * 13, (Math.sin(a * 23) + 1) * 0.5]);
  ctx.strokeStyle = P.edge;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1;
  spots.forEach(([x, y, k]) => {
    ctx.beginPath();
    ctx.arc(x, y, 6.6 + k * 1.2, 0, TAU);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  spots.forEach(([x, y, k]) => {
    ctx.beginPath();
    ctx.arc(x, y, 6.2 + k * 1.1, 0, TAU);
    ctx.fillStyle = rad(ctx, x - 2, y - 3, 1, x, y, 8, [[0, P.cream[0]], [1, P.cream[1]]]);
    ctx.fill();
  });
}

function eye(ctx, P, { x, y, side, mode, look, alarmed }) {
  const rx = 11.5;
  const ry = alarmed ? 12.5 : 11;
  if (mode === "shut" || mode === "happy") {
    ctx.strokeStyle = P.lid;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (mode === "happy") {
      ctx.moveTo(x - 9, y + 3);
      ctx.quadraticCurveTo(x, y - 8, x + 9, y + 3);
    } else {
      ctx.moveTo(x - 9, y - 1);
      ctx.quadraticCurveTo(x, y + 6, x + 9, y - 1);
    }
    ctx.stroke();
    return;
  }
  const half = mode === "tired";
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = "#0b0a10";
  ctx.fill();
  ctx.clip();
  if (half) {
    ctx.beginPath();
    ctx.rect(x - 14, y + 1, 28, 14);
    ctx.clip();
  }
  const ix = x + look * 2.2;
  if (side > 0) {
    ctx.beginPath();
    ctx.arc(ix, y, 10.4, 0, TAU);
    ctx.fillStyle = rad(ctx, ix, y - 1, 1, ix, y, 10.6, [[0, "#f6ffa8"], [0.5, "#b3dd4f"], [0.88, "#5e9a2d"], [1, "#2c5a1a"]]);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      ctx.beginPath();
      ctx.moveTo(ix + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4);
      ctx.lineTo(ix + Math.cos(a) * 9.4, y + Math.sin(a) * 9.4);
      ctx.stroke();
    }
    const px = mode === "sad" ? 4.8 : alarmed ? 1.7 : half ? 3 : 2.6;
    ctx.beginPath();
    ctx.ellipse(ix, y, px, 8.8, 0, 0, TAU);
    ctx.fillStyle = "#050408";
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(ix, y, 10.6, 0, TAU);
    ctx.fillStyle = rad(ctx, ix, y - 1, 1, ix, y, 10.8, [[0, "#fbfeff"], [0.55, "#d6e7ef"], [0.9, "#9ebbca"], [1, "#6f8fa3"]]);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(ix - 1, y + 1, 5.2, 0.4, 2.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ix + 2, y - 1, 7, 3.6, 5.4);
    ctx.stroke();
    ctx.fillStyle = rad(ctx, ix, y + 1, 0, ix, y + 1, 4.2, [[0, "rgba(40,66,90,0.4)"], [1, "rgba(40,66,90,0)"]]);
    ctx.beginPath();
    ctx.arc(ix, y + 1, 4.2, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x - 4, y - 4.4, mode === "sad" ? 3.4 : 2.8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.arc(x + 4, y + 4, 1.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y - ry, 0, y - 3, [[0, "rgba(0,0,0,0.6)"], [1, "rgba(0,0,0,0)"]]);
  ctx.fillRect(x - 14, y - ry, 28, ry);
  ctx.restore();
  if (half) {
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 11, y + 1);
    ctx.lineTo(x + 11, y + 1);
    ctx.stroke();
  }
}

function drawTinto(ctx, { ox, oy, s = 1, t, face, anim = null, alarmed = false, night = false, tail = true }) {
  const P = pal(night);
  const asleep = face === "dormido";
  const sad = face === "triste" || face === "hambriento";
  const tired = face === "cansado";
  const down = sad || tired;
  let hop = 0;
  let shake = 0;
  if (anim && anim.kind === "love") hop = Math.abs(Math.sin(anim.t * 6)) * 9;
  else if (anim && anim.kind === "no") shake = Math.sin(anim.t * 22) * 3;
  else if (face === "contento" && t % 3 < 0.5) hop = Math.sin(((t % 3) / 0.5) * Math.PI) * 11;
  const breathe = Math.sin(t * (asleep ? 1.3 : 2.1));
  const hx = shake;
  const hy = -58 + breathe * (asleep ? 1.6 : 1) - hop + (asleep ? 30 : down ? 4 : 0);
  const happy = Boolean(anim && anim.kind === "love") || (face === "contento" && hop > 1);
  const eating = Boolean(anim && anim.kind === "eat");
  const chew = eating && Math.floor(anim.t * 4) % 2 === 0;
  const blink = !asleep && t % 4 < 0.14;
  const look = asleep || alarmed ? 0 : Math.sin(t * 0.8);
  const yawn = tired && t % 6 < 1.4;
  const twitch = !down && !asleep && !alarmed && t % 5.3 < 0.2;
  const furFill = (y0, y1) => lin(ctx, 0, y0, 0, y1, [[0, FUR[0]], [0.5, FUR[1]], [1, FUR[2]]]);
  const rimLight = (x0, x1, a = 1) => lin(ctx, x0, 0, x1, 0, [[0, `rgba(${P.rim},${P.rimA * a})`], [0.35, `rgba(${P.rim},${P.rimA * 0.12 * a})`], [1, "rgba(0,0,0,0)"]]);

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);

  blob(ctx, 0, 38, 84, 9, P.shadow);

  if (tail) {
    const sw = asleep ? 0 : Math.sin(t * 1.8) * 5;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(58, 14);
      ctx.bezierCurveTo(90, 10, 100 + sw, -16, 90 + sw * 1.4, -44);
      ctx.quadraticCurveTo(88 + sw * 1.4, -54, 80 + sw * 1.2, -52);
    };
    ctx.lineCap = "round";
    path();
    ctx.lineWidth = 12;
    ctx.strokeStyle = FUR[1];
    ctx.stroke();
    path();
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = `rgba(${P.rim},${0.55 * P.rimA})`;
    ctx.save();
    ctx.translate(-2.6, 0);
    ctx.stroke();
    ctx.restore();
  }

  // Cesta: cuerpo acolchado, interior y el borde de atrás.
  ctx.beginPath();
  ctx.moveTo(-74, 0);
  ctx.bezierCurveTo(-76, 26, -48, 36, 0, 36);
  ctx.bezierCurveTo(48, 36, 76, 26, 74, 0);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 0, 0, 36, [[0, P.cream[0]], [1, P.cream[1]]]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = P.edge;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.3;
  [-56, -28, 0, 28, 56].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x * 1.02, 8);
    ctx.quadraticCurveTo(x * 1.06, 22, x * 0.86, 36);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = lin(ctx, 0, 14, 0, 36, [[0, "rgba(0,0,0,0)"], [1, P.shadow]]);
  ctx.fillRect(-80, 14, 160, 24);
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(0, 0, 70, 11, 0, 0, TAU);
  ctx.fillStyle = lin(ctx, 0, -11, 0, 11, [[0, P.inner[0]], [1, P.inner[1]]]);
  ctx.fill();
  rimPuffs(ctx, P, Math.PI, TAU);

  // Pecho y cuello.
  ctx.beginPath();
  ctx.moveTo(-25, hy + 22);
  ctx.bezierCurveTo(-27, hy + 40, -33, -10, -35, 14);
  ctx.lineTo(35, 14);
  ctx.bezierCurveTo(33, -10, 27, hy + 40, 25, hy + 22);
  ctx.closePath();
  ctx.fillStyle = furFill(hy + 20, 14);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = rimLight(-36, 8, 0.9);
  ctx.fillRect(-40, hy, 80, 40);
  ctx.fillStyle = rad(ctx, 0, hy + 34, 0, 0, hy + 34, 18, [[0, "rgba(120,86,76,0.3)"], [1, "rgba(120,86,76,0)"]]);
  ctx.fillRect(-30, hy + 14, 60, 40);
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;
  [-13, 13].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, -22);
    ctx.lineTo(x * 0.9, 12);
    ctx.stroke();
  });
  ctx.restore();

  // Orejas: grandes, con el interior rosa.
  const ear = (side) => {
    const flop = alarmed ? 0.02 : down || asleep ? 0.78 : 0.26;
    const tilt = side * flop + (twitch && side > 0 ? -0.32 : 0);
    const k = alarmed ? 1.1 : down || asleep ? 0.86 : 1;
    ctx.save();
    ctx.translate(hx + side * 27, hy - 20);
    ctx.rotate(tilt);
    ctx.scale(k, k);
    ctx.beginPath();
    ctx.moveTo(-19, 8);
    ctx.bezierCurveTo(-22, -14, -15, -36, -5, -49);
    ctx.quadraticCurveTo(0, -55, 6, -49);
    ctx.bezierCurveTo(15, -36, 22, -14, 19, 8);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, -52, 0, 8, [[0, FUR[0]], [1, FUR[2]]]);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = lin(ctx, -22 * side, 0, 12 * side, 0, [[0, `rgba(${P.rim},${P.rimA * 0.8})`], [0.4, `rgba(${P.rim},${P.rimA * 0.1})`], [1, "rgba(0,0,0,0)"]]);
    ctx.fillRect(-24, -56, 48, 66);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(-11, 7);
    ctx.bezierCurveTo(-13, -10, -9, -26, -3, -35);
    ctx.quadraticCurveTo(0, -39, 3.4, -35);
    ctx.bezierCurveTo(9, -26, 13, -10, 11, 7);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, -38, 0, 7, [[0, "#f6b9cb"], [0.6, "#d489a1"], [1, "#7c4560"]]);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,235,240,0.5)";
    ctx.lineWidth = 0.9;
    [[-5, 2, -4, -12], [0, 4, 0, -16], [5, 2, 4, -12]].forEach(([a, b, c, d]) => {
      ctx.beginPath();
      ctx.moveTo(a, b);
      ctx.lineTo(c, d);
      ctx.stroke();
    });
    ctx.restore();
  };
  ear(-1);
  ear(1);

  // Cabeza.
  ctx.save();
  if (asleep) {
    ctx.translate(hx, hy);
    ctx.rotate(0.07);
    ctx.translate(-hx, -hy);
  }
  headPath(ctx, hx, hy);
  ctx.fillStyle = rad(ctx, hx - 12, hy - 16, 4, hx, hy, 60, [[0, FUR[0]], [0.5, FUR[1]], [1, FUR[2]]]);
  ctx.fill();
  ctx.save();
  headPath(ctx, hx, hy);
  ctx.clip();
  ctx.fillStyle = rimLight(hx - 42, hx + 6);
  ctx.fillRect(hx - 48, hy - 36, 96, 74);
  ctx.fillStyle = rad(ctx, hx + 20, hy + 12, 0, hx + 20, hy + 12, 24, [[0, "rgba(130,86,74,0.28)"], [1, "rgba(130,86,74,0)"]]);
  ctx.fillRect(hx - 6, hy - 14, 56, 56);
  ctx.fillStyle = rad(ctx, hx - 14, hy - 20, 0, hx - 14, hy - 20, 22, [[0, "rgba(160,170,230,0.22)"], [1, "rgba(160,170,230,0)"]]);
  ctx.fillRect(hx - 40, hy - 40, 60, 50);
  ctx.fillStyle = lin(ctx, 0, hy + 8, 0, hy + 34, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.34)"]]);
  ctx.fillRect(hx - 48, hy + 8, 96, 30);
  ctx.strokeStyle = "rgba(255,255,255,0.075)";
  ctx.lineWidth = 0.9;
  ctx.lineCap = "round";
  FURSTROKES.forEach((f) => {
    ctx.beginPath();
    ctx.moveTo(hx + f.x, hy + f.y);
    ctx.quadraticCurveTo(hx + f.x + Math.cos(f.a + 0.5) * f.l * 0.6, hy + f.y + Math.sin(f.a + 0.5) * f.l * 0.6, hx + f.x + Math.cos(f.a) * f.l, hy + f.y + Math.sin(f.a) * f.l);
    ctx.stroke();
  });
  ctx.restore();
  headPath(ctx, hx, hy);
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = rimLight(hx - 44, hx + 2, 0.8);
  ctx.stroke();

  // Mejillas.
  const blush = happy ? 0.34 : 0.14;
  [-1, 1].forEach((side) => {
    ctx.fillStyle = rad(ctx, hx + side * 27, hy + 12, 0, hx + side * 27, hy + 12, 10, [[0, `rgba(255,120,150,${blush})`], [1, "rgba(255,120,150,0)"]]);
    ctx.fillRect(hx + side * 27 - 12, hy, 24, 24);
  });

  // Ojos.
  const mode = asleep || blink ? "shut" : happy ? "happy" : tired ? "tired" : sad ? "sad" : "open";
  eye(ctx, P, { x: hx - 19, y: hy - 3, side: -1, mode, look, alarmed });
  eye(ctx, P, { x: hx + 19, y: hy - 3, side: 1, mode, look, alarmed });
  if (sad) {
    ctx.strokeStyle = P.lid;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(hx + side * 30, hy - 17);
      ctx.lineTo(hx + side * 11, hy - 20.5);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  // Nariz, boca y bigotes.
  ctx.save();
  ctx.translate(hx, hy + 9);
  ctx.beginPath();
  ctx.moveTo(-4.6, -2);
  ctx.quadraticCurveTo(0, -4.4, 4.6, -2);
  ctx.quadraticCurveTo(4, 2, 0, 5);
  ctx.quadraticCurveTo(-4, 2, -4.6, -2);
  ctx.fillStyle = lin(ctx, 0, -4, 0, 5, [[0, "#e79bb0"], [1, "#9c566b"]]);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-1.2, -2, 1.5, 0.8, -0.3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = P.lid;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.lineTo(0, 8);
  ctx.stroke();
  const mouthOpen = (w, h, tongue = true) => {
    ctx.beginPath();
    ctx.ellipse(0, 12 + h / 2 - 1, w, h, 0, 0, TAU);
    ctx.fillStyle = "#4d1727";
    ctx.fill();
    if (tongue) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = "#e07a96";
      ctx.beginPath();
      ctx.ellipse(0, 12 + h + 1, w * 0.7, h * 0.5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  };
  if (alarmed) mouthOpen(3.2, 4, false);
  else if (yawn) mouthOpen(6.5, 8);
  else if (chew) mouthOpen(4.4, 3.4);
  else if (happy) mouthOpen(6, 5);
  else {
    ctx.beginPath();
    if (sad) {
      ctx.moveTo(-8, 15.5);
      ctx.quadraticCurveTo(-4, 9.6, 0, 11.6);
      ctx.quadraticCurveTo(4, 9.6, 8, 15.5);
    } else if (asleep || tired) {
      ctx.moveTo(-5, 12);
      ctx.quadraticCurveTo(0, 14.6, 5, 12);
    } else {
      ctx.moveTo(-9, 10.6);
      ctx.quadraticCurveTo(-5, 16, 0, 9);
      ctx.quadraticCurveTo(5, 16, 9, 10.6);
    }
    ctx.stroke();
  }
  ctx.restore();
  [[-1, [[-13, 14, -49, 5, -31, 7], [-13, 16, -52, 15, -32, 14], [-13, 18, -48, 25, -31, 21]]], [1, [[13, 14, 49, 5, 31, 7], [13, 16, 52, 15, 32, 14], [13, 18, 48, 25, 31, 21]]]].forEach(([, list]) => {
    list.forEach(([x0, y0, x1, y1, cx0, cy0]) => {
      for (const [color, width] of [[P.whiskerShadow, 1.9], [P.whisker, 0.9]]) {
        ctx.beginPath();
        ctx.moveTo(hx + x0, hy + y0);
        ctx.quadraticCurveTo(hx + cx0, hy + cy0 - 3, hx + x1, hy + y1);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
      }
    });
  });
  ctx.restore();

  // Borde delantero de la cesta y las patas encima.
  ctx.beginPath();
  ctx.ellipse(0, 0, 74, 13, 0, 0, Math.PI);
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.strokeStyle = lin(ctx, 0, 0, 0, 14, [[0, P.cream[0]], [1, P.cream[1]]]);
  ctx.stroke();
  rimPuffs(ctx, P, 0, Math.PI);
  const paw = (px, py) => {
    ctx.beginPath();
    ctx.ellipse(px, py, 11, 8, 0, 0, TAU);
    ctx.fillStyle = lin(ctx, 0, py - 8, 0, py + 8, [[0, FUR[0]], [1, FUR[2]]]);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = rimLight(px - 12, px + 4, 0.7);
    ctx.fillRect(px - 12, py - 8, 24, 16);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 0.9;
    [-3.4, 3.4].forEach((d) => {
      ctx.beginPath();
      ctx.moveTo(px + d, py + 1);
      ctx.lineTo(px + d, py + 7);
      ctx.stroke();
    });
    ctx.strokeStyle = "#f1ecf7";
    ctx.lineWidth = 1.1;
    [-5.6, 0, 5.6].forEach((d) => {
      ctx.beginPath();
      ctx.moveTo(px + d - 0.6, py + 8);
      ctx.quadraticCurveTo(px + d, py + 11.4, px + d + 0.8, py + 10.4);
      ctx.stroke();
    });
  };
  const pawX = asleep ? 13 : 17;
  paw(-pawX, asleep ? 6 : 4);
  paw(pawX, asleep ? 6 : 4);

  // Efectos.
  if (eating) {
    const k = clamp01(anim.t / 1.8);
    const left = 1 - 0.6 * clamp01((anim.t - 1.2) / 1.2);
    if (anim.t < 2.4) apple(ctx, lerp(70, hx + 8, k), lerp(-22, hy + 22, k), 0.95 * left);
  }
  if (anim && anim.kind === "love")
    [0, 1, 2].forEach((i) => {
      const rise = (anim.t * 26 + i * 9) % 30;
      ctx.globalAlpha = 1 - rise / 34;
      heart(ctx, hx + (i - 1) * 24, hy - 44 - rise, 1 + (i === 1 ? 0.2 : 0));
      ctx.globalAlpha = 1;
    });
  if (asleep)
    [0, 1, 2].forEach((i) => {
      const rise = (t * 8 + i * 11) % 32;
      ctx.globalAlpha = 1 - rise / 36;
      text(ctx, "z", hx + 46 + i * 7, hy - 30 - rise, { size: 11 + i * 3, color: night ? "#9bbcff" : "#6f98ee", weight: 800 });
      ctx.globalAlpha = 1;
    });
  if (tired && !yawn) {
    const drop = (t * 9) % 9;
    ctx.fillStyle = "rgba(120,190,255,0.85)";
    ctx.beginPath();
    ctx.moveTo(hx + 38, hy - 22 + drop);
    ctx.quadraticCurveTo(hx + 41.5, hy - 17 + drop, hx + 38, hy - 14 + drop);
    ctx.quadraticCurveTo(hx + 34.5, hy - 17 + drop, hx + 38, hy - 22 + drop);
    ctx.fill();
  }
  if (face === "hambriento" && !anim) {
    soft(ctx, 5, 2, P.shadow, () => {
      rr(ctx, hx + 70, hy - 14, 36, 32, 11);
      ctx.fillStyle = P.glass;
      ctx.fill();
    });
    ctx.beginPath();
    ctx.moveTo(hx + 72, hy + 2);
    ctx.lineTo(hx + 62, hy + 8);
    ctx.lineTo(hx + 74, hy + 12);
    ctx.fillStyle = P.glass;
    ctx.fill();
    apple(ctx, hx + 88, hy + 2, 0.8);
  }
  if (alarmed) {
    soft(ctx, 6, 0, "rgba(255,200,40,0.8)", () => {
      rr(ctx, hx - 62, hy - 52, 7, 22, 3.5);
      ctx.fillStyle = "#ffcc33";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hx - 58.5, hy - 23, 3.8, 0, TAU);
      ctx.fill();
    });
  }
  ctx.restore();
}

// ───────────────────────── pantallas ─────────────────────────
function hud(ctx, P, pet, night) {
  const now = new Date(pet.now);
  text(ctx, `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`, 22, 22, { size: 24, color: P.ink, weight: 800 });
  if (pet.phone) {
    const low = pet.phone.level <= LOW.phone && !pet.phone.charging;
    const tone = low ? "#e5484d" : pet.phone.charging ? "#30a46c" : P.ink;
    soft(ctx, 4, 1, P.shadow, () => {
      rr(ctx, 142, 10, 86, 24, 12);
      ctx.fillStyle = P.pill;
      ctx.fill();
    });
    battery(ctx, 152, 16, pet.phone.level, tone, P.ink, pet.phone.charging);
    text(ctx, `${pet.phone.level}%`, 220, 22, { size: 13, color: low ? "#e5484d" : P.ink, align: "right", weight: 800 });
  } else {
    rr(ctx, 142, 10, 86, 24, 12);
    ctx.fillStyle = P.pill;
    ctx.fill();
    text(ctx, "móvil —", 185, 22, { size: 11.5, color: P.soft, align: "center", weight: 700 });
  }
  const left = energy(pet);
  const fillA = left <= LOW.energy ? ["#ff9a9a", "#e5484d"] : left <= 50 ? ["#ffd778", "#f0a030"] : ["#8fe39a", "#3fb26a"];
  text(ctx, "CLAUDE", 22, 46, { size: 9.5, color: P.soft, weight: 800, spacing: 0.6 });
  rr(ctx, 78, 42, 112, 8, 4);
  ctx.fillStyle = night ? "rgba(255,255,255,0.12)" : "rgba(60,40,20,0.12)";
  ctx.fill();
  if (pet.claude && left > 0) {
    rr(ctx, 78, 42, Math.max(8, (112 * left) / 100), 8, 4);
    ctx.fillStyle = lin(ctx, 0, 42, 0, 50, [[0, fillA[0]], [1, fillA[1]]]);
    ctx.fill();
  }
  text(ctx, pet.claude ? `${left}%` : "—", 228, 46, { size: 11.5, color: left <= LOW.energy ? "#e5484d" : P.ink, align: "right", weight: 800 });
}

function card(ctx, P, alert) {
  const enter = clamp01((ALERT_SECONDS - alert.left) / 0.3);
  const y = 54 - (1 - enter) * 26;
  ctx.save();
  ctx.globalAlpha = enter;
  soft(ctx, 10, 4, P.shadow, () => {
    rr(ctx, 12, y, 216, 46, 16);
    ctx.fillStyle = P.glass;
    ctx.fill();
  });
  const tone = alert.kind === "cal" ? ["#ffd778", "#f0a030"] : alert.kind === "phone" ? ["#ff9a9a", "#e5484d"] : ["#d9b7ff", "#8f5be0"];
  ctx.beginPath();
  ctx.arc(37, y + 23, 15, 0, TAU);
  ctx.fillStyle = lin(ctx, 0, y + 8, 0, y + 38, [[0, tone[0]], [1, tone[1]]]);
  ctx.fill();
  if (alert.kind === "cal") bell(ctx, 37, y + 22, 1, "#fff");
  else if (alert.kind === "phone") battery(ctx, 26, y + 17, 20, "#fff", "#fff", false);
  else star(ctx, 37, y + 23, 8, 0, false);
  text(ctx, alert.top, 60, y + 14, { size: 9.5, color: P.soft, weight: 800, spacing: 1.1 });
  text(ctx, alert.text, 60, y + 31, { size: 14.5, color: P.ink, weight: 800, max: 158 });
  ctx.restore();
}

function whisperPill(ctx, P, string) {
  ctx.font = `800 12px ${FONT}`;
  const width = Math.min(210, ctx.measureText(string).width + 26);
  soft(ctx, 5, 1.5, P.shadow, () => {
    rr(ctx, 120 - width / 2, 217, width, 22, 11);
    ctx.fillStyle = P.pill;
    ctx.fill();
  });
  text(ctx, string, 120, 228.5, { size: 12, color: P.ink, align: "center", weight: 800, max: 196 });
}

function menu(ctx, P, selected, pet) {
  MENU.forEach((name, i) => {
    const cx = SLOTS[i];
    const cy = BAR.y + BAR.size / 2;
    const on = i === selected;
    const size = BAR.size * (on ? 1.1 : 1);
    ctx.save();
    soft(ctx, on ? 9 : 4, on ? 3 : 1.5, on ? "rgba(255,255,255,0.65)" : P.shadow, () => {
      rr(ctx, cx - size / 2, cy - size / 2, size, size, 12);
      ctx.fillStyle = on ? P.glass : P.btn;
      ctx.fill();
    });
    rr(ctx, cx - size / 2, cy - size / 2, size, size, 12);
    ctx.lineWidth = on ? 2 : 1;
    ctx.strokeStyle = on ? "#ffffff" : P.btnLine;
    ctx.stroke();
    icon(ctx, name === "dormir" && sleeping(pet) ? "dormir" : name, cx, cy, on ? 1.05 : 0.95);
    ctx.restore();
  });
}

function home(ctx, view) {
  const { pet, t } = view;
  const night = sleeping(pet);
  const P = pal(night);
  scene(ctx, P, night, t);
  tree(ctx, P, t);
  drawTinto(ctx, { ox: 120, oy: 180, t, face: feeling(pet), anim: pet.anim, alarmed: Boolean(pet.alert) && !night, night });
  hud(ctx, P, pet, night);
  if (pet.alert) card(ctx, P, pet.alert);
  whisperPill(ctx, P, whisper(pet));
  menu(ctx, P, view.menu, pet);
}

function meter(ctx, P, label, value, y, note, colors) {
  text(ctx, label, 26, y, { size: 10, color: P.soft, weight: 800, spacing: 1 });
  text(ctx, note, 214, y, { size: 12, color: P.ink, align: "right", weight: 800 });
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

function info(ctx, { pet, t }) {
  const P = DAY;
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#f8f5ff"], [1, "#e9e3f6"]]);
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath();
  ctx.arc(196, 30, 24, 0, TAU);
  ctx.clip();
  ctx.fillStyle = "#e4dcf5";
  ctx.fillRect(170, 0, 50, 60);
  drawTinto(ctx, { ox: 196, oy: 56, s: 0.42, t, face: feeling(pet), night: false, tail: false });
  ctx.restore();
  text(ctx, NAME, 26, 28, { size: 24, color: P.ink, weight: 800 });
  text(ctx, feeling(pet), 26, 48, { size: 12, color: P.soft, weight: 700 });
  const good = ["#8fe39a", "#3fb26a"];
  const bad = ["#ff9a9a", "#e5484d"];
  meter(ctx, P, "HAMBRE", pet.fullness, 70, `${Math.round(pet.fullness)} %`, pet.fullness <= LOW.fullness ? bad : good);
  meter(ctx, P, "ÁNIMO", pet.mood, 106, `${Math.round(pet.mood)} %`, pet.mood <= LOW.mood ? bad : ["#ffd778", "#f0a030"]);
  meter(ctx, P, "ENERGÍA · CLAUDE", energy(pet), 142, pet.claude ? `${energy(pet)} % libre` : "sin datos", energy(pet) <= LOW.energy ? bad : ["#d9b7ff", "#8f5be0"]);
  meter(ctx, P, "MÓVIL", pet.phone ? pet.phone.level : 0, 178, pet.phone ? `${pet.phone.level} %${pet.phone.charging ? " cargando" : ""}` : "sin datos", pet.phone && pet.phone.level <= LOW.phone ? bad : ["#8fb4ff", "#4f7fe0"]);
  rr(ctx, 20, 216, 200, 40, 14);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fill();
  const next = pet.events.find((event) => !event.rung);
  text(ctx, "EDAD", 34, 228, { size: 9.5, color: P.soft, weight: 800, spacing: 1 });
  text(ctx, age(pet), 34, 243, { size: 13, color: P.ink, weight: 800 });
  text(ctx, "PRÓXIMO", 100, 228, { size: 9.5, color: P.soft, weight: 800, spacing: 1 });
  text(ctx, next ? `${next.title} · ${Math.max(1, Math.round((next.at - pet.now) / 60000))} min` : "nada", 100, 243, { size: 13, color: P.ink, weight: 800, max: 112 });
  text(ctx, "toca o pulsa BOOT para volver", 120, 268, { size: 10, color: P.soft, align: "center", weight: 700 });
}

function sky(ctx, t) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#1b2150"], [0.7, "#161b3a"], [1, "#10142c"]]);
  ctx.fillRect(0, 0, W, H);
  STARS.forEach(([x, y, r], i) => {
    ctx.fillStyle = `rgba(255,236,170,${0.35 + 0.4 * Math.sin(t * 1.6 + i * 1.7)})`;
    ctx.beginPath();
    ctx.arc(x, y + 14, r, 0, TAU);
    ctx.fill();
  });
}

function game(ctx, { game: play, t }) {
  sky(ctx, t);
  LANES.forEach((x) => {
    rr(ctx, x - 26, 56, 52, 176, 16);
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    ctx.fill();
  });
  star(ctx, 30, 24, 9, 0, false);
  text(ctx, String(play.caught), 44, 25, { size: 18, color: "#ffd75e", weight: 800 });
  const left = clamp01(1 - play.t / GAME.seconds);
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.beginPath();
  ctx.arc(206, 25, 13, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "#8fb4ff";
  ctx.beginPath();
  ctx.arc(206, 25, 13, -Math.PI / 2, -Math.PI / 2 + TAU * left);
  ctx.stroke();
  text(ctx, String(Math.max(0, Math.ceil(GAME.seconds - play.t))), 206, 25.5, { size: 11, color: "#eef0ff", align: "center", weight: 800 });
  for (const item of play.stars) star(ctx, LANES[item.lane], 58 + item.y * 156, 11, t * 2 + item.lane, true);
  drawTinto(ctx, { ox: LANES[play.lane], oy: 236, s: 0.52, t, face: "contento", night: true, tail: false });
  text(ctx, "toca un carril · PWR mueve", 120, 270, { size: 10, color: NIGHT.soft, align: "center", weight: 700 });
}

function result(ctx, { game: play, t }) {
  sky(ctx, t);
  drawTinto(ctx, { ox: 120, oy: 178, t, face: play.caught ? "contento" : "triste", anim: play.caught ? { kind: "love", t } : null, night: true, tail: false });
  text(ctx, play.caught === 1 ? "¡1 estrella!" : `¡${play.caught} estrellas!`, 120, 240, { size: 22, color: "#ffd75e", align: "center", weight: 800 });
  text(ctx, play.caught ? `${NAME} está más contento` : "Otra vez será", 120, 262, { size: 12, color: "#dfe3ff", align: "center", weight: 700 });
}

export function drawScreen(ctx, view) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, W, H);
  if (view.off) {
    ctx.fillStyle = "#050507";
    ctx.fillRect(0, 0, W, H);
    return;
  }
  ({ home, info, game, result })[view.screen](ctx, view);
}
