// Tinto, su cesta y la interfaz de la pantalla de inicio (hora, avisos, menú).
import { ALERT_SECONDS, LOW, energy, feeling, sleeping, whisper } from "./pet.js";
import { basketTone, drawCollar, drawHat } from "./outfit.js";
import { drawScene, drawSurprise, drawTree } from "./room.js";
import { FUR, H, TAU, W, apple, bag, battery, bell, blob, check, clamp01, gameIcon, heart, icon, lerp, lin, moon, pal, rad, rr, soft, star, text, trophy } from "./gfx.js";

export const MENU = ["comer", "jugar", "tienda", "dormir", "estado"];
export const SLOTS = [32, 76, 120, 164, 208];
export const BAR = { y: 240, size: 34 };

// ───────────────────────── Tinto ─────────────────────────
// Un gatito negro de orejas enormes, el ojo izquierdo velado y el derecho verde, como en la foto.
// Se dibuja en coordenadas locales con el centro del borde de su cesta en (0, 0).
export const FURSTROKES = (() => {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 52 }, () => {
    const a = rnd() * TAU;
    const r = 8 + rnd() * 26;
    return { x: Math.cos(a) * r * 1.15, y: Math.sin(a) * r * 0.85, a, l: 4 + rnd() * 5 };
  });
})();

export const headPath = (ctx, hx, hy) => {
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

export function rimPuffs(ctx, P, from, to) {
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

export function eye(ctx, P, { x, y, side, mode, look, alarmed }) {
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

export function drawTinto(ctx, { ox, oy, s = 1, t, face, anim = null, alarmed = false, night = false, tail = true, headOnly = false, outfit = null, basket = "natural" }) {
  const P = pal(night);
  const B = basketTone(P, night, basket);
  const asleep = face === "dormido";
  const sad = face === "triste" || face === "hambriento";
  const tired = face === "cansado";
  const down = sad || tired;
  let hop = 0;
  let shake = 0;
  if (anim && anim.kind === "cheer") hop = Math.abs(Math.sin(anim.t * 7)) * 14;
  else if (anim && anim.kind === "love") hop = Math.abs(Math.sin(anim.t * 6)) * 9;
  else if (anim && anim.kind === "no") shake = Math.sin(anim.t * 22) * 3;
  else if (face === "contento" && t % 3 < 0.5) hop = Math.sin(((t % 3) / 0.5) * Math.PI) * 11;
  const breathe = Math.sin(t * (asleep ? 1.3 : 2.1));
  const hx = shake;
  const hy = -58 + breathe * (asleep ? 1.6 : 1) - hop + (asleep ? 30 : down ? 4 : 0);
  const happy = Boolean(anim && (anim.kind === "love" || anim.kind === "cheer")) || (face === "contento" && hop > 1);
  const eating = Boolean(anim && anim.kind === "eat");
  const chew = eating && Math.floor(anim.t * 4) % 2 === 0;
  const blink = !asleep && t % 4 < 0.14;
  const perk = Boolean(anim && anim.kind === "perk");
  const wide = alarmed || perk;
  const look = asleep || wide ? 0 : Math.sin(t * 0.8);
  const yawn = tired && t % 6 < 1.4;
  const twitch = !down && !asleep && !wide && t % 5.3 < 0.2;
  const furFill = (y0, y1) => lin(ctx, 0, y0, 0, y1, [[0, FUR[0]], [0.5, FUR[1]], [1, FUR[2]]]);
  const rimLight = (x0, x1, a = 1) => lin(ctx, x0, 0, x1, 0, [[0, `rgba(${P.rim},${P.rimA * a})`], [0.35, `rgba(${P.rim},${P.rimA * 0.12 * a})`], [1, "rgba(0,0,0,0)"]]);

  ctx.save();
  ctx.translate(ox, oy + (headOnly ? 58 * s : 0));
  ctx.scale(s, s);

  if (!headOnly) {
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
  ctx.fillStyle = lin(ctx, 0, 0, 0, 36, [[0, B.cream[0]], [1, B.cream[1]]]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = B.edge;
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
  ctx.fillStyle = lin(ctx, 0, -11, 0, 11, [[0, B.inner[0]], [1, B.inner[1]]]);
  ctx.fill();
  rimPuffs(ctx, B, Math.PI, TAU);

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

  }

  // Orejas: grandes, con el interior rosa.
  const ear = (side) => {
    const flop = wide ? 0.02 : down || asleep ? 0.78 : 0.26;
    const tilt = side * flop + (twitch && side > 0 ? -0.32 : 0);
    const k = wide ? 1.1 : down || asleep ? 0.86 : 1;
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
  eye(ctx, P, { x: hx - 19, y: hy - 3, side: -1, mode, look, alarmed: wide });
  eye(ctx, P, { x: hx + 19, y: hy - 3, side: 1, mode, look, alarmed: wide });
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
  if (outfit && outfit.collar) drawCollar(ctx, outfit.collar, hx, hy, t);
  if (outfit && outfit.hat) drawHat(ctx, outfit.hat, hx, hy);
  ctx.restore();

  if (!headOnly) {
  // Borde delantero de la cesta y las patas encima.
  ctx.beginPath();
  ctx.ellipse(0, 0, 74, 13, 0, 0, Math.PI);
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.strokeStyle = lin(ctx, 0, 0, 0, 14, [[0, B.cream[0]], [1, B.cream[1]]]);
  ctx.stroke();
  rimPuffs(ctx, B, 0, Math.PI);
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
  if (anim && anim.kind === "cheer")
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + anim.t * 2;
      const r = 36 + anim.t * 14;
      ctx.globalAlpha = clamp01(1 - anim.t / anim.length);
      star(ctx, hx + Math.cos(a) * r, hy - 10 + Math.sin(a) * r * 0.7, 3.6, anim.t * 3 + i, false);
      ctx.globalAlpha = 1;
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
  }
  ctx.restore();
}

// ───────────────────────── pantallas ─────────────────────────
export function hud(ctx, P, pet, night, meta) {
  const now = new Date(pet.now);
  text(ctx, `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`, 22, 22, { size: 24, color: P.ink, weight: 800 });
  if (meta) {
    soft(ctx, 4, 1, P.shadow, () => {
      rr(ctx, 92, 11, 44, 22, 11);
      ctx.fillStyle = P.pill;
      ctx.fill();
    });
    star(ctx, 103, 22, 6.2, 0, false);
    text(ctx, String(meta.stars), 112, 22.5, { size: String(meta.stars).length > 3 ? 10 : 12, color: P.ink, weight: 800, max: 22 });
  }
  if (pet.phone) {
    const low = pet.phone.level <= LOW.phone && !pet.phone.charging;
    const tone = low ? "#e5484d" : pet.phone.charging ? "#30a46c" : P.ink;
    soft(ctx, 4, 1, P.shadow, () => {
      rr(ctx, 144, 10, 84, 24, 12);
      ctx.fillStyle = P.pill;
      ctx.fill();
    });
    battery(ctx, 152, 16, pet.phone.level, tone, P.ink, pet.phone.charging);
    text(ctx, `${pet.phone.level}%`, 220, 22, { size: 13, color: low ? "#e5484d" : P.ink, align: "right", weight: 800 });
  } else {
    rr(ctx, 144, 10, 84, 24, 12);
    ctx.fillStyle = P.pill;
    ctx.fill();
    text(ctx, "móvil —", 186, 22, { size: 11.5, color: P.soft, align: "center", weight: 700 });
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

const CARD_TONES = { cal: ["#ffd778", "#f0a030"], phone: ["#ff9a9a", "#e5484d"], claude: ["#d9b7ff", "#8f5be0"], logro: ["#ffe27a", "#f0a030"], reto: ["#8fe39a", "#3fb26a"], regalo: ["#9bc4ff", "#4f7fe0"] };

export function card(ctx, P, alert) {
  const enter = clamp01((ALERT_SECONDS - alert.left) / 0.3);
  const y = 54 - (1 - enter) * 26;
  ctx.save();
  ctx.globalAlpha = enter;
  soft(ctx, 10, 4, P.shadow, () => {
    rr(ctx, 12, y, 216, 46, 16);
    ctx.fillStyle = P.glass;
    ctx.fill();
  });
  const tone = CARD_TONES[alert.kind] || CARD_TONES.claude;
  ctx.beginPath();
  ctx.arc(37, y + 23, 15, 0, TAU);
  ctx.fillStyle = lin(ctx, 0, y + 8, 0, y + 38, [[0, tone[0]], [1, tone[1]]]);
  ctx.fill();
  if (alert.kind === "cal") bell(ctx, 37, y + 22, 1, "#fff");
  else if (alert.kind === "phone") battery(ctx, 26, y + 17, 20, "#fff", "#fff", false);
  else if (alert.kind === "logro") trophy(ctx, 37, y + 22, 1.15, "#fff");
  else if (alert.kind === "reto") check(ctx, 37, y + 23, 1.4);
  else star(ctx, 37, y + 23, 8, 0, false);
  text(ctx, alert.top, 60, y + 14, { size: 9.5, color: P.soft, weight: 800, spacing: 1.1 });
  text(ctx, alert.text, 60, y + 31, { size: 14.5, color: P.ink, weight: 800, max: 158 });
  ctx.restore();
}

export function whisperPill(ctx, P, string) {
  ctx.font = `800 12px "Nunito", system-ui, sans-serif`;
  const width = Math.min(210, ctx.measureText(string).width + 26);
  soft(ctx, 5, 1.5, P.shadow, () => {
    rr(ctx, 120 - width / 2, 217, width, 22, 11);
    ctx.fillStyle = P.pill;
    ctx.fill();
  });
  text(ctx, string, 120, 228.5, { size: 12, color: P.ink, align: "center", weight: 800, max: 196 });
}

export function menu(ctx, P, selected, pet, badges = {}) {
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
    icon(ctx, name === "jugar" ? "jugar" : name, cx, cy, on ? 1 : 0.9);
    if (badges[name]) {
      ctx.beginPath();
      ctx.arc(cx + size / 2 - 3, cy - size / 2 + 3, 4.6, 0, TAU);
      ctx.fillStyle = "#ff4d5e";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
    }
    ctx.restore();
  });
}

function wantsBubble(ctx, P, id) {
  soft(ctx, 5, 2, P.shadow, () => {
    rr(ctx, 46, 118, 34, 32, 11);
    ctx.fillStyle = P.glass;
    ctx.fill();
  });
  ctx.beginPath();
  ctx.moveTo(78, 138);
  ctx.lineTo(86, 142);
  ctx.lineTo(78, 146);
  ctx.fillStyle = P.glass;
  ctx.fill();
  gameIcon(ctx, id, 63, 134, 0.9);
}

export function home(ctx, view) {
  const { pet, t, meta } = view;
  const night = sleeping(pet);
  const P = pal(night);
  const eq = meta.equipped;
  drawScene(ctx, P, night, t, { weather: pet.weather, decor: eq.decor });
  drawTree(ctx, P, t);
  drawTinto(ctx, { ox: 120, oy: 180, t, face: feeling(pet), anim: pet.anim, alarmed: Boolean(pet.alert) && !night, night, outfit: { hat: eq.hat, collar: eq.collar }, basket: eq.basket });
  drawSurprise(ctx, pet.surprise, t);
  if (view.wants && !night && !pet.anim) wantsBubble(ctx, P, view.wants);
  hud(ctx, P, pet, night, meta);
  if (pet.alert) card(ctx, P, pet.alert);
  whisperPill(ctx, P, whisper(pet));
  menu(ctx, P, view.menu, pet, { jugar: meta.daily && !meta.daily.done });
}
