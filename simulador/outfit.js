// La ropa de Tinto y los colores de su cesta. Todo se dibuja en coordenadas locales del centro de su cabeza.
import { TAU, lin, rad, rr } from "./gfx.js";

const TONES = {
  rosa: { day: { cream: ["#ffeaf0", "#f3c6d5"], inner: ["#d9a9b9", "#f0cdd8"], edge: "#dba5b7" }, night: { cream: ["#8a6f93", "#5f4a78"], inner: ["#3a2c4e", "#52416e"], edge: "#4a3a62" } },
  azul: { day: { cream: ["#ecf4ff", "#c4d9f4"], inner: ["#a9bedd", "#cddff3"], edge: "#a8bfdd" }, night: { cream: ["#6b7fa8", "#46598a"], inner: ["#26334f", "#394b75"], edge: "#34456c" } },
  verde: { day: { cream: ["#ecf9ec", "#c6e6c9"], inner: ["#a8cba9", "#cde8cf"], edge: "#a6c8a9" }, night: { cream: ["#6c9a82", "#477260"], inner: ["#2a4a3c", "#3b6652"], edge: "#34594a" } },
};
export const basketTone = (P, night, id) => (TONES[id] ? { ...P, ...TONES[id][night ? "night" : "day"] } : P);

export function drawHat(ctx, id, hx, hy) {
  ctx.save();
  ctx.translate(hx, hy);
  if (id === "gorro") {
    ctx.beginPath();
    ctx.moveTo(-25, -22);
    ctx.bezierCurveTo(-28, -52, 28, -52, 25, -22);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, -50, 0, -22, [[0, "#f07474"], [1, "#c9363f"]]);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1;
    for (const x of [-16, -8, 0, 8, 16]) {
      ctx.beginPath();
      ctx.moveTo(x * 0.9, -24);
      ctx.quadraticCurveTo(x, -37, x * 0.82, -48);
      ctx.stroke();
    }
    rr(ctx, -27, -28, 54, 9, 4.5);
    ctx.fillStyle = lin(ctx, 0, -28, 0, -19, [[0, "#fff4f1"], [1, "#e4d0ca"]]);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -50, 6.6, 0, TAU);
    ctx.fillStyle = rad(ctx, -2, -52, 1, 0, -50, 7.5, [[0, "#ffffff"], [1, "#e6dcd6"]]);
    ctx.fill();
  } else if (id === "flor") {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(24 + Math.cos(a) * 5.4, -32 + Math.sin(a) * 5.4, 4.3, 0, TAU);
      ctx.fillStyle = lin(ctx, 0, -40, 0, -24, [[0, "#ffc0d4"], [1, "#ff86ab"]]);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(24, -32, 3.4, 0, TAU);
    ctx.fillStyle = "#ffd54a";
    ctx.fill();
  } else if (id === "copa") {
    ctx.beginPath();
    ctx.ellipse(0, -31, 25, 5.6, 0, 0, TAU);
    ctx.fillStyle = "#1d1a26";
    ctx.fill();
    rr(ctx, -14, -63, 28, 33, 3);
    ctx.fillStyle = lin(ctx, -14, 0, 14, 0, [[0, "#4a4658"], [0.4, "#2a2733"], [1, "#15131b"]]);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -63, 14, 4.2, 0, 0, TAU);
    ctx.fillStyle = "#34313f";
    ctx.fill();
    rr(ctx, -14, -41, 28, 6, 1.5);
    ctx.fillStyle = "#d63a4a";
    ctx.fill();
  } else if (id === "vaquero") {
    rr(ctx, -16, -58, 32, 27, 9);
    ctx.fillStyle = lin(ctx, 0, -58, 0, -31, [[0, "#d29a58"], [1, "#a8723a"]]);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -31, 37, 8.5, 0, 0, TAU);
    ctx.fillStyle = lin(ctx, 0, -40, 0, -22, [[0, "#d9a566"], [1, "#a8723a"]]);
    ctx.fill();
    rr(ctx, -16, -40, 32, 6, 2);
    ctx.fillStyle = "#6e4a26";
    ctx.fill();
    ctx.fillStyle = "#e8c35a";
    ctx.fillRect(-3, -39, 6, 4);
  } else if (id === "corona") {
    ctx.beginPath();
    ctx.moveTo(-19, -29);
    for (const [x, y] of [[-19, -47], [-10, -38], [0, -52], [10, -38], [19, -47], [19, -29]]) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, -19, -52, 19, -29, [[0, "#ffe27a"], [0.5, "#f5b52a"], [1, "#d99211"]]);
    ctx.fill();
    ctx.strokeStyle = "#b9790c";
    ctx.lineWidth = 1;
    ctx.stroke();
    for (const [x, y, c] of [[-19, -47, "#ff5b6e"], [0, -52, "#5b9bff"], [19, -47, "#ff5b6e"]]) {
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, TAU);
      ctx.fillStyle = c;
      ctx.fill();
    }
    rr(ctx, -19, -33, 38, 5, 2);
    ctx.fillStyle = "#f5b52a";
    ctx.fill();
  }
  ctx.restore();
}

export function drawCollar(ctx, id, hx, hy, t = 0) {
  ctx.save();
  ctx.translate(hx, hy);
  const band = (color, width = 5) => {
    ctx.beginPath();
    ctx.moveTo(-23, 28);
    ctx.quadraticCurveTo(0, 46, 23, 28);
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.stroke();
  };
  if (id === "cascabel") {
    band("#e5484d");
    ctx.save();
    ctx.translate(0, 38);
    ctx.rotate(0.12 * Math.sin(t * 3.2));
    ctx.beginPath();
    ctx.arc(0, 4, 5.2, 0, TAU);
    ctx.fillStyle = rad(ctx, -1.6, 2, 0.5, 0, 4, 6, [[0, "#fff0a0"], [1, "#d99a1c"]]);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,55,0,0.55)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-3.6, 5.2);
    ctx.lineTo(3.6, 5.2);
    ctx.stroke();
    ctx.restore();
  } else if (id === "lazo") {
    band("#e5484d", 4);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 7, 38);
      ctx.rotate(side * 0.45);
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 4.2, 0, 0, TAU);
      ctx.fillStyle = lin(ctx, 0, -4, 0, 4, [[0, "#ff7a86"], [1, "#d12f43"]]);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 38, 3.4, 0, TAU);
    ctx.fillStyle = "#c1243a";
    ctx.fill();
  } else if (id === "medalla") {
    band("#4f7fe0", 4);
    ctx.beginPath();
    ctx.arc(0, 41, 6.4, 0, TAU);
    ctx.fillStyle = rad(ctx, -2, 39, 1, 0, 41, 7, [[0, "#fff0a0"], [1, "#d99a1c"]]);
    ctx.fill();
    ctx.fillStyle = "#b9790c";
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 1.7 : 3.6;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(Math.cos(a) * r, 41 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  } else if (id === "bufanda") {
    band("#d63a4a", 9);
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = 2;
    band("#fff4f1", 9);
    ctx.restore();
    rr(ctx, 13, 33, 9, 20, 3);
    ctx.fillStyle = lin(ctx, 0, 33, 0, 53, [[0, "#d63a4a"], [1, "#a82336"]]);
    ctx.fill();
    ctx.fillStyle = "#fff4f1";
    ctx.fillRect(13, 41, 9, 4);
    ctx.strokeStyle = "#a82336";
    ctx.lineWidth = 1;
    for (const x of [14.5, 17.5, 20.5]) {
      ctx.beginPath();
      ctx.moveTo(x, 53);
      ctx.lineTo(x, 57);
      ctx.stroke();
    }
  }
  ctx.restore();
}
