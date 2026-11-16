import assert from "node:assert/strict";
import test from "node:test";
import { apply, createPet, dismiss, feeling, feed, sleeping, stage, stroke, surpriseTick, tapSurprise, tick, toast, toggleSleep } from "../pet.js";
import { makeRng } from "../games.js";

const NOW = Date.parse("2026-11-16T10:00:00Z");

test("los avisos esperan su turno y salen de uno en uno", () => {
  const pet = createPet(NOW);
  toast(pet, "cal", "A", "primero");
  toast(pet, "logro", "B", "segundo");
  toast(pet, "reto", "C", "tercero");
  assert.equal(pet.alert.text, "primero");
  assert.equal(pet.alertQueue.length, 2);
  assert.equal(dismiss(pet), true);
  assert.equal(pet.alert.text, "segundo");
  tick(pet, 20);
  assert.equal(pet.alert.text, "tercero");
  tick(pet, 20);
  assert.equal(pet.alert, null);
  assert.equal(dismiss(pet), false);
  for (let i = 0; i < 20; i++) toast(pet, "cal", "x", String(i));
  assert.ok(pet.alertQueue.length <= 6, "la cola tiene tope");
});

test("Claude terminó y Claude te necesita avisan y animan, y duerme sin animar", () => {
  const pet = createPet(NOW);
  assert.equal(apply(pet, { t: "claude-done" }), true);
  assert.equal(pet.alert.text, "Ha terminado la tarea");
  assert.equal(pet.anim.kind, "cheer");
  const quiet = createPet(NOW);
  toggleSleep(quiet);
  apply(quiet, { t: "claude-ask" });
  assert.equal(quiet.alert.text, "Te necesita");
  assert.equal(quiet.anim, null);
  apply(pet, { t: "clap" });
  assert.equal(pet.anim.kind, "perk");
});

test("los pasos animan un poco y el tiempo se guarda", () => {
  const pet = createPet(NOW);
  pet.mood = 50;
  apply(pet, { t: "steps", n: 200 });
  assert.equal(pet.stepsToday, 200);
  assert.ok(pet.mood > 50 && pet.mood <= 58);
  apply(pet, { t: "steps", n: -5 });
  assert.equal(pet.stepsToday, 200);
  apply(pet, { t: "weather", kind: "rain", temp: 11.6 });
  assert.deepEqual(pet.weather, { kind: "rain", temp: 12 });
  apply(pet, { t: "weather", kind: "snow", temp: "frío" });
  assert.equal(pet.weather.temp, null);
  assert.equal(apply(pet, { t: "desconocido" }), false);
});

test("una sorpresa aparece con el tiempo, se puede atrapar y no sale si duerme", () => {
  const pet = createPet(NOW);
  const rng = makeRng(3);
  for (let i = 0; i < 80 && !pet.surprise; i++) surpriseTick(pet, 1, rng);
  assert.ok(pet.surprise, "aparece una sorpresa");
  const s = pet.surprise;
  assert.equal(tapSurprise(pet, s.x + 200, s.y), null);
  assert.ok(pet.surprise);
  assert.equal(tapSurprise(pet, s.x, s.y), s.kind);
  assert.equal(pet.surprise, null);
  assert.ok(pet.nextSurprise >= 70);
  const sleeper = createPet(NOW);
  toggleSleep(sleeper);
  for (let i = 0; i < 300; i++) surpriseTick(sleeper, 1, rng);
  assert.equal(sleeper.surprise, null);
  const gift = createPet(NOW);
  gift.surprise = { kind: "regalo", t: 0, x: 204, y: 206 };
  for (let i = 0; i < 10; i++) surpriseTick(gift, 1, rng);
  assert.equal(gift.surprise, null, "el regalo desaparece si nadie lo coge");
  const fly = createPet(NOW);
  fly.surprise = { kind: "mariposa", t: 0, x: -14, y: 96 };
  surpriseTick(fly, 2, rng);
  assert.ok(fly.surprise.x > 50 && fly.surprise.y > 60 && fly.surprise.y < 130);
});

test("la etapa cambia con los días y las necesidades siguen funcionando", () => {
  const pet = createPet(NOW);
  assert.equal(stage(pet), "gatito");
  pet.now = NOW + 4 * 86400000;
  assert.equal(stage(pet), "joven");
  pet.now = NOW + 11 * 86400000;
  assert.equal(stage(pet), "adulto");
  const p = createPet(NOW);
  p.fullness = 10;
  assert.equal(feeling(p), "hambriento");
  assert.equal(feed(p), true);
  tick(p, 3);
  assert.ok(p.fullness > 30);
  assert.equal(sleeping(p), false);
  p.mood = 10;
  assert.equal(stroke(p), true);
  assert.equal(stroke(p), false, "no se puede acariciar sin parar");
});
