// La lógica de los juegos de Tinto, sin pantalla: cada juego es un objeto con estado, un paso de tiempo y entradas.
// Entradas: { type: "down" | "move" | "up", x, y }, { type: "pwr" }, { type: "boot" } y, para inclinar, g.tilt = { x, y } entre -1 y 1.
// Cada juego deja sonidos pedidos en g.fx (nombres) para que quien lo ejecute los reproduzca.

const SW = 240;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, k) => a + (b - a) * k;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const ease = (k) => k * k * (3 - 2 * k);

export function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// `unlock` son las estrellas de toda la vida que hacen falta.
export const GAMES = [
  { id: "estrellas", name: "Atrapa estrellas", blurb: "Mueve la cesta y recoge las estrellas que caen.", how: "Toca un carril", seconds: 25, unlock: 0, input: "tocar" },
  { id: "laser", name: "Caza del láser", blurb: "Atrae a Tinto con el láser y quédate quieto cuando se agazape.", how: "Arrastra el dedo", seconds: 30, unlock: 0, input: "tocar" },
  { id: "laberinto", name: "Laberinto de lana", blurb: "Inclina la placa para llevar el ovillo hasta el ratón.", how: "Inclina la placa", seconds: 45, unlock: 0, input: "inclinar" },
  { id: "carrera", name: "Carrera de estanterías", blurb: "Salta jarrones y libros sin parar de correr.", how: "Toca para saltar", seconds: 30, unlock: 0, input: "tocar" },
  { id: "cajas", name: "¿Dónde está el ovillo?", blurb: "Sigue la caja que esconde el ovillo.", how: "Toca la caja", seconds: 70, unlock: 15, input: "tocar" },
  { id: "topos", name: "Cazaratones", blurb: "Atrapa a los ratones, pero no a los pájaros.", how: "Toca los agujeros", seconds: 25, unlock: 30, input: "tocar" },
  { id: "simon", name: "Simón de maullidos", blurb: "Repite la secuencia de sonidos y colores.", how: "Toca las patitas", seconds: 0, unlock: 50, input: "tocar" },
  { id: "pesca", name: "Pesca en la pecera", blurb: "Mantén para bajar el anzuelo y suelta para subirlo.", how: "Mantén y suelta", seconds: 30, unlock: 80, input: "tocar" },
];
export const gameById = (id) => GAMES.find((g) => g.id === id);

// ───────── Atrapa estrellas ─────────
export const LANES = [60, 120, 180];
const estrellas = {
  init(g) {
    Object.assign(g, { lane: 1, stars: [], next: 0.5, points: 0, caught: 0, missed: 0 });
  },
  tick(g, dt) {
    const speed = 0.42 + g.t * 0.022;
    g.next -= dt;
    if (g.next <= 0 && g.t < 23.4) {
      g.stars.push({ lane: Math.floor(g.rng() * 3), y: 0, gold: g.rng() < 0.14 });
      g.next = Math.max(0.5, 1.15 - g.t * 0.022);
    }
    for (const s of g.stars) s.y += speed * dt;
    for (const s of g.stars) {
      if (s.y < 1) continue;
      if (s.lane === g.lane) {
        g.points += s.gold ? 3 : 1;
        g.caught += 1;
        g.fx.push(s.gold ? "gold" : "coin");
      } else {
        g.missed += 1;
        g.fx.push("miss");
      }
    }
    g.stars = g.stars.filter((s) => s.y < 1);
    if (g.t >= 25) g.over = true;
  },
  input(g, ev) {
    if (ev.type === "down") g.lane = LANES.reduce((best, x, i) => (Math.abs(x - ev.x) < Math.abs(LANES[best] - ev.x) ? i : best), 0);
    else if (ev.type === "pwr") g.lane = (g.lane + 1) % 3;
    else if (ev.type === "boot") g.lane = (g.lane + 2) % 3;
  },
  result: (g) => ({ score: g.points, stars: Math.min(14, Math.ceil(g.points / 3)), line: `${g.caught} atrapadas` }),
};

// ───────── Caza del láser ─────────
export const LASER = { floor: 204, minY: 64, stalk: 0.75, pounce: 0.38, still: 14, reach: 22 };
const laser = {
  init(g) {
    Object.assign(g, { dot: { x: 120, y: 170 }, cat: { x: 60, dir: 1, mode: "idle", t: 0, from: 0, to: 0, hold: null }, focus: 0, catches: 0, misses: 0, held: false, pops: [] });
  },
  tick(g, dt) {
    const cat = g.cat;
    const { dot } = g;
    cat.t += dt;
    for (const pop of g.pops) pop.t += dt;
    g.pops = g.pops.filter((pop) => pop.t < 0.6);
    if (cat.mode === "idle") {
      if (cat.t > 0.5) Object.assign(cat, { mode: "chase", t: 0 });
    } else if (cat.mode === "chase") {
      const tx = clamp(dot.x, 20, 220);
      const dx = tx - cat.x;
      if (Math.abs(dx) > 2) cat.dir = Math.sign(dx);
      const speed = Math.min(150 + g.t * 2, Math.abs(dx) * 4 + 20);
      cat.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
      const near = Math.abs(dot.x - cat.x) < 46 && dot.y > 160;
      g.focus = near ? g.focus + dt : Math.max(0, g.focus - dt * 1.5);
      if (g.focus >= 0.6) {
        Object.assign(cat, { mode: "stalk", t: 0, hold: { x: dot.x, y: dot.y } });
        g.focus = 0;
        g.fx.push("stalk");
      }
    } else if (cat.mode === "stalk") {
      if (dist(dot, cat.hold) > LASER.still) {
        Object.assign(cat, { mode: "chase", t: 0 });
        g.fx.push("lost");
      } else if (cat.t >= LASER.stalk) {
        Object.assign(cat, { mode: "pounce", t: 0, from: cat.x, to: cat.hold.x });
        cat.dir = Math.sign(cat.to - cat.from) || cat.dir;
        g.fx.push("pounce");
      }
    } else if (cat.mode === "pounce") {
      const k = Math.min(1, cat.t / LASER.pounce);
      cat.x = lerp(cat.from, cat.to, ease(k));
      if (k >= 1) {
        if (dist(dot, { x: cat.to, y: cat.hold.y }) <= LASER.reach) {
          g.catches += 1;
          g.pops.push({ x: cat.to, y: cat.hold.y, t: 0 });
          cat.mode = "proud";
          g.fx.push("catch");
        } else {
          g.misses += 1;
          cat.mode = "groom";
          g.fx.push("miss");
        }
        cat.t = 0;
      }
    } else if (cat.t > 0.9) Object.assign(cat, { mode: "chase", t: 0 });
    if (g.t >= 30) g.over = true;
  },
  input(g, ev) {
    if (ev.type === "down" || ev.type === "move") {
      if (ev.type === "move" && !g.held) return;
      g.held = true;
      g.dot.x = clamp(ev.x, 8, SW - 8);
      g.dot.y = clamp(ev.y, LASER.minY, LASER.floor + 2);
    } else if (ev.type === "up") g.held = false;
  },
  result: (g) => ({ score: g.catches * 3, stars: Math.min(12, g.catches + (g.catches >= 5 ? 1 : 0) + (g.catches >= 8 ? 2 : 0)), line: `${g.catches} presas` }),
};

// ───────── Carrera de estanterías ─────────
export const RUN = { ground: 204, px: 56, gravity: 900, jump: 360, double: 300, height: 26, half: 9 };
const OBSTACLES = [{ kind: "jarron", w: 15, h: 26 }, { kind: "libros", w: 24, h: 14 }, { kind: "caja", w: 26, h: 24 }, { kind: "taza", w: 13, h: 15 }];
const carrera = {
  init(g) {
    Object.assign(g, { y: 0, vy: 0, jumps: 0, speed: 110, obs: [], pick: [], lives: 3, inv: 0, dist: 0, coins: 0, gap: 150 });
  },
  tick(g, dt) {
    g.speed = Math.min(205, 110 + g.t * 3.4);
    g.dist += g.speed * dt;
    g.inv = Math.max(0, g.inv - dt);
    g.vy -= RUN.gravity * dt;
    g.y += g.vy * dt;
    if (g.y <= 0) Object.assign(g, { y: 0, vy: 0, jumps: 0 });
    g.gap -= g.speed * dt;
    if (g.gap <= 0) {
      const o = OBSTACLES[Math.floor(g.rng() * OBSTACLES.length)];
      g.obs.push({ x: SW + 30, ...o });
      if (g.rng() < 0.7) for (let i = 0; i < 3; i++) g.pick.push({ x: SW + 30 + (i - 1) * 24, y: 30 + (i === 1 ? 26 : 8) + o.h * 0.6, taken: false });
      g.gap = 140 + g.rng() * 110 + g.speed * 0.35;
    }
    for (const o of g.obs) o.x -= g.speed * dt;
    for (const p of g.pick) p.x -= g.speed * dt;
    g.obs = g.obs.filter((o) => o.x > -50);
    g.pick = g.pick.filter((p) => p.x > -20 && !p.taken);
    const left = RUN.px - RUN.half;
    const right = RUN.px + RUN.half;
    for (const o of g.obs) {
      if (g.inv <= 0 && o.x < right && o.x + o.w > left && g.y < o.h) {
        g.lives -= 1;
        g.inv = 1.2;
        g.fx.push("hit");
      }
    }
    for (const p of g.pick) {
      if (Math.hypot(p.x - RUN.px, p.y - (g.y + 14)) < 15) {
        p.taken = true;
        g.coins += 1;
        g.fx.push("coin");
      }
    }
    if (g.lives <= 0 || g.t >= 30) g.over = true;
  },
  input(g, ev) {
    if (!["down", "pwr", "boot"].includes(ev.type)) return;
    if (g.jumps < 2) {
      g.vy = g.jumps === 0 ? RUN.jump : RUN.double;
      g.jumps += 1;
      g.fx.push("jump");
    }
  },
  result: (g) => {
    const score = Math.floor(g.dist / 25) + g.coins * 2;
    return { score, stars: Math.min(14, Math.floor(score / 6)), line: `${Math.round(g.dist / 10)} m` };
  },
};

// ───────── Laberinto de lana ─────────
export const MAZE = { cols: 9, rows: 7, cell: 26, ox: 3, oy: 54, radius: 6.5 };

export function makeMaze(rng, cols = MAZE.cols, rows = MAZE.rows) {
  const right = Array.from({ length: cols }, () => Array(rows).fill(true));
  const down = Array.from({ length: cols }, () => Array(rows).fill(true));
  const seen = Array.from({ length: cols }, () => Array(rows).fill(false));
  const stack = [[0, 0]];
  seen[0][0] = true;
  while (stack.length) {
    const [c, r] = stack[stack.length - 1];
    const next = [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]].filter(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !seen[x][y]);
    if (!next.length) {
      stack.pop();
      continue;
    }
    const [nc, nr] = next[Math.floor(rng() * next.length)];
    if (nc > c) right[c][r] = false;
    else if (nc < c) right[nc][nr] = false;
    else if (nr > r) down[c][r] = false;
    else down[nc][nr] = false;
    seen[nc][nr] = true;
    stack.push([nc, nr]);
  }
  return { cols, rows, right, down };
}

function mazeRects(maze) {
  const { cell, ox, oy } = MAZE;
  const rects = [];
  const t = 5;
  for (let c = 0; c < maze.cols; c++) {
    for (let r = 0; r < maze.rows; r++) {
      const x = ox + (c + 1) * cell;
      const y = oy + (r + 1) * cell;
      if (maze.right[c][r]) rects.push({ x: x - t / 2, y: oy + r * cell - t / 2, w: t, h: cell + t });
      if (maze.down[c][r]) rects.push({ x: ox + c * cell - t / 2, y: y - t / 2, w: cell + t, h: t });
    }
  }
  for (let r = 0; r < maze.rows; r++) rects.push({ x: ox - t / 2, y: oy + r * cell - t / 2, w: t, h: cell + t });
  for (let c = 0; c < maze.cols; c++) rects.push({ x: ox + c * cell - t / 2, y: oy - t / 2, w: cell + t, h: t });
  return rects;
}

const cellCentre = (c, r) => ({ x: MAZE.ox + (c + 0.5) * MAZE.cell, y: MAZE.oy + (r + 0.5) * MAZE.cell });

function newMaze(g) {
  g.maze = makeMaze(g.rng);
  g.rects = mazeRects(g.maze);
  const flip = g.level % 2 === 1;
  const start = flip ? [MAZE.cols - 1, MAZE.rows - 1] : [0, 0];
  const goal = flip ? [0, 0] : [MAZE.cols - 1, MAZE.rows - 1];
  Object.assign(g, { start, goal, ball: { ...cellCentre(...start), vx: 0, vy: 0 }, items: [] });
  const taken = new Set([`${start}`, `${goal}`]);
  while (g.items.length < 3) {
    const c = Math.floor(g.rng() * MAZE.cols);
    const r = Math.floor(g.rng() * MAZE.rows);
    if (taken.has(`${c},${r}`)) continue;
    taken.add(`${c},${r}`);
    g.items.push({ c, r, ...cellCentre(c, r), taken: false });
  }
}

export function pushOut(ball, rect, bounce = 0.25) {
  const cx = clamp(ball.x, rect.x, rect.x + rect.w);
  const cy = clamp(ball.y, rect.y, rect.y + rect.h);
  let dx = ball.x - cx;
  let dy = ball.y - cy;
  let d2 = dx * dx + dy * dy;
  const radius = MAZE.radius;
  if (d2 >= radius * radius) return false;
  if (d2 < 1e-9) {
    const left = ball.x - rect.x;
    const rightGap = rect.x + rect.w - ball.x;
    const top = ball.y - rect.y;
    const bottom = rect.y + rect.h - ball.y;
    const m = Math.min(left, rightGap, top, bottom);
    [dx, dy] = m === left ? [-1, 0] : m === rightGap ? [1, 0] : m === top ? [0, -1] : [0, 1];
    d2 = 1;
    ball.x += dx * (m + radius);
    ball.y += dy * (m + radius);
  } else {
    const d = Math.sqrt(d2);
    dx /= d;
    dy /= d;
    ball.x += dx * (radius - d);
    ball.y += dy * (radius - d);
  }
  const vn = ball.vx * dx + ball.vy * dy;
  if (vn < 0) {
    ball.vx -= (1 + bounce) * vn * dx;
    ball.vy -= (1 + bounce) * vn * dy;
  }
  return true;
}

const laberinto = {
  init(g) {
    Object.assign(g, { level: 0, got: 0, tilt: { x: 0, y: 0 } });
    newMaze(g);
  },
  tick(g, dt) {
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    const b = g.ball;
    for (let s = 0; s < steps; s++) {
      b.vx += clamp(g.tilt.x, -1, 1) * 520 * h;
      b.vy += clamp(g.tilt.y, -1, 1) * 520 * h;
      const damp = Math.max(0, 1 - 1.3 * h);
      b.vx *= damp;
      b.vy *= damp;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 190) {
        b.vx *= 190 / sp;
        b.vy *= 190 / sp;
      }
      b.x += b.vx * h;
      b.y += b.vy * h;
      for (const r of g.rects) pushOut(b, r);
    }
    for (const item of g.items) {
      if (!item.taken && Math.hypot(item.x - b.x, item.y - b.y) < 12) {
        item.taken = true;
        g.got += 1;
        g.fx.push("coin");
      }
    }
    const goal = cellCentre(...g.goal);
    if (Math.hypot(goal.x - b.x, goal.y - b.y) < 11) {
      g.level += 1;
      g.fx.push("win");
      newMaze(g);
    }
    if (g.t >= 45) g.over = true;
  },
  input(g, ev) {
    if (ev.type === "pwr") g.tilt = { x: 1, y: 0 };
    else if (ev.type === "boot") g.tilt = { x: 0, y: 1 };
  },
  result: (g) => {
    const score = g.level * 5 + g.got;
    return { score, stars: Math.min(14, Math.floor(score / 2)), line: `${g.level} laberintos` };
  },
};

// ───────── ¿Dónde está el ovillo? ─────────
export const BOX_SLOTS = [48, 120, 192];
const cajas = {
  init(g) {
    Object.assign(g, { round: 1, lives: 3, score: 0 });
    this.start(g);
  },
  start(g) {
    g.boxes = [0, 1, 2].map((id) => ({ id, slot: id }));
    g.ball = Math.floor(g.rng() * 3);
    g.phase = "show";
    g.pt = 0;
    g.cur = null;
    g.queue = [];
    const n = Math.min(14, 3 + g.round * 2);
    for (let i = 0; i < n; i++) {
      const a = Math.floor(g.rng() * 3);
      g.queue.push([a, (a + 1 + Math.floor(g.rng() * 2)) % 3]);
    }
    g.swapDur = Math.max(0.2, 0.55 - g.round * 0.045);
    g.choice = null;
  },
  tick(g, dt) {
    g.pt += dt;
    if (g.phase === "show") {
      if (g.pt > 1.1) Object.assign(g, { phase: "shuffle", pt: 0 });
    } else if (g.phase === "shuffle") {
      if (!g.cur) {
        if (g.queue.length) g.cur = { pair: g.queue.shift(), t: 0 };
        else Object.assign(g, { phase: "pick", pt: 0 });
      } else {
        g.cur.t += dt;
        if (g.cur.t >= g.swapDur) {
          const [a, b] = g.cur.pair;
          const boxA = g.boxes.find((x) => x.slot === a);
          const boxB = g.boxes.find((x) => x.slot === b);
          [boxA.slot, boxB.slot] = [b, a];
          g.cur = null;
          g.fx.push("swap");
        }
      }
    } else if (g.phase === "reveal" && g.pt > 1.2) {
      if (g.lives <= 0 || g.round > 8) g.over = true;
      else this.start(g);
    }
    if (g.t >= 70) g.over = true;
  },
  input(g, ev) {
    if (ev.type !== "down" || g.phase !== "pick") return;
    const slot = BOX_SLOTS.findIndex((x) => Math.abs(x - ev.x) < 34);
    if (slot < 0 || ev.y < 100 || ev.y > 220) return;
    const box = g.boxes.find((b) => b.slot === slot);
    g.choice = box.id;
    if (box.id === g.ball) {
      g.score += 1;
      g.round += 1;
      g.fx.push("win");
    } else {
      g.lives -= 1;
      g.fx.push("miss");
    }
    Object.assign(g, { phase: "reveal", pt: 0 });
  },
  result: (g) => ({ score: g.score * 3, stars: Math.min(14, g.score * 2), line: `${g.score} aciertos` }),
};
export function boxX(g, box) {
  const from = BOX_SLOTS[box.slot];
  if (g.phase === "shuffle" && g.cur && g.cur.pair.includes(box.slot)) {
    const other = g.cur.pair[0] === box.slot ? g.cur.pair[1] : g.cur.pair[0];
    return lerp(from, BOX_SLOTS[other], ease(clamp(g.cur.t / g.swapDur, 0, 1)));
  }
  return from;
}

// ───────── Cazaratones ─────────
export const HOLES = [[48, 112], [120, 112], [192, 112], [48, 184], [120, 184], [192, 184]];
const topos = {
  init(g) {
    Object.assign(g, { ents: [], next: 0.6, points: 0, hits: 0, bad: 0 });
  },
  tick(g, dt) {
    g.next -= dt;
    if (g.next <= 0 && g.t < 24) {
      const free = HOLES.map((_, i) => i).filter((i) => !g.ents.some((e) => e.hole === i));
      if (free.length) {
        const roll = g.rng();
        g.ents.push({ hole: free[Math.floor(g.rng() * free.length)], kind: roll < 0.12 ? "oro" : roll < 0.3 ? "pajaro" : "raton", age: 0, life: Math.max(0.55, 1.2 - g.t * 0.025), state: "up" });
        g.fx.push("pop");
      }
      g.next = Math.max(0.28, 0.85 - g.t * 0.02);
    }
    for (const e of g.ents) e.age += dt;
    g.ents = g.ents.filter((e) => (e.state === "up" ? e.age < e.life : e.age < e.life + 0.35));
    if (g.t >= 25) g.over = true;
  },
  input(g, ev) {
    if (ev.type !== "down") return;
    let best = null;
    for (const e of g.ents) {
      if (e.state !== "up") continue;
      const [x, y] = HOLES[e.hole];
      const d = Math.hypot(ev.x - x, ev.y - (y - 6));
      if (d < 34 && (!best || d < best.d)) best = { e, d };
    }
    if (!best) return;
    const { e } = best;
    e.state = "hit";
    e.life = e.age;
    if (e.kind === "pajaro") {
      g.points = Math.max(0, g.points - 2);
      g.bad += 1;
      g.fx.push("miss");
    } else {
      g.points += e.kind === "oro" ? 3 : 1;
      g.hits += 1;
      g.fx.push(e.kind === "oro" ? "gold" : "coin");
    }
  },
  result: (g) => ({ score: g.points, stars: Math.min(14, Math.ceil(g.points / 2.5)), line: `${g.hits} ratones` }),
};

// ───────── Simón de maullidos ─────────
export const PADS = [[84, 112], [156, 112], [84, 184], [156, 184]];
const simon = {
  init(g) {
    Object.assign(g, { seq: [], round: 0, phase: "intro", pt: 0, idx: 0, lit: -1, litT: 0, success: false });
    g.seq.push(Math.floor(g.rng() * 4));
  },
  tick(g, dt) {
    g.pt += dt;
    g.litT = Math.max(0, g.litT - dt);
    if (g.litT === 0) g.lit = -1;
    if (g.phase === "intro" && g.pt > 0.9) Object.assign(g, { phase: "play", pt: 0, idx: 0 });
    else if (g.phase === "play") {
      const slot = 0.65;
      const i = Math.floor(g.pt / slot);
      if (i >= g.seq.length) Object.assign(g, { phase: "input", idx: 0, pt: 0, lit: -1 });
      else if (g.pt - i * slot < 0.45) {
        if (g.lit !== g.seq[i]) g.fx.push(`tono${g.seq[i]}`);
        g.lit = g.seq[i];
        g.litT = 0.1;
      }
    } else if (g.phase === "pause" && g.pt > 0.9) {
      g.seq.push(Math.floor(g.rng() * 4));
      Object.assign(g, { phase: "play", pt: 0 });
    }
  },
  input(g, ev) {
    if (ev.type !== "down" || g.phase !== "input") return;
    const pad = PADS.findIndex(([x, y]) => Math.hypot(ev.x - x, ev.y - y) < 36);
    if (pad < 0) return;
    g.lit = pad;
    g.litT = 0.25;
    g.fx.push(`tono${pad}`);
    if (pad !== g.seq[g.idx]) {
      g.over = true;
      g.fx.push("miss");
      return;
    }
    g.idx += 1;
    if (g.idx === g.seq.length) {
      g.round += 1;
      g.fx.push("win");
      if (g.round >= 14) Object.assign(g, { over: true, success: true });
      else Object.assign(g, { phase: "pause", pt: 0 });
    }
  },
  result: (g) => ({ score: g.round * 2, stars: Math.min(14, g.round), line: `${g.round} rondas` }),
};

// ───────── Pesca en la pecera ─────────
export const POND = { top: 96, bottom: 236, rod: 62 };
const FISH = {
  pequeno: { value: 1, r: 9, min: 40, max: 70 },
  grande: { value: 2, r: 14, min: 28, max: 48 },
  dorado: { value: 5, r: 9, min: 95, max: 125 },
  globo: { value: -2, r: 12, min: 30, max: 55 },
};
const pesca = {
  init(g) {
    Object.assign(g, { fish: [], hook: { x: 120, y: POND.rod, state: "idle", fish: null }, holding: false, next: 0.3, points: 0, caught: 0 });
  },
  tick(g, dt) {
    const h = g.hook;
    g.next -= dt;
    if (g.next <= 0 && g.fish.length < 8) {
      const roll = g.rng();
      const kind = roll < 0.07 ? "dorado" : roll < 0.22 ? "globo" : roll < 0.5 ? "grande" : "pequeno";
      const def = FISH[kind];
      const dir = g.rng() < 0.5 ? 1 : -1;
      g.fish.push({ kind, x: dir > 0 ? -16 : SW + 16, y: POND.top + 22 + g.rng() * (POND.bottom - POND.top - 44), vx: dir * (def.min + g.rng() * (def.max - def.min)), hooked: false });
      g.next = 0.5 + g.rng() * 0.6;
    }
    for (const f of g.fish) if (!f.hooked) f.x += f.vx * dt;
    g.fish = g.fish.filter((f) => f.hooked || (f.x > -30 && f.x < SW + 30));
    if (h.state === "down") {
      h.y = Math.min(POND.bottom - 2, h.y + 175 * dt);
      for (const f of g.fish) {
        if (!f.hooked && !h.fish && Math.hypot(f.x - h.x, f.y - h.y) < FISH[f.kind].r + 5) {
          f.hooked = true;
          h.fish = f;
          h.state = "up";
          g.fx.push("hook");
        }
      }
      if (h.y >= POND.bottom - 2) h.state = "up";
    } else if (h.state === "up") {
      h.y = Math.max(POND.rod, h.y - 230 * dt);
      if (h.fish) Object.assign(h.fish, { x: h.x, y: h.y + 8 });
      if (h.y <= POND.rod) {
        if (h.fish) {
          const value = FISH[h.fish.kind].value;
          g.points += value;
          g.caught += value > 0 ? 1 : 0;
          g.fx.push(value > 0 ? (value >= 5 ? "gold" : "coin") : "miss");
          g.fish = g.fish.filter((f) => f !== h.fish);
          h.fish = null;
        }
        h.state = "idle";
      }
    }
    if (g.t >= 30) g.over = true;
  },
  input(g, ev) {
    const h = g.hook;
    if (ev.type === "down" && h.state === "idle") {
      h.x = clamp(ev.x, 18, SW - 18);
      h.state = "down";
      g.holding = true;
    } else if (ev.type === "move" && g.holding && h.state === "down") h.x = clamp(ev.x, 18, SW - 18);
    else if (ev.type === "up") {
      g.holding = false;
      if (h.state === "down") h.state = "up";
    } else if (ev.type === "pwr") h.x = clamp(h.x + 40, 18, SW - 18);
    else if (ev.type === "boot" && h.state === "idle") Object.assign(h, { state: "down" });
  },
  result: (g) => ({ score: Math.max(0, g.points), stars: Math.min(14, Math.ceil(Math.max(0, g.points) / 2)), line: `${g.caught} peces` }),
};
export { FISH };

const IMPL = { estrellas, laser, laberinto, carrera, cajas, topos, simon, pesca };

export function createGame(id, seed = Date.now()) {
  if (!IMPL[id]) throw new RangeError(`no existe el juego ${id}`);
  const g = { id, t: 0, over: false, fx: [], rng: makeRng(seed), seed };
  IMPL[id].init(g);
  return g;
}

export function gameTick(g, dt) {
  if (g.over) return;
  g.t += dt;
  IMPL[g.id].tick(g, dt);
}

export function gameInput(g, ev) {
  if (!g.over) IMPL[g.id].input(g, ev);
}

export const gameResult = (g) => IMPL[g.id].result(g);
export const takeFx = (g) => g.fx.splice(0);
export const timeLeft = (g) => {
  const seconds = gameById(g.id).seconds;
  return seconds ? Math.max(0, seconds - g.t) : null;
};
