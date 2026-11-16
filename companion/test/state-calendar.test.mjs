import assert from "node:assert/strict";
import test from "node:test";
import { createCalendar } from "../calendar.mjs";
import { Hub } from "../state.mjs";

const collect = (hub) => {
  const messages = [];
  hub.on("message", (m) => messages.push(m));
  return messages;
};

test("el móvil se valida y se manda", () => {
  const hub = new Hub();
  const messages = collect(hub);
  hub.setPhone("42", "1");
  assert.deepEqual(messages, [{ t: "phone", level: 42, charging: true }]);
  for (const bad of ["", "abc", "101", "-1", undefined]) assert.throws(() => hub.setPhone(bad, 0), RangeError);
  assert.throws(() => hub.setPhone(50, "quizá"), RangeError);
});

test("Claude: manda la ventana que más pesa y una reiniciada cuenta como vacía", () => {
  let now = Date.parse("2026-01-01T10:00:00Z");
  const hub = new Hub(() => now);
  const messages = collect(hub);
  hub.setClaude([{ kind: "five_hour", percentUsed: 37.4, resetsAt: "2026-01-01T12:00:00Z" }, { kind: "seven_day", percentUsed: 12, resetsAt: "2026-01-05T00:00:00Z" }]);
  assert.deepEqual(messages.at(-1), { t: "claude", used: 37 });
  now = Date.parse("2026-01-01T12:00:01Z");
  hub.refresh();
  assert.deepEqual(messages.at(-1), { t: "claude", used: 12 });
  hub.refresh();
  assert.equal(messages.length, 2);
  assert.throws(() => hub.setClaude([]), RangeError);
  assert.throws(() => hub.setClaude([{ kind: "x", percentUsed: "nada" }]), RangeError);
  assert.throws(() => hub.setClaude([{ kind: "five_hour", percentUsed: 5, resetsAt: "no es fecha" }]), RangeError);
});

test("quien se conecta recibe lo último que se sabe", () => {
  const hub = new Hub();
  assert.deepEqual(hub.replay(), []);
  hub.setPhone(80, false);
  hub.setClaude([{ kind: "five_hour", percentUsed: 90 }]);
  assert.deepEqual(hub.replay(), [{ t: "phone", level: 80, charging: false }, { t: "claude", used: 90 }]);
});

const T0 = Date.parse("2026-01-01T10:00:00Z");
const ev = (id, title, minutes, extra = {}) => ({ id, title, start: T0 + minutes * 60000, end: T0 + (minutes + 30) * 60000, allDay: false, free: false, cancelled: false, ...extra });

test("calendario: avisa una vez dentro del margen y no antes", async () => {
  let now = T0;
  const hub = new Hub(() => now);
  const messages = collect(hub);
  const events = [ev("a", "Reunión", 25), ev("b", "Dentista", 8)];
  const calendar = createCalendar({ hub, source: { fetchUpcoming: async () => events }, leadMinutes: [10], now: () => now });
  await calendar.poll();
  assert.deepEqual(messages, [{ t: "cal", title: "Dentista", minutes: 8 }]);
  await calendar.poll();
  assert.equal(messages.length, 1);
  now = T0 + 16 * 60000;
  await calendar.poll();
  assert.deepEqual(messages.at(-1), { t: "cal", title: "Reunión", minutes: 9 });
  assert.equal(hub.upcoming.length, 1);
});

test("calendario: varios márgenes avisan en cada uno, y si ya pasaron todos, una sola vez", async () => {
  let now = T0;
  const hub = new Hub(() => now);
  const messages = collect(hub);
  const calendar = createCalendar({ hub, source: { fetchUpcoming: async () => [ev("a", "Clase", 12)] }, leadMinutes: [15, 5], now: () => now });
  await calendar.poll();
  now = T0 + 6 * 60000;
  await calendar.poll();
  assert.equal(messages.length, 1);
  now = T0 + 8 * 60000;
  await calendar.poll();
  assert.deepEqual(messages.map((m) => m.minutes), [12, 4]);
  const late = [];
  const hub2 = new Hub(() => T0);
  hub2.on("message", (m) => late.push(m));
  await createCalendar({ hub: hub2, source: { fetchUpcoming: async () => [ev("z", "Ya casi", 2)] }, leadMinutes: [15, 5], now: () => T0 }).poll();
  assert.equal(late.length, 1);
});

test("calendario: salta todo el día, libres, cancelados y los que empezaron hace rato", async () => {
  const hub = new Hub(() => T0);
  const messages = collect(hub);
  const events = [ev("1", "Cumple", 1, { allDay: true }), ev("2", "Libre", 1, { free: true }), ev("3", "Anulada", 1, { cancelled: true }), ev("4", "Antigua", -30), ev("5", "Buena", 1)];
  await createCalendar({ hub, source: { fetchUpcoming: async () => events }, now: () => T0 }).poll();
  assert.deepEqual(messages.map((m) => m.title), ["Buena"]);
});
