import assert from "node:assert/strict";
import test from "node:test";
import { BOX_SLOTS, GAMES, HOLES, LANES, MAZE, PADS, POND, RUN, createGame, gameInput, gameResult, gameTick, makeMaze, makeRng, pushOut, takeFx } from "../games.js";

const DT = 1 / 30;
const play = (g, seconds, bot = () => {}) => {
  for (let i = 0; i < seconds / DT && !g.over; i++) {
    bot(g);
    gameTick(g, DT);
  }
};

test("el generador de números al azar es repetible", () => {
  const a = makeRng(7);
  const b = makeRng(7);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  assert.notEqual(makeRng(8)(), makeRng(7)());
});

test("todos los juegos acaban solos y dan un resultado en orden", () => {
  for (const def of GAMES) {
    const g = createGame(def.id, 3);
    play(g, 120);
    const r = gameResult(g);
    assert.ok(Number.isFinite(r.score) && r.score >= 0, `${def.id} puntos`);
    assert.ok(Number.isInteger(r.stars) && r.stars >= 0 && r.stars <= 14, `${def.id} estrellas ${r.stars}`);
    assert.equal(typeof r.line, "string");
    if (def.seconds) assert.equal(g.over, true, `${def.id} debería acabar`);
  }
  assert.throws(() => createGame("no-existe"), RangeError);
});

test("estrellas: seguir la estrella más baja da muchos puntos, no hacer nada da pocos", () => {
  const smart = createGame("estrellas", 11);
  play(smart, 30, (g) => {
    const low = [...g.stars].sort((a, b) => b.y - a.y)[0];
    if (low) gameInput(g, { type: "down", x: LANES[low.lane], y: 200 });
  });
  const idle = createGame("estrellas", 11);
  play(idle, 30);
  assert.ok(smart.over && gameResult(smart).score >= 12, `lista: ${gameResult(smart).score}`);
  assert.ok(gameResult(smart).score > gameResult(idle).score);
  const g = createGame("estrellas", 1);
  gameInput(g, { type: "pwr" });
  assert.equal(g.lane, 2);
  gameInput(g, { type: "boot" });
  assert.equal(g.lane, 1);
});

test("láser: quedarse quieto cuando se agazapa caza; moverse sin parar no caza nada", () => {
  const calm = createGame("laser", 5);
  gameInput(calm, { type: "down", x: 120, y: 190 });
  play(calm, 30);
  assert.ok(calm.catches >= 3, `presas ${calm.catches}`);
  const restless = createGame("laser", 5);
  let n = 0;
  gameInput(restless, { type: "down", x: 120, y: 190 });
  play(restless, 30, (g) => gameInput(g, { type: "move", x: 100 + 50 * Math.sin(n++ * 0.5), y: 185 }));
  assert.equal(restless.catches, 0);
  const high = createGame("laser", 5);
  gameInput(high, { type: "down", x: 120, y: 80 });
  play(high, 30);
  assert.equal(high.catches, 0, "en lo alto no se caza");
  gameInput(high, { type: "down", x: -50, y: 9999 });
  assert.ok(high.dot.x >= 8 && high.dot.y <= 206);
});

test("carrera: saltar a tiempo se sobrevive, no saltar pierde las vidas", () => {
  const idle = createGame("carrera", 2);
  play(idle, 30);
  assert.equal(idle.lives, 0);
  assert.ok(idle.over && idle.t < 20);
  const runner = createGame("carrera", 2);
  play(runner, 30, (g) => {
    const next = g.obs.find((o) => o.x + o.w > RUN.px - RUN.half);
    if (next && next.x - RUN.px < 44 && next.x - RUN.px > 26 && g.y === 0) gameInput(g, { type: "down", x: 0, y: 0 });
  });
  assert.ok(runner.lives >= 2, `vidas ${runner.lives}`);
  assert.ok(gameResult(runner).score > gameResult(idle).score);
  assert.ok(takeFx(runner).includes("jump"));
  assert.equal(takeFx(runner).length, 0);
  const g = createGame("carrera", 1);
  gameInput(g, { type: "down" });
  gameInput(g, { type: "down" });
  gameInput(g, { type: "down" });
  assert.equal(g.jumps, 2, "doble salto como máximo");
});

test("laberinto: el laberinto se puede recorrer y la bola no atraviesa las paredes", () => {
  const maze = makeMaze(makeRng(4));
  const seen = new Set(["0,0"]);
  const stack = [[0, 0]];
  while (stack.length) {
    const [c, r] = stack.pop();
    const open = [[c + 1, r, !maze.right[c]?.[r]], [c - 1, r, c > 0 && !maze.right[c - 1][r]], [c, r + 1, !maze.down[c]?.[r]], [c, r - 1, r > 0 && !maze.down[c][r - 1]]];
    for (const [x, y, ok] of open) if (ok && x >= 0 && y >= 0 && x < maze.cols && y < maze.rows && !seen.has(`${x},${y}`)) { seen.add(`${x},${y}`); stack.push([x, y]); }
  }
  assert.equal(seen.size, maze.cols * maze.rows, "todas las celdas se alcanzan");
  const wall = { x: 100, y: 0, w: 5, h: 100 };
  const ball = { x: 90, y: 50, vx: 200, vy: 0 };
  for (let i = 0; i < 120; i++) {
    ball.x += ball.vx / 60;
    pushOut(ball, wall);
  }
  assert.ok(ball.x <= wall.x - MAZE.radius + 0.5, `la bola quedó en ${ball.x}`);
  const g = createGame("laberinto", 9);
  gameTick(g, DT);
  g.tilt = { x: -1, y: -1 };
  play(g, 8);
  assert.ok(g.ball.x >= MAZE.ox && g.ball.y >= MAZE.oy, "no sale por la esquina");
});

test("laberinto: un robot que sigue el camino llega a la meta", () => {
  const g = createGame("laberinto", 21);
  let levelAtStart = g.level;
  const route = () => {
    const { maze } = g;
    const goal = g.goal.join(",");
    const from = [Math.floor((g.ball.x - MAZE.ox) / MAZE.cell), Math.floor((g.ball.y - MAZE.oy) / MAZE.cell)];
    const prev = new Map([[from.join(","), null]]);
    const queue = [from];
    while (queue.length) {
      const [c, r] = queue.shift();
      if (`${c},${r}` === goal) break;
      const options = [[c + 1, r, c < maze.cols - 1 && !maze.right[c][r]], [c - 1, r, c > 0 && !maze.right[c - 1][r]], [c, r + 1, r < maze.rows - 1 && !maze.down[c][r]], [c, r - 1, r > 0 && !maze.down[c][r - 1]]];
      for (const [x, y, ok] of options) if (ok && !prev.has(`${x},${y}`)) { prev.set(`${x},${y}`, [c, r]); queue.push([x, y]); }
    }
    let at = g.goal;
    let step = at;
    while (prev.get(at.join(",")) && prev.get(at.join(",")).join(",") !== from.join(",")) at = prev.get(at.join(","));
    step = at;
    return step;
  };
  play(g, 45, () => {
    const [c, r] = route();
    const tx = MAZE.ox + (c + 0.5) * MAZE.cell;
    const ty = MAZE.oy + (r + 0.5) * MAZE.cell;
    g.tilt = { x: Math.max(-1, Math.min(1, (tx - g.ball.x) * 0.09 - g.ball.vx * 0.03)), y: Math.max(-1, Math.min(1, (ty - g.ball.y) * 0.09 - g.ball.vy * 0.03)) };
  });
  assert.ok(g.level > levelAtStart, `laberintos ${g.level}`);
  assert.ok(gameResult(g).score >= 5);
});

test("cajas: acertar sube la ronda, fallar cuesta una vida", () => {
  const find = (g) => g.boxes.find((b) => b.id === g.ball).slot;
  const win = createGame("cajas", 6);
  play(win, 80, (g) => { if (g.phase === "pick") gameInput(g, { type: "down", x: BOX_SLOTS[find(g)], y: 160 }); });
  assert.ok(win.score >= 6, `aciertos ${win.score}`);
  assert.equal(win.lives, 3);
  const lose = createGame("cajas", 6);
  play(lose, 80, (g) => { if (g.phase === "pick") gameInput(g, { type: "down", x: BOX_SLOTS[(find(g) + 1) % 3], y: 160 }); });
  assert.equal(lose.lives, 0);
  assert.ok(lose.over);
  const early = createGame("cajas", 6);
  gameInput(early, { type: "down", x: 120, y: 160 });
  assert.equal(early.score + (3 - early.lives), 0, "no se puede elegir antes de tiempo");
});

test("cazaratones: los ratones suman y los pájaros restan", () => {
  const g = createGame("topos", 8);
  let birds = 0;
  play(g, 30, (game) => {
    for (const e of game.ents) {
      if (e.state !== "up") continue;
      if (e.kind === "pajaro") continue;
      const [x, y] = HOLES[e.hole];
      gameInput(game, { type: "down", x, y: y - 6 });
    }
  });
  assert.ok(g.points >= 8 && g.hits >= 8, `puntos ${g.points}`);
  const clumsy = createGame("topos", 8);
  play(clumsy, 30, (game) => {
    for (const e of game.ents) if (e.state === "up" && e.kind === "pajaro" && birds++ < 1) gameInput(game, { type: "down", x: HOLES[e.hole][0], y: HOLES[e.hole][1] - 6 });
  });
  assert.ok(clumsy.bad >= 1);
  assert.ok(clumsy.points >= 0);
});

test("simón: repetir bien la secuencia sube de ronda y equivocarse acaba", () => {
  const g = createGame("simon", 12);
  play(g, 400, (game) => {
    if (game.phase === "input") {
      const [x, y] = PADS[game.seq[game.idx]];
      gameInput(game, { type: "down", x, y });
    }
  });
  assert.equal(g.success, true);
  assert.equal(gameResult(g).score, 28);
  const wrong = createGame("simon", 12);
  play(wrong, 400, (game) => {
    if (game.phase === "input") {
      const [x, y] = PADS[(game.seq[game.idx] + 1) % 4];
      gameInput(game, { type: "down", x, y });
    }
  });
  assert.ok(wrong.over && !wrong.success);
});

test("pesca: mantener baja el anzuelo, soltar lo sube y se pescan peces", () => {
  const g = createGame("pesca", 15);
  let target = null;
  play(g, 30, (game) => {
    if (game.hook.state === "idle") {
      target = game.fish.filter((f) => f.kind !== "globo" && f.y > 110).sort((a, b) => Math.abs(a.x - 120) - Math.abs(b.x - 120))[0];
      if (target) gameInput(game, { type: "down", x: target.x + target.vx * ((target.y - POND.rod) / 175), y: 100 });
    } else if (game.hook.state === "down" && game.hook.y > (target ? target.y + 6 : 0)) gameInput(game, { type: "up" });
  });
  assert.ok(g.caught >= 1, `peces ${g.caught}`);
  const fresh = createGame("pesca", 1);
  gameInput(fresh, { type: "down", x: 100, y: 100 });
  assert.equal(fresh.hook.state, "down");
  gameInput(fresh, { type: "up" });
  assert.equal(fresh.hook.state, "up");
});
