import assert from "node:assert/strict";
import test from "node:test";
import { occurrences, parseIcs, zonedToUtc } from "../ics.mjs";

const wrap = (...events) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${events.join("\r\n")}\r\nEND:VCALENDAR\r\n`;
const vevent = (...lines) => ["BEGIN:VEVENT", ...lines, "END:VEVENT"].join("\r\n");
const window = (from, to) => ({ from: Date.UTC(...from), to: Date.UTC(...to) });
const whole2026 = window([2026, 0, 1], [2026, 11, 31]);
const starts = (events) => events.map((e) => e.start);

test("hora UTC", () => {
  const out = parseIcs(wrap(vevent("UID:a", "SUMMARY:Reunión", "DTSTART:20260116T093000Z", "DTEND:20260116T103000Z")), whole2026);
  assert.deepEqual(starts(out), [Date.UTC(2026, 0, 16, 9, 30)]);
  assert.equal(out[0].end - out[0].start, 3600000);
  assert.equal(out[0].title, "Reunión");
});

test("zona de Windows con horario de invierno y de verano", () => {
  const winter = parseIcs(wrap(vevent("UID:w", "DTSTART;TZID=Romance Standard Time:20260116T093000")), whole2026);
  const summer = parseIcs(wrap(vevent("UID:s", "DTSTART;TZID=Romance Standard Time:20260716T093000")), whole2026);
  assert.deepEqual(starts(winter), [Date.UTC(2026, 0, 16, 8, 30)]);
  assert.deepEqual(starts(summer), [Date.UTC(2026, 6, 16, 7, 30)]);
});

test("zonedToUtc respeta el cambio de hora", () => {
  assert.equal(zonedToUtc(2026, 3, 28, 9, 0, 0, "Europe/Madrid"), Date.UTC(2026, 2, 28, 8, 0));
  assert.equal(zonedToUtc(2026, 3, 30, 9, 0, 0, "Europe/Madrid"), Date.UTC(2026, 2, 30, 7, 0));
});

test("evento diario que cruza el cambio de hora sigue a las 9 en Madrid", () => {
  const out = parseIcs(wrap(vevent("UID:d", "DTSTART;TZID=Europe/Madrid:20260326T090000", "RRULE:FREQ=DAILY;COUNT=5")), whole2026);
  assert.deepEqual(starts(out), [
    Date.UTC(2026, 2, 26, 8), Date.UTC(2026, 2, 27, 8), Date.UTC(2026, 2, 28, 8), Date.UTC(2026, 2, 29, 7), Date.UTC(2026, 2, 30, 7),
  ]);
});

test("semanal con BYDAY, COUNT y EXDATE", () => {
  const ics = wrap(vevent("UID:k", "DTSTART;TZID=Europe/Madrid:20260105T100000", "RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4", "EXDATE;TZID=Europe/Madrid:20260107T100000"));
  assert.deepEqual(starts(parseIcs(ics, whole2026)), [Date.UTC(2026, 0, 5, 9), Date.UTC(2026, 0, 12, 9), Date.UTC(2026, 0, 14, 9)]);
});

test("semanal cada dos semanas hasta una fecha", () => {
  const ics = wrap(vevent("UID:i", "DTSTART:20260105T100000Z", "RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20260131T000000Z"));
  assert.deepEqual(starts(parseIcs(ics, whole2026)), [Date.UTC(2026, 0, 5, 10), Date.UTC(2026, 0, 19, 10)]);
});

test("mensual: segundo martes", () => {
  const ics = wrap(vevent("UID:m", "DTSTART:20260106T100000Z", "RRULE:FREQ=MONTHLY;BYDAY=2TU;COUNT=3"));
  assert.deepEqual(starts(parseIcs(ics, whole2026)), [Date.UTC(2026, 0, 13, 10), Date.UTC(2026, 1, 10, 10), Date.UTC(2026, 2, 10, 10)]);
});

test("mensual: último día y anual", () => {
  const monthly = wrap(vevent("UID:l", "DTSTART:20260131T100000Z", "RRULE:FREQ=MONTHLY;BYMONTHDAY=-1;COUNT=3"));
  assert.deepEqual(starts(parseIcs(monthly, whole2026)), [Date.UTC(2026, 0, 31, 10), Date.UTC(2026, 1, 28, 10), Date.UTC(2026, 2, 31, 10)]);
  const yearly = wrap(vevent("UID:y", "DTSTART:20240229T100000Z", "RRULE:FREQ=YEARLY;COUNT=3"));
  assert.deepEqual(starts(parseIcs(yearly, window([2024, 0, 1], [2030, 0, 1]))), [Date.UTC(2024, 1, 29, 10), Date.UTC(2028, 1, 29, 10)]);
});

test("una repetición movida (RECURRENCE-ID) sustituye a la original", () => {
  const ics = wrap(
    vevent("UID:o", "DTSTART:20260105T100000Z", "RRULE:FREQ=WEEKLY;COUNT=3"),
    vevent("UID:o", "RECURRENCE-ID:20260112T100000Z", "DTSTART:20260112T150000Z", "SUMMARY:Movida"),
  );
  const out = parseIcs(ics, whole2026);
  assert.deepEqual(starts(out), [Date.UTC(2026, 0, 5, 10), Date.UTC(2026, 0, 12, 15), Date.UTC(2026, 0, 19, 10)]);
  assert.equal(out[1].title, "Movida");
});

test("todo el día, cancelado y libre", () => {
  const out = parseIcs(wrap(
    vevent("UID:t", "SUMMARY:Cumple", "DTSTART;VALUE=DATE:20260120"),
    vevent("UID:c", "SUMMARY:Anulada", "DTSTART:20260121T100000Z", "STATUS:CANCELLED"),
    vevent("UID:f", "SUMMARY:Libre", "DTSTART:20260122T100000Z", "TRANSP:TRANSPARENT"),
  ), whole2026);
  assert.equal(out.find((e) => e.title === "Cumple").allDay, true);
  assert.equal(out.find((e) => e.title === "Anulada").cancelled, true);
  assert.equal(out.find((e) => e.title === "Libre").free, true);
});

test("líneas plegadas y texto con comas escapadas", () => {
  const out = parseIcs("BEGIN:VEVENT\r\nUID:p\r\nSUMMARY:Cena\\, con\r\n  amigos\r\nDTSTART:20260116T200000Z\r\nEND:VEVENT\r\n", whole2026);
  assert.equal(out[0].title, "Cena, con amigos");
});

test("una zona desconocida avisa y no rompe", () => {
  const warnings = [];
  const out = parseIcs(wrap(vevent("UID:z", "DTSTART;TZID=Zona Inventada:20260116T093000")), { ...whole2026, warn: (text) => warnings.push(text) });
  assert.equal(out.length, 1);
  assert.match(warnings[0], /zona horaria desconocida/);
});

test("fuera de la ventana no sale nada y un evento antiguo con COUNT acaba", () => {
  const ics = wrap(vevent("UID:n", "DTSTART:20200101T100000Z", "RRULE:FREQ=DAILY;COUNT=10"));
  assert.deepEqual(parseIcs(ics, whole2026), []);
  assert.equal(occurrences({ rule: null, start: { ms: 5 } }, 0, 4).length, 0);
});
