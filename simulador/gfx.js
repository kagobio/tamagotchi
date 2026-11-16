// Ayudantes de dibujo: colores, degradados, texto, sombras e iconos. Todo se dibuja a SCALE veces la resolución de 240 × 280.

export const SCALE = 3;
export const W = 240;
export const H = 280;

export const FONT = '"Nunito", ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
export const TAU = Math.PI * 2;
export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const lerp = (a, b, k) => a + (b - a) * k;

export const DAY = {
  wall: ["#f8f2e9", "#ebe0cf"], shaft: "rgba(255,255,255,0.5)", vignette: "rgba(90,55,20,0.13)",
  base: ["#aa7850", "#7c5134"], floor: ["#e2b07a", "#b47849"], seam: "rgba(105,62,30,0.30)", gloss: "rgba(255,255,255,0.22)",
  cream: ["#fffaf0", "#e9dcc2"], inner: ["#c6b48e", "#e4d7bb"], edge: "#c9b794",
  sisal: "#dcc590", sisalDark: "#b2935a", sisalLight: "#f1e0b0", string: "#bfb299",
  rim: "176,190,255", rimA: 0.55,
  ink: "#2b2438", soft: "#7b7589", pill: "rgba(255,255,255,0.86)", glass: "rgba(255,255,255,0.96)",
  btn: "rgba(255,255,255,0.30)", btnLine: "rgba(255,255,255,0.5)", shadow: "rgba(60,34,14,0.30)",
  whisker: "#f6f3fb", whiskerShadow: "rgba(0,0,0,0.32)", lid: "#b4b0d2",
};
export const NIGHT = {
  wall: ["#232b55", "#161b37"], shaft: "rgba(150,180,255,0.11)", vignette: "rgba(0,0,22,0.4)",
  base: ["#2f2c4e", "#1f1c37"], floor: ["#31406a", "#1c2444"], seam: "rgba(8,10,28,0.5)", gloss: "rgba(150,180,255,0.09)",
  cream: ["#6e6e98", "#4b4b70"], inner: ["#2c2c4a", "#41416a"], edge: "#3a3a5d",
  sisal: "#7d7862", sisalDark: "#58543f", sisalLight: "#979278", string: "#6e6c8c",
  rim: "150,178,255", rimA: 0.95,
  ink: "#eef0ff", soft: "#a6aacd", pill: "rgba(32,38,74,0.86)", glass: "rgba(40,46,88,0.96)",
  btn: "rgba(255,255,255,0.09)", btnLine: "rgba(255,255,255,0.16)", shadow: "rgba(0,0,10,0.55)",
  whisker: "#dad8ef", whiskerShadow: "rgba(0,0,0,0.5)", lid: "#9d9abf",
};
export const pal = (night) => (night ? NIGHT : DAY);
export const FUR = ["#403d50", "#27242f", "#14121a"];

export const lin = (ctx, x0, y0, x1, y1, stops) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  return g;
};
export const rad = (ctx, x0, y0, r0, x1, y1, r1, stops) => {
  const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  return g;
};
export const rr = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};
export const soft = (ctx, blur, dy, color, draw) => {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * SCALE;
  ctx.shadowOffsetY = dy * SCALE;
  draw();
  ctx.restore();
};
// Una sombra elíptica difusa, sin filtros: un degradado radial aplastado.
export const blob = (ctx, x, y, rx, ry, color) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = rad(ctx, 0, 0, 0, 0, 0, rx, [[0, color], [1, "rgba(0,0,0,0)"]]);
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
};
export const text = (ctx, string, x, y, { size = 12, color = "#000", align = "left", weight = 700, max = 0, spacing = 0 } = {}) => {
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
export function heart(ctx, x, y, s, color = "#ff6f91") {
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

export function star(ctx, x, y, r, spin = 0, glow = true) {
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

export function apple(ctx, x, y, s) {
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

export function moon(ctx, x, y, r, color = "#9bbcff") {
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

export function bars(ctx, x, y, s) {
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

export function icon(ctx, name, x, y, s = 1) {
  if (name === "tienda") bag(ctx, x, y, s * 0.95);
  else if (name === "comer") apple(ctx, x, y + 1, s * 0.95);
  else if (name === "jugar") star(ctx, x, y + 1, 11 * s, 0, false);
  else if (name === "dormir") moon(ctx, x, y, 11 * s);
  else bars(ctx, x, y - 1, s * 0.85);
}

export function bell(ctx, x, y, s, color) {
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

export function battery(ctx, x, y, level, color, ink, bolt) {
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


// ───────── iconos de los juegos y de la interfaz ─────────
export function gameIcon(ctx, id, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (id === "estrellas") star(ctx, 0, 0, 11, 0, false);
  else if (id === "laser") {
    soft(ctx, 8, 0, "rgba(255,60,60,0.9)", () => {
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, TAU);
      ctx.fillStyle = "#ff4d4d";
      ctx.fill();
    });
    ctx.beginPath();
    ctx.arc(0, 0, 2.4, 0, TAU);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,90,90,0.8)";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 9);
      ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
      ctx.stroke();
    }
  } else if (id === "laberinto") {
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, TAU);
    ctx.fillStyle = rad(ctx, -3, -3, 1, 0, 0, 11, [[0, "#ff9cc4"], [1, "#e0589a"]]);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    for (const r of [3, 6, 8.5]) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0.5, 2.5);
      ctx.stroke();
    }
  } else if (id === "carrera") {
    ctx.strokeStyle = "#ff9f43";
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const dx of [-5, 3]) {
      ctx.beginPath();
      ctx.moveTo(dx - 3, -8);
      ctx.lineTo(dx + 4, 0);
      ctx.lineTo(dx - 3, 8);
      ctx.stroke();
    }
  } else if (id === "cajas") {
    rr(ctx, -10, -4, 20, 14, 2);
    ctx.fillStyle = lin(ctx, 0, -4, 0, 10, [[0, "#d9a566"], [1, "#b07a3e"]]);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-11, -4);
    ctx.lineTo(-6, -10);
    ctx.lineTo(6, -10);
    ctx.lineTo(11, -4);
    ctx.closePath();
    ctx.fillStyle = "#e6b878";
    ctx.fill();
    ctx.fillStyle = "rgba(255,240,210,0.7)";
    ctx.fillRect(-2, -10, 4, 20);
  } else if (id === "topos") {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * 6.5, -5, 4.6, 0, TAU);
      ctx.fillStyle = "#9aa0b0";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx * 6.5, -5, 2.6, 0, TAU);
      ctx.fillStyle = "#ffb3c4";
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 2, 8.6, 0, TAU);
    ctx.fillStyle = lin(ctx, 0, -6, 0, 10, [[0, "#b4bac8"], [1, "#8a91a3"]]);
    ctx.fill();
    ctx.fillStyle = "#2b2438";
    for (const sx of [-3, 3]) {
      ctx.beginPath();
      ctx.arc(sx, 0, 1.2, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 5, 1.8, 0, TAU);
    ctx.fillStyle = "#ff8aa8";
    ctx.fill();
  } else if (id === "simon") {
    [[-5.4, -5.4, "#ff6b6b"], [5.4, -5.4, "#5b9bff"], [-5.4, 5.4, "#58c96b"], [5.4, 5.4, "#ffd75e"]].forEach(([dx, dy, c]) => {
      ctx.beginPath();
      ctx.arc(dx, dy, 4.8, 0, TAU);
      ctx.fillStyle = c;
      ctx.fill();
    });
  } else if (id === "pesca") {
    ctx.beginPath();
    ctx.ellipse(-1, 0, 8.5, 5.6, 0, 0, TAU);
    ctx.moveTo(6, 0);
    ctx.lineTo(12, -5);
    ctx.lineTo(12, 5);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, -6, 0, 6, [[0, "#ffb347"], [1, "#ff7a3d"]]);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-5, -1.2, 1.3, 0, TAU);
    ctx.fillStyle = "#2b2438";
    ctx.fill();
  }
  ctx.restore();
}

export function bag(ctx, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = "#8f5be0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -4, 5, Math.PI, TAU);
  ctx.stroke();
  rr(ctx, -9.5, -4, 19, 16, 4);
  ctx.fillStyle = lin(ctx, 0, -4, 0, 12, [[0, "#c59bff"], [1, "#8f5be0"]]);
  ctx.fill();
  star(ctx, 0, 4, 4.4, 0, false);
  ctx.restore();
}

export function trophy(ctx, x, y, s, color = "#fff") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-6, -7);
  ctx.lineTo(6, -7);
  ctx.bezierCurveTo(6, 2, 3, 5, 0, 5);
  ctx.bezierCurveTo(-3, 5, -6, 2, -6, -7);
  ctx.fill();
  ctx.fillRect(-1.2, 4, 2.4, 4);
  ctx.fillRect(-4.5, 7.5, 9, 2.4);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx * 7, -3, 3, sx > 0 ? -1.4 : 1.7, sx > 0 ? 1.4 : 4.6);
    ctx.stroke();
  }
  ctx.restore();
}

export function check(ctx, x, y, s, color = "#fff", width = 2.4) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(-2, 4.5);
  ctx.lineTo(6, -5);
  ctx.stroke();
  ctx.restore();
}

export function lock(ctx, x, y, s, color = "#8a8499") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, -3, 4.5, Math.PI, TAU);
  ctx.stroke();
  rr(ctx, -7, -3, 14, 11, 3);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}
