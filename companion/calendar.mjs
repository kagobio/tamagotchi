// Mira el calendario cada poco y avisa de cada evento una sola vez antes de que empiece.
export function createCalendar({ hub, source, leadMinutes = [10], skipAllDay = true, skipFree = true, horizonHours = 24, now = () => Date.now(), log = () => {} }) {
  const sent = new Map();
  const leads = [...leadMinutes].sort((a, b) => a - b);

  async function poll() {
    const t = now();
    const raw = await source.fetchUpcoming(t - 5 * 60000, t + horizonHours * 3600000);
    const events = raw
      .filter((e) => !e.cancelled && !(skipAllDay && e.allDay) && !(skipFree && e.free))
      .sort((a, b) => a.start - b.start);
    hub.setUpcoming(events.filter((e) => e.start >= t - 60000).slice(0, 10).map(({ title, start }) => ({ title, start })));
    let told = 0;
    for (const event of events) {
      const minutes = (event.start - t) / 60000;
      if (minutes < -1) continue;
      const due = leads.filter((lead) => minutes <= lead && !sent.has(`${event.id}|${event.start}|${lead}`));
      if (!due.length) continue;
      due.forEach((lead) => sent.set(`${event.id}|${event.start}|${lead}`, event.start));
      hub.notify(event.title, minutes);
      told += 1;
      log(`aviso: «${event.title}» en ${Math.max(0, Math.round(minutes))} min`);
    }
    for (const [key, start] of sent) if (start < t - 3600000) sent.delete(key);
    return { events: events.length, told };
  }
  return { poll };
}
