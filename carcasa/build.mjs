import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "../.claude/skills/anatomy/scripts/inline-kit.mjs";
import * as M from "./dims.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 760;
const PLATE = { x: -42, y: -50, w: 84, d: 98, r: 5 };
const PLATE_H = 4;
const FOOT_H = 2.5;
const TOP_TRAVEL = Math.max(...M.PIECES.map((piece) => piece.travel));

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(M.BODY, 0, M.THICK + TOP_TRAVEL)],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 45, elevation: 30 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const tenth = (value) => Math.round(value * 10) / 10;
const pathOf = (points, closed = true) => `M${points.map(([x, y]) => `${tenth(x)} ${tenth(y)}`).join("L")}${closed ? "Z" : ""}`;
const poly = (points3) => pathOf(points3.map(at));
const depth = (x, y, z = 0) => k.depthOf([x, y, z], P);
const byDepth = (list) => [...list].sort((a, b) => depth(a.at[0], a.at[1]) - depth(b.at[0], b.at[1])).map((item) => item.svg).join("");
const shade = (d, tone) => `<path class="iso-shade" data-shade="${tone}" d="${d}"/>`;

// Un hueco visto desde arriba: sus paredes del fondo, sombreadas según a dónde miran, y su suelo, recortados por la boca.
function recess(id, ring, zTop, zFloor, floor, content = "") {
  const cx = ring.reduce((sum, point) => sum + point[0], 0) / ring.length;
  const cy = ring.reduce((sum, point) => sum + point[1], 0) / ring.length;
  const [vx, vy] = k.towardViewer(P);
  const tones = ["", "", "", ""];
  ring.forEach((a, index) => {
    const b = ring[(index + 1) % ring.length];
    let nx = b[1] - a[1];
    let ny = a[0] - b[0];
    if (nx * ((a[0] + b[0]) / 2 - cx) + ny * ((a[1] + b[1]) / 2 - cy) < 0) [nx, ny] = [-nx, -ny];
    if (nx * vx + ny * vy >= 0) return;
    tones[Math.min(3, G.toneOf([-nx, -ny, 0], P))] += poly([[...a, zTop], [...b, zTop], [...b, zFloor], [...a, zFloor]]);
  });
  const mouth = k.onTop(ring, zTop, P, true);
  const bottom = k.onTop(ring, zFloor, P, true);
  const walls = tones.map((d, tone) => (d ? shade(d, tone) : "")).join("");
  return `<clipPath id="${id}"><path d="${mouth}"/></clipPath><g clip-path="url(#${id})"><path class="iso-fill" d="${mouth}"/>${walls}${floor(bottom)}${content}</g>${L(mouth, { tone: "lo" })}`;
}
const darkFloor = (d) => `${shade(d, 0)}${L(d, { tone: "faint" })}`;
const openFloor = (d) => `<path class="iso-fill" d="${d}"/>`;
const trayFloor = (d) => `${shade(d, 3)}${L(d, { tone: "faint" })}`;

// Todo lo que queda a la vista por encima de una boca: la boca y la columna de pantalla sobre su borde cercano.
function above(ring, z) {
  const points = ring.map(([x, y]) => at([x, y, z]));
  const left = points.reduce((best, point, index) => (point[0] < points[best][0] ? index : best), 0);
  const right = points.reduce((best, point, index) => (point[0] > points[best][0] ? index : best), 0);
  const walk = (from, to) => {
    const out = [];
    for (let index = from; ; index = (index + 1) % points.length) {
      out.push(points[index]);
      if (index === to) return out;
    }
  };
  const mean = (list) => list.reduce((sum, point) => sum + point[1], 0) / list.length;
  const forward = walk(left, right);
  const backward = walk(right, left).reverse();
  const near = mean(forward) > mean(backward) ? forward : backward;
  return pathOf([...near, [near[near.length - 1][0], -4000], [near[0][0], -4000]]);
}

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  out.push(
    byDepth(
      k.corners(PLATE, 8).map(([x, y]) => ({
        at: [x, y],
        svg: S(k.cylinder(x, y, 3.4, -PLATE_H - FOOT_H, 0.8, P, 24), { tone: "lo" }) + S(k.cylinder(x, y, 2.6, -PLATE_H - FOOT_H + 0.8, FOOT_H - 0.8, P, 24), { tone: "mid" }),
      })),
    ),
  );
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 2), 0, P), { tone: "faint" }));
  const screws = k.corners(PLATE, 5);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.1, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  const across = { x: M.BODY.x - 4, y: 40, w: M.BODY.w + 8, d: 4.6, r: 0.5 };
  out.push(S(k.slabOf(across, 0, 0.3, P, 3), { tone: "lo", crease: "none" }));
  const wide = k.topTicks(M.BODY.x, M.BODY.x + M.BODY.w, 1, 5, across.y + 0.3, 0.3, [1, 2], P);
  out.push(L(wide.minor, { tone: "lo" }), L(wide.major, { tone: "mid" }));

  const along = { x: 34, y: M.BODY.y - 4, w: 4.6, d: M.BODY.d + 8, r: 0.5 };
  out.push(S(k.slabOf(along, 0, 0.3, P, 3), { tone: "lo", crease: "none" }));
  const long = k.topTicks(M.BODY.y, M.BODY.y + M.BODY.d, 1, 5, along.x + 0.3, 0.3, [1, 2], P, "y");
  out.push(L(long.minor, { tone: "lo" }), L(long.major, { tone: "mid" }));

  const label = { x: -39, y: 20, w: 9, d: 15, r: 0.6 };
  out.push(S(k.slabOf(label, 0, 0.3, P, 3), { tone: "lo", crease: "none" }));
  out.push(L([2.4, 4.4, 6.4].map((dx) => k.lineOnTop([label.x + dx, label.y + 2], [label.x + dx, label.y + (dx > 5 ? 9 : 13)], 0.3, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([label.x + 1.2, label.y + 1.2, 0.3]), at([label.x + label.w - 1.2, label.y + label.d - 1.2, 0.3])], { size: 0.4 }));
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(M.BODY, 2), 0, 1, P)}" style="filter:blur(5px)"/>`);
  return out.join("");
}

function screws() {
  return byDepth(
    M.BOSSES.map(([x, y]) => {
      const threads = [];
      for (let z = M.SCREW.headH + 1.4; z < M.SCREW.length - 0.6; z += 1.1) threads.push(k.sideArc(x, y, M.SCREW.r, z, P, 10));
      return {
        at: [x, y],
        svg:
          S(k.cylinder(x, y, M.SCREW.head, 0, M.SCREW.headH, P, 22), { tone: "mid" }) +
          S(k.cylinder(x, y, M.SCREW.r, M.SCREW.headH, M.SCREW.length - M.SCREW.headH, P, 16), { tone: "mid", crease: "lo", inner: L(threads.join(""), { tone: "lo" }) }) +
          D([at([x, y, M.SCREW.length])], { size: 0.4 }),
      };
    }),
  );
}

function back() {
  const out = [];
  out.push(S(k.slabOf(M.BODY, 0, M.SPLIT, P, 12), { tone: "hi", crease: "lo", inner: L(k.sideSeam(M.BODY, 1, P, 12), { tone: "faint" }) }));
  const floor = M.SKIN;
  const inside = [];
  for (const rib of [
    { x: -15.6, y: -25.4, w: 31.2, d: 1, r: 0.3 },
    { x: -15.6, y: 6.4, w: 31.2, d: 1, r: 0.3 },
    { x: -16.6, y: -22, w: 1, d: 26, r: 0.3 },
    { x: 15.6, y: -22, w: 1, d: 26, r: 0.3 },
  ])
    inside.push({ at: [rib.x + rib.w / 2, rib.y + rib.d / 2], svg: S(k.slabOf(rib, floor, 2, P, 2), { tone: "mid" }) });
  for (const [x, y] of M.BOSSES)
    inside.push({
      at: [x, y],
      svg: S(k.cylinder(x, y, M.BOSS_R, floor, M.CARRIER.z - floor, P, 24), { tone: "mid", crease: "lo" }) + L(k.ring(x, y, 1.1, M.CARRIER.z, P, 14), { tone: "mid" }),
    });
  const [mx, my] = M.MOTOR.at;
  const top = M.MOTOR.z + M.MOTOR.h;
  inside.push({
    at: [mx, my],
    svg:
      [-1.5, 1.5].map((dx) => k.wireSvg(at([mx + dx, my - 4.4, floor]), at([mx + dx, my - 7, floor]), { ends: "to", size: 0.9, tone: dx < 0 ? "lo" : "mid" })).join("") +
      S(k.cylinder(mx, my, M.MOTOR.r, M.MOTOR.z, M.MOTOR.h, P, 36, 0.3), { tone: "mid", crease: "lo" }) +
      L(k.ring(mx, my, 3.3, top, P, 28), { tone: "lo" }) +
      D([at([mx, my, top])], { size: 0.5 }),
  });
  out.push(recess("tg-tray", k.ringOf(M.CAVITY, 12), M.SPLIT, floor, trayFloor, byDepth(inside)));
  const edge = M.BODY.y + M.BODY.d;
  const inner = M.CAVITY.y + M.CAVITY.d;
  const half = M.PORT.half;
  out.push(shade(poly([[-half, inner, M.SPLIT], [half, inner, M.SPLIT], [half, edge, M.SPLIT], [half, edge, M.PORT.z], [-half, edge, M.PORT.z], [-half, edge, M.SPLIT]]), 0));
  out.push(L(pathOf([[-half, inner, M.SPLIT], [-half, edge, M.SPLIT], [-half, edge, M.PORT.z], [half, edge, M.PORT.z], [half, edge, M.SPLIT], [half, inner, M.SPLIT]].map(at), false), { tone: "lo" }));
  return out.join("");
}

function battery() {
  const { plan, z, h } = M.BATTERY;
  const top = z + h;
  const out = [S(k.slabOf(plan, z, h, P, 4, 0.3), { tone: "mid", inner: L(k.sideSeam(plan, z + h / 2, P, 4), { tone: "faint" }) })];
  out.push(L(k.lineOnTop([plan.x, plan.y + 3.4], [plan.x + plan.w, plan.y + 3.4], top, P), { tone: "lo" }));
  out.push(L([10, 13, 16].map((dy, index) => k.lineOnTop([plan.x + 4, plan.y + dy], [plan.x + (index === 2 ? 12 : 17), plan.y + dy], top, P)).join(""), { tone: "lo", free: true }));
  out.push([23.4, 26].map((dx, index) => k.wireSvg(at([plan.x + dx, plan.y + 1.6, top]), at([plan.x + dx, plan.y + plan.d - 1.4, top]), { size: 0.9, tone: index ? "mid" : "lo" })).join(""));
  return out.join("");
}

function faceRing(y, x0, x1, z0, z1, r) {
  const points = [];
  for (const [cx, cz, from] of [[x1 - r, z1 - r, 0], [x0 + r, z1 - r, 90], [x0 + r, z0 + r, 180], [x1 - r, z0 + r, 270]])
    for (let step = 0; step <= 5; step++) {
      const angle = ((from + step * 18) * Math.PI) / 180;
      points.push([cx + r * Math.cos(angle), y, cz + r * Math.sin(angle)]);
    }
  return points;
}

function xiao() {
  const { plan, z, h } = M.XIAO;
  const top = z + h;
  const out = [S(k.slabOf(plan, z, h, P, 4), { tone: "mid" })];
  const pins = [];
  for (let index = 0; index < 7; index++) for (const x of [plan.x + 1.3, plan.x + plan.w - 1.3]) pins.push(at([x, plan.y + 1.6 + index * 2.54, top]));
  out.push(D(pins, { size: 0.45, tone: "hi" }));
  const can = { x: -6, y: plan.y + 1.2, w: 12, d: 11.5, r: 0.6 };
  out.push(S(k.slabOf(can, top, 2, P, 3, 0.3), { tone: "mid", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(can, 1.2), top + 2, P, 3), { tone: "faint" }));
  out.push(L([4, 6].map((dy) => k.lineOnTop([can.x + 2.6, can.y + dy], [can.x + 8, can.y + dy], top + 2, P)).join(""), { tone: "lo", free: true }));
  out.push(S(k.cylinder(-6.9, plan.y + 18.4, 0.9, top, 0.8, P, 14), { tone: "mid" }));
  for (const dy of [15, 18.2]) out.push(S(k.slabOf({ x: 5.7, y: plan.y + dy, w: 2.4, d: 1.6, r: 0.3 }, top, 0.8, P, 2), { tone: "mid" }));
  const usb = M.USB;
  out.push(S(k.slabOf(usb.plan, usb.z, usb.h, P, 5, 0.3), { tone: "hi", crease: "lo" }));
  const mouth = poly(faceRing(usb.plan.y + usb.plan.d, usb.plan.x + 1, usb.plan.x + usb.plan.w - 1, usb.z + 0.7, usb.z + usb.h - 0.7, 0.85));
  out.push(shade(mouth, 0), L(mouth, { tone: "mid" }));
  return out.join("");
}

// La mascota y sus tres avisos, en celdas de 4 × 4 píxeles de una pantalla de 128 × 64.
const PET = [
  "..X......X..",
  ".XXX....XXX.",
  ".XXXXXXXXXX.",
  "XXXXXXXXXXXX",
  "XX.XXXXXX.XX",
  "XX.XXXXXX.XX",
  "XXXXXXXXXXXX",
  "XXX.XXXX.XXX",
  ".XXX....XXX.",
  ".XXXXXXXXXX.",
  "..XX....XX..",
];
const PET_UP = [...PET.slice(0, 10), ".XX......XX."];
const HEART = [".X.X.", "XXXXX", ".XXX.", "..X.."];
const CELL_GAUGE = ["XXXXXX.", "X.XX.XX", "X.XX.XX", "XXXXXX."];
const ENERGY = ["XXXXXXXXXXXXXXXXXX.X.X.X.X.X"];
const CELL = M.OLED.active.w / 32;

function cells(rows, column, row, z) {
  const { x, y } = M.OLED.active;
  let d = "";
  rows.forEach((line, dy) => {
    for (let from = 0; from < line.length; from++) {
      if (line[from] !== "X") continue;
      let to = from;
      while (line[to + 1] === "X") to++;
      const x0 = x + (column + from) * CELL;
      const x1 = x + (column + to + 1) * CELL;
      const y0 = y + (row + dy) * CELL;
      d += poly([[x0, y0, z], [x1, y0, z], [x1, y0 + CELL, z], [x0, y0 + CELL, z]]);
      from = to;
    }
  });
  return d;
}

const picture = (z) =>
  `<path class="tg-px" d="${cells(HEART, 2, 1, z)}${cells(CELL_GAUGE, 23, 1, z)}${cells(ENERGY, 2, 15, z)}"/><path class="tg-px tg-px-a" d="${cells(PET, 10, 3, z)}"/><path class="tg-px tg-px-b" d="${cells(PET_UP, 10, 2, z)}"/>`;

function carrier() {
  const out = [];
  const [bx, by] = M.BUZZER.at;
  out.push(S(k.cylinder(bx, by, M.BUZZER.r, M.BUZZER.z, M.BUZZER.h, P, 32), { tone: "mid", crease: "none" }));
  const top = M.CARRIER_TOP;
  out.push(S(k.slabOf(M.CARRIER.plan, M.CARRIER.z, M.CARRIER.h, P, 5, 0.3), { tone: "mid" }));
  out.push(L(M.BOSSES.map(([x, y]) => k.ring(x, y, 1.1, top, P, 14)).join(""), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([0, 27.3], top, P, "x"), "MASCOTA v0", { size: 1.7, tone: "lo", anchor: "middle" }));

  const o = M.OLED;
  const boardTop = o.boardZ + o.boardH;
  out.push(byDepth(o.holes.slice(2).map(([x, y]) => ({ at: [x, y], svg: S(k.cylinder(x, y, 1.5, top, o.boardZ - top, P, 16), { tone: "mid", crease: "none" }) }))));
  out.push(S(k.slabOf(o.board, o.boardZ, o.boardH, P, 3), { tone: "mid" }));
  out.push(L(o.holes.map(([x, y]) => k.ring(x, y, 1.2, boardTop, P, 14)).join(""), { tone: "lo" }));
  out.push(D([-3.81, -1.27, 1.27, 3.81].map((x) => at([x, o.board.y + 1.9, boardTop])), { size: 0.5, tone: "hi" }));
  out.push(S(k.slabOf(o.glass, boardTop, o.glassH, P, 3, 0.3), { tone: "hi", crease: "lo", lit: true }));
  out.push(L(k.planOutline(k.insetPlan(o.active, -0.7), M.GLASS_TOP, P, 3), { tone: "lo" }));
  out.push(picture(M.GLASS_TOP));
  const flex = { x: -7, y: o.glass.y + o.glass.d, w: 14, d: 4.2, r: 0.4 };
  out.push(S(k.slabOf(flex, boardTop, 0.4, P, 2), { tone: "lo", crease: "none" }));
  out.push(L([1.4, 2.8].map((dy) => k.lineOnTop([flex.x, flex.y + dy], [flex.x + flex.w, flex.y + dy], boardTop + 0.4, P)).join(""), { tone: "lo" }));
  for (const x of [9.4, 11.8, 14.2]) out.push(S(k.slabOf({ x, y: flex.y + 1, w: 1.5, d: 0.9, r: 0.2 }, boardTop, 0.5, P, 2), { tone: "mid", crease: "none" }));

  const side = M.SWITCH.side / 2;
  out.push(
    byDepth(
      M.BUTTONS.map(([x, y]) => ({
        at: [x, y],
        svg:
          D([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => at([x + sx * (side + 0.7), y + sy * 2.3, top])), { size: 0.4, tone: "hi" }) +
          S(k.slabOf({ x: x - side, y: y - side, w: side * 2, d: side * 2, r: 0.8 }, top, M.SWITCH.h, P, 3, 0.25), { tone: "mid", crease: "lo" }) +
          L(k.ring(x, y, 2.5, top + M.SWITCH.h, P, 20), { tone: "faint" }) +
          S(k.cylinder(x, y, M.SWITCH.plungerR, top + M.SWITCH.h, M.SWITCH.plungerH, P, 20), { tone: "hi", crease: "lo" }),
      })),
    ),
  );
  return out.join("");
}

function caps() {
  return byDepth(
    M.BUTTONS.map(([x, y], index) => ({
      at: [x, y],
      svg:
        S(k.cylinder(x, y, M.CAP.skirtR, M.CAP.skirtZ, 0.7, P, 32), { tone: "hi", crease: "lo" }) +
        S(k.cylinder(x, y, M.CAP.stemR, M.CAP.skirtZ + 0.7, M.CAP.top - M.CAP.skirtZ - 0.7, P, 32, 0.5), { tone: "hi", crease: "lo" }) +
        (index === 1 ? L(k.ring(x, y, 1.5, M.CAP.top, P, 18), { tone: "mid" }) : D([at([x, y, M.CAP.top])], { size: 0.5, tone: "hi" })),
    })),
  );
}

function front() {
  const out = [];
  const [z0, z1] = M.LUG_Z;
  out.push(S(k.slabOf(M.LUG, z0, z1 - z0, P, 10, 0.4), { tone: "hi", crease: "lo" }));
  out.push(recess("tg-lug", k.circleRing(...M.LUG_HOLE.at, M.LUG_HOLE.r, 24), z1, z0, openFloor));
  out.push(S(k.slabOf(M.BODY, M.SPLIT, M.THICK - M.SPLIT, P, 12, 1.2), { tone: "hi", crease: "lo" }));
  const lens = M.THICK - M.LENS_DROP;
  out.push(recess("tg-window", k.ringOf(M.WINDOW, 5), M.THICK, lens, darkFloor, `<g data-glow>${picture(lens)}</g>`));
  out.push(byDepth(M.BUTTONS.map(([x, y], index) => ({ at: [x, y], svg: recess(`tg-hole-${index}`, k.circleRing(x, y, M.CAP_HOLE_R, 28), M.THICK, M.THICK - M.SKIN, darkFloor) }))));
  return out.join("");
}

const ART = { screws, back, battery, xiao, carrier, caps, front };
const IN_TRAY = new Set(["battery", "xiao"]);
const half = M.PORT.half;
const notch = [[-half, M.CAVITY.y + M.CAVITY.d - 0.5], [half, M.CAVITY.y + M.CAVITY.d - 0.5], [half, M.BODY.y + M.BODY.d], [-half, M.BODY.y + M.BODY.d]];
const defs = `<defs><clipPath id="tg-above"><path d="${above(k.ringOf(M.CAVITY, 12), M.SPLIT)}"/><path d="${above(notch, M.SPLIT)}"/></clipPath></defs>`;
const items = M.PIECES.map((piece) => {
  const art = ART[piece.id]();
  const inner = IN_TRAY.has(piece.id) ? `<g clip-path="url(#tg-above)"><g data-lift>${art}</g></g>` : art;
  return `<g class="it" data-piece="${piece.id}"${IN_TRAY.has(piece.id) ? ' data-in="back"' : ""}>${inner}</g>`;
});

// Cerrada, la escena baja media carrera para quedar centrada; al abrirse vuelve a su sitio.
const PAN = -tenth(k.screenRise(TOP_TRAVEL, P) / 2);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: `La carcasa de una mascota de bolsillo, de ${M.BODY.w} por ${M.BODY.d} por ${M.THICK} milímetros, sobre una placa con dos reglas en milímetros. Se desmonta hacia arriba en siete conjuntos: cuatro tornillos, la tapa trasera con el motor de vibración, la batería, la placa XIAO ESP32-S3 con su USB-C, la placa portadora con la pantalla OLED y tres pulsadores, tres botones y la tapa frontal con la ventana de la pantalla.`,
  body: [defs, `<g data-pan transform="translate(0 ${PAN})">${plate()}<g data-layer>${items.join("")}</g></g>`],
});

const CSS = `
.tg-px{fill:var(--anatomy-lit);stroke:none}
.tg-px-b{opacity:0}
.tg-stage[data-inview] .tg-px-a{animation:tg-hop 1.4s steps(1,end) infinite}
.tg-stage[data-inview] .tg-px-b{animation:tg-hop 1.4s steps(1,end) infinite reverse}
@keyframes tg-hop{0%,62%{opacity:1}63%,100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.tg-stage .tg-px-a,.tg-stage .tg-px-b{animation:none}}
.tg-stage{outline:none;cursor:pointer;touch-action:manipulation}
.tg-stage:focus-visible{box-shadow:0 0 0 1px var(--anatomy-mid)}
.tg-stage[data-focus] .it:not([data-on]){--anatomy-hi:var(--anatomy-mid);--anatomy-mid:var(--anatomy-lo)}
.it[data-on]{--anatomy-hi:var(--anatomy-lit);--anatomy-mid:var(--anatomy-hi)}
.it[data-on] .iso-top{fill:var(--anatomy-lit-top)}
.it[data-on] .iso-shade{fill:var(--anatomy-lit-shade)}
.it[data-on] .iso-shade[data-shade="0"]{fill:var(--anatomy-shade-0)}
.tg-parts{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:14px 0 18px;padding:0;list-style:none}
.tg-part{display:inline-flex;gap:7px;align-items:baseline;padding:6px 10px;border:0;border-radius:6px;background:none;color:var(--anatomy-text);font:12.5px/1.3 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;box-shadow:inset 0 0 0 1px var(--anatomy-faint);transition:color 160ms var(--anatomy-ease),box-shadow 160ms var(--anatomy-ease)}
.tg-part:hover,.tg-part:focus-visible,.tg-part[data-on]{color:var(--anatomy-strong);box-shadow:inset 0 0 0 1px var(--anatomy-mid);outline:none}
.iso-plate:has(.tg-stage[data-focus]) [data-corner="hint"]{visibility:hidden}
.tg-num{font-family:var(--anatomy-mono);font-size:10px;color:var(--anatomy-muted)}
@media (max-width:640px){.iso-plate{padding:48px 8px 56px}.tg-part{padding:5px 8px;font-size:12px}}
`;

const REST = `${M.BODY.w} × ${M.BODY.d} × ${M.THICK} mm · cerrada`;
const DATA = { P, pan: PAN, pieces: M.PIECES, spring: M.SPRING, rest: REST, apart: `${M.PIECES.length} conjuntos · 4 tornillos M2` };

const live = `
const DATA = ${JSON.stringify(DATA)};
const P = DATA.P;
const stage = document.querySelector(".tg-stage");
const svg = stage.querySelector("svg");
const layer = svg.querySelector("[data-layer]");
const readout = document.querySelector("[data-readout]");
const buttons = [...document.querySelectorAll(".tg-part")];
const glow = svg.querySelector("[data-glow]");
const pan = svg.querySelector("[data-pan]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const byId = Object.fromEntries(DATA.pieces.map((piece) => [piece.id, piece]));
const nodes = [...layer.querySelectorAll(".it")].map((node) => ({ node, piece: byId[node.dataset.piece], host: node.dataset.in, lift: node.querySelector("[data-lift]") }));
const state = Object.fromEntries(DATA.pieces.map((piece) => [piece.id, { x: 0, v: 0, target: 0, due: null }]));
const opening = DATA.pieces.map((piece) => piece.id).filter((id) => byId[id].travel > 0).reverse();
let open = false, selected = null, touring = !still.matches, tour = 0, clock = 0, last = 0, frame = 0, visible = false, idle = 0, order = "";
const move = (z) => (Math.abs(z) < 0.001 ? "" : translateAlong(P, [0, 0, z]));
function setOpen(next) {
  open = next;
  const goal = next ? 1 : 0;
  const list = (next ? opening : [...opening].reverse()).filter((id) => (state[id].due ? state[id].due.value : state[id].target) !== goal || state[id].due);
  for (const id of opening) if (state[id].due && state[id].due.value !== goal) state[id].due = null;
  list.filter((id) => state[id].target !== goal).forEach((id, index) => { state[id].due = { value: goal, at: clock + index * DATA.spring.stagger }; });
  run();
}
function place() {
  for (const item of nodes) {
    const own = state[item.piece.id].x * item.piece.travel;
    if (item.host) {
      const host = state[item.host].x * byId[item.host].travel;
      const outer = move(host), inner = move(own - host);
      outer ? item.node.setAttribute("transform", outer) : item.node.removeAttribute("transform");
      inner ? item.lift.setAttribute("transform", inner) : item.lift.removeAttribute("transform");
    } else {
      const to = move(own);
      to ? item.node.setAttribute("transform", to) : item.node.removeAttribute("transform");
    }
    item.key = item.piece.key + own;
  }
  const sorted = [...nodes].sort((a, b) => a.key - b.key);
  const next = sorted.map((item) => item.piece.id).join();
  if (next !== order) {
    order = next;
    const fragment = document.createDocumentFragment();
    for (const item of sorted) fragment.appendChild(item.node);
    layer.appendChild(fragment);
  }
  const gap = state.front.x * byId.front.travel - state.carrier.x * byId.carrier.travel;
  pan.setAttribute("transform", "translate(0 " + ((1 - state.front.x) * DATA.pan).toFixed(2) + ")");
  glow.style.opacity = String(Math.max(0, 1 - gap / 5));
}
function say() {
  const piece = selected && byId[selected];
  const text = piece ? String(DATA.pieces.indexOf(piece) + 1).padStart(2, "0") + " " + piece.name + " · " + piece.note : open ? DATA.apart : DATA.rest;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-pressed", String(open));
}
function select(id) {
  selected = id;
  id ? stage.setAttribute("data-focus", "") : stage.removeAttribute("data-focus");
  for (const item of nodes) item.piece.id === id ? item.node.setAttribute("data-on", "") : item.node.removeAttribute("data-on");
  for (const button of buttons) button.dataset.piece === id ? button.setAttribute("data-on", "") : button.removeAttribute("data-on");
  say();
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  if (touring) {
    tour += dt;
    const want = tour % 8.4 > 1 && tour % 8.4 < 6.4;
    if (want !== open) { setOpen(want); say(); }
  }
  let moving = false;
  for (const id of opening) {
    const s = state[id];
    if (s.due && clock >= s.due.at) { s.target = s.due.value; s.due = null; }
    if (s.due) moving = true;
    if (still.matches) { s.x = s.target; s.v = 0; continue; }
    const h = dt / DATA.spring.substeps;
    for (let step = 0; step < DATA.spring.substeps; step++) { s.v += ((s.target - s.x) * DATA.spring.stiffness - s.v * DATA.spring.damping) * h; s.x += s.v * h; }
    if (Math.abs(s.target - s.x) < 0.0005 && Math.abs(s.v) < 0.0005) { s.x = s.target; s.v = 0; } else moving = true;
  }
  place();
  frame = visible && (moving || touring) ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
function hold() { touring = false; clearTimeout(idle); idle = setTimeout(() => { if (still.matches || selected) return; touring = true; tour = open ? 1.2 : 0; run(); }, 3600); }
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  visible ? stage.setAttribute("data-inview", "") : stage.removeAttribute("data-inview");
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointerenter", (event) => { if (event.pointerType !== "mouse") return; hold(); setOpen(true); say(); });
stage.addEventListener("pointerleave", (event) => { if (event.pointerType === "mouse") hold(); });
stage.addEventListener("click", (event) => { if (event.detail && event.pointerType === "mouse") return; hold(); setOpen(!open); say(); });
stage.addEventListener("keydown", (event) => {
  const ids = DATA.pieces.map((piece) => piece.id);
  const here = ids.indexOf(selected);
  if (event.key === " " || event.key === "Enter") { hold(); setOpen(!open); say(); }
  else if (event.key === "ArrowUp" || event.key === "ArrowRight") { hold(); setOpen(true); select(ids[Math.min(ids.length - 1, here + 1)]); }
  else if (event.key === "ArrowDown" || event.key === "ArrowLeft") { hold(); setOpen(true); select(ids[here < 0 ? ids.length - 1 : Math.max(0, here - 1)]); }
  else if (event.key === "Escape") { select(null); hold(); }
  else return;
  event.preventDefault();
});
for (const button of buttons) {
  button.addEventListener("click", () => { hold(); const id = button.dataset.piece; select(selected === id ? null : id); if (selected) setOpen(true); say(); if (!selected) hold(); });
}
place();
say();
`;

const parts = `<ul class="tg-parts">${M.PIECES.map((piece, index) => `<li><button type="button" class="tg-part" data-piece="${piece.id}"><span class="tg-num">${String(index + 1).padStart(2, "0")}</span>${piece.name}</button></li>`).join("")}</ul>`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Carcasa de la mascota",
  hint: "Pasa el cursor o toca para desmontarla",
  readout: REST,
  keys: [
    { mark: "lit", label: "Pantalla OLED de 1.3\": lo único que se enciende" },
    { mark: "raised", label: "Dos tapas impresas en 3D, cerradas con 4 tornillos M2" },
  ],
  caption: `La carcasa mide ${M.BODY.w} × ${M.BODY.d} × ${M.THICK} mm; las dos reglas de la placa están en milímetros. Los tornillos entran por la espalda, atraviesan la placa portadora y la aprietan entre los postes de las dos tapas. La batería y el motor de vibración van en la tapa trasera, la placa XIAO ESP32-S3 asoma su USB-C por la muesca inferior, y la pantalla se ve a través de una lente ahumada en la tapa frontal.`,
  body: `<div class="iso-stage tg-stage" tabindex="0" role="button" aria-pressed="false" aria-label="Carcasa de la mascota: Espacio la desmonta, las flechas eligen un conjunto">${svg}</div>${parts}`,
});

const name = theme === "light" ? "carcasa-light.html" : "carcasa.html";
const page = k.pageHtml({ title: "Carcasa de la mascota", theme, body: `<style>${CSS}</style>${body}`, script: kitScript() + live }).replace('<html lang="en">', '<html lang="es">');
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, "scale", P.scale.toFixed(2));
