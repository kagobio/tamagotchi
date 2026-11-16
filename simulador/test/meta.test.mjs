import assert from "node:assert/strict";
import test from "node:test";
import { GAMES } from "../games.js";
import { ITEMS, itemById } from "../items.js";
import { ACHIEVEMENTS, buy, createMeta, dailyGame, dayKey, equip, finishGame, fixMeta, isEquipped, isUnlocked, makeChallenges, record, refreshDay, unlockedIds, wantedGame } from "../meta.js";

const D1 = new Date(2026, 10, 16, 10).getTime();
const day = (n) => new Date(2026, 10, 16 + n, 10).getTime();
const result = (stars, score = stars * 2) => ({ score, stars, line: "" });

test("al principio solo están los juegos de 0 estrellas y se desbloquean con las ganadas", () => {
  const m = createMeta();
  assert.deepEqual(unlockedIds(m), GAMES.filter((g) => g.unlock === 0).map((g) => g.id));
  m.lifetime = 30;
  assert.ok(isUnlocked(m, "topos") && !isUnlocked(m, "pesca"));
  m.lifetime = 999;
  assert.equal(unlockedIds(m).length, GAMES.length);
});

test("juego del día y retos: siempre lo mismo para el mismo día, y tres retos distintos", () => {
  const ids = ["laser", "carrera", "estrellas"];
  assert.equal(dailyGame("2026-11-16", ids), dailyGame("2026-11-16", ids));
  assert.ok(ids.includes(dailyGame("2026-11-17", ids)));
  const a = makeChallenges("2026-11-16", ids);
  assert.deepEqual(a.map((c) => c.text), makeChallenges("2026-11-16", ids).map((c) => c.text));
  assert.equal(new Set(a.map((c) => c.id)).size, 3);
  assert.ok(a.every((c) => c.goal > 0 && c.reward > 0 && !c.done));
  const variety = new Set();
  for (let i = 0; i < 20; i++) makeChallenges(`2026-12-${10 + i}`, ids).forEach((c) => variety.add(c.id));
  assert.ok(variety.size >= 5, "los retos cambian de un día a otro");
});

test("la racha cuenta días seguidos y se rompe si falta uno", () => {
  const m = createMeta();
  assert.deepEqual(refreshDay(m, D1), { newDay: true, streakBonus: 0 });
  assert.equal(m.streak.days, 1);
  assert.equal(refreshDay(m, D1 + 3600000).newDay, false);
  assert.equal(refreshDay(m, day(1)).streakBonus, 2);
  assert.equal(refreshDay(m, day(2)).streakBonus, 3);
  assert.equal(m.streak.days, 3);
  assert.equal(m.stars, 5);
  refreshDay(m, day(5));
  assert.equal(m.streak.days, 1);
  assert.equal(m.challenges.list.length, 3);
});

test("las estrellas de una partida llevan bonus de variedad, juego del día y petición, y se redondean", () => {
  const m = createMeta();
  refreshDay(m, D1);
  m.daily.game = "laser";
  const first = finishGame(m, "estrellas", result(4), D1);
  assert.deepEqual([first.stars, first.bonuses], [4, []]);
  const second = finishGame(m, "laser", result(4), D1, { wanted: "laser" });
  assert.equal(second.stars, 18, "4 × 1,5 × 2 × 1,5");
  assert.deepEqual(second.bonuses, ["variedad ×1,5", "juego del día ×2", "lo que pedía ×1,5"]);
  const same = finishGame(m, "laser", result(4), D1);
  assert.equal(same.stars, 4, "sin variedad y con el juego del día ya hecho");
  const tiny = finishGame(m, "carrera", result(1), D1);
  assert.ok(tiny.stars >= 1);
  assert.equal(finishGame(m, "carrera", result(0), D1).stars, 0);
  assert.equal(m.lifetime, m.stars);
});

test("las mejores marcas, las partidas y la cartera se guardan", () => {
  const m = createMeta();
  refreshDay(m, D1);
  const a = finishGame(m, "laser", result(3, 9), D1);
  assert.equal(a.newBest, true);
  assert.equal(finishGame(m, "laser", result(1, 3), D1).newBest, false);
  assert.equal(m.best.laser, 9);
  assert.equal(m.plays.laser, 2);
  assert.equal(m.counters.plays, 2);
  assert.equal(m.lastGame, "laser");
  assert.ok(m.stars === m.lifetime && m.stars > 0);
});

test("los retos se completan una vez, dan su recompensa y los logros solo se ganan una vez", () => {
  const m = createMeta();
  refreshDay(m, D1);
  m.challenges.list = [{ id: "plays", text: "Juega 2 partidas", event: "play", goal: 2, progress: 0, reward: 5, mode: "sum", done: false }, { id: "score", text: "x", event: "score:laser", goal: 9, progress: 0, reward: 8, mode: "max", done: false }];
  const before = m.stars;
  assert.deepEqual(record(m, "play"), []);
  const done = record(m, "play");
  assert.deepEqual(done, [{ type: "reto", text: "Juega 2 partidas", reward: 5 }]);
  assert.equal(m.stars, before + 5);
  assert.deepEqual(record(m, "play"), [], "un reto hecho no se repite");
  assert.deepEqual(record(m, "score:laser", 6), []);
  assert.equal(record(m, "score:laser", 12).length, 1);
  const win = finishGame(m, "estrellas", result(2), D1);
  assert.ok(win.events.some((e) => e.type === "logro" && e.text === "Primera partida"));
  assert.ok(!finishGame(m, "estrellas", result(2), D1).events.some((e) => e.text === "Primera partida"));
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
});

test("juegos distintos en un día cuentan para el reto de variedad", () => {
  const m = createMeta();
  refreshDay(m, D1);
  m.challenges.list = [{ id: "variety", text: "Juega a 2 juegos distintos", event: "distinct", goal: 2, progress: 0, reward: 7, mode: "sum", done: false }];
  finishGame(m, "laser", result(1), D1);
  finishGame(m, "laser", result(1), D1);
  assert.equal(m.challenges.list[0].done, false);
  const last = finishGame(m, "carrera", result(1), D1);
  assert.ok(last.events.some((e) => e.type === "reto"));
});

test("lo que Tinto pide cambia, evita el último juego y no pide si está contento", () => {
  const m = createMeta();
  m.lastGame = "laser";
  const wants = new Set();
  for (let i = 0; i < 12; i++) wants.add(wantedGame(m, D1 + i * 600000, 40));
  assert.ok(!wants.has("laser") && wants.size > 1);
  assert.equal(wantedGame(m, D1, 90), null);
  assert.equal(wantedGame(m, D1, 40), wantedGame(m, D1 + 1000, 40));
});

test("tienda: comprar gasta estrellas, no deja comprar sin saldo ni dos veces, y se equipa", () => {
  const m = createMeta();
  assert.match(buy(m, "gorro").reason, /faltan 15/);
  assert.equal(buy(m, "no-existe").ok, false);
  m.stars = 100;
  assert.equal(buy(m, "gorro").ok, true);
  assert.equal(m.stars, 85);
  assert.equal(buy(m, "gorro").reason, "ya lo tienes");
  assert.equal(equip(m, "copa"), false, "no se equipa lo que no se tiene");
  assert.equal(equip(m, "gorro"), true);
  assert.ok(isEquipped(m, "gorro"));
  assert.equal(equip(m, "gorro"), true);
  assert.equal(m.equipped.hat, null, "volver a tocarlo lo quita");
  buy(m, "planta");
  buy(m, "ovillo");
  equip(m, "planta");
  equip(m, "ovillo");
  assert.deepEqual(m.equipped.decor, ["planta", "ovillo"]);
  equip(m, "planta");
  assert.deepEqual(m.equipped.decor, ["ovillo"]);
  buy(m, "rosa");
  equip(m, "rosa");
  assert.equal(m.equipped.basket, "rosa");
  assert.equal(equip(m, "natural"), true);
  assert.ok(new Set(ITEMS.map((i) => i.id)).size === ITEMS.length);
  assert.equal(itemById("corona").price, 80);
});

test("un guardado antiguo o incompleto se completa sin perder nada", () => {
  const m = fixMeta({ stars: 7, owned: { gorro: true }, equipped: { hat: "gorro" } });
  assert.equal(m.stars, 7);
  assert.ok(m.owned.gorro && m.owned.natural);
  assert.deepEqual(m.equipped.decor, []);
  assert.equal(m.equipped.basket, "natural");
  assert.equal(m.equipped.hat, "gorro");
  assert.equal(fixMeta(null).lifetime, 0);
  assert.equal(dayKey(new Date(2026, 0, 5).getTime()), "2026-01-05");
});
