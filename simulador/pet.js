// La lógica de la mascota, sin nada de pantalla: estado, paso del tiempo, acciones y mensajes del ordenador.
// Solo usa números y objetos sencillos para que pasarla al firmware de la placa sea mecánico.

export const NAME = "Tinto";

// Cuánto tarda cada necesidad en vaciarse de 100 a 0, en segundos.
export const DRAIN = { fullness: 6 * 3600, mood: 8 * 3600 };
export const LOW = { phone: 20, energy: 10, fullness: 25, mood: 30 };
export const MEAL = 25;
export const ALERT_SECONDS = 14;

export function createPet(now) {
  return {
    born: now,
    now,
    fullness: 80,
    mood: 75,
    asleep: false,
    phone: null, // { level, charging }
    claude: null, // { used }
    events: [], // { title, at } en milisegundos
    alert: null, // { kind, top, text, left } con los segundos que le quedan en pantalla
    anim: null, // { kind, t, length }
    lastPet: 0,
    alertQueue: [], // avisos que esperan su turno
    weather: null, // { kind, temp }
    surprise: null, // { kind, t, x, y }
    nextSurprise: 50, // segundos despierto hasta la próxima sorpresa
    stepsToday: 0,
  };
}

const clamp = (value, low = 0, high = 100) => Math.min(high, Math.max(low, value));

// Lo que le queda de energía: el uso de Claude que aún está libre.
export const energy = (pet) => (pet.claude ? clamp(100 - pet.claude.used) : 100);
export const exhausted = (pet) => energy(pet) <= 0;
export const sleeping = (pet) => pet.asleep || exhausted(pet);

// Un aviso en pantalla; si ya hay uno, espera su turno.
export function toast(pet, kind, top, text) {
  const alert = { kind, top, text, left: ALERT_SECONDS };
  if (!pet.alert) pet.alert = alert;
  else if (pet.alertQueue.length < 6) pet.alertQueue.push(alert);
}
const raise = toast;
function nextAlert(pet) {
  pet.alert = pet.alertQueue.shift() || null;
}

// Un mensaje del programa del ordenador. Devuelve true si lo entendió.
export function apply(pet, message) {
  if (message.t === "phone") {
    const before = pet.phone;
    pet.phone = { level: clamp(Math.round(message.level)), charging: Boolean(message.charging) };
    const wasLow = before && before.level <= LOW.phone && !before.charging;
    const isLow = pet.phone.level <= LOW.phone && !pet.phone.charging;
    if (isLow && !wasLow) raise(pet, "phone", "MÓVIL", `Al ${pet.phone.level} %: a cargar`);
    return true;
  }
  if (message.t === "claude") {
    const before = pet.claude ? pet.claude.used : 0;
    pet.claude = { used: clamp(Math.round(message.used)) };
    if (pet.claude.used >= 100 && before < 100) raise(pet, "claude", "CLAUDE", "Sin uso: a dormir");
    else if (pet.claude.used >= 100 - LOW.energy && before < 100 - LOW.energy) raise(pet, "claude", "CLAUDE", `Queda un ${100 - pet.claude.used} % de uso.`);
    return true;
  }
  if (message.t === "cal") {
    const minutes = Math.max(0, Math.round(message.minutes));
    const title = String(message.title || "Evento").slice(0, 40);
    pet.events.push({ title, at: pet.now + minutes * 60000 });
    raise(pet, "cal", minutes ? `EN ${minutes} MIN` : "AHORA", title);
    return true;
  }
  if (message.t === "claude-done") {
    raise(pet, "claude", "CLAUDE", "Ha terminado la tarea");
    if (!sleeping(pet)) play(pet, "cheer", 1.8);
    return true;
  }
  if (message.t === "claude-ask") {
    raise(pet, "claude", "CLAUDE", "Te necesita");
    if (!sleeping(pet)) play(pet, "perk", 1.4);
    return true;
  }
  if (message.t === "clap") {
    if (!sleeping(pet)) play(pet, "perk", 1.4);
    return true;
  }
  if (message.t === "steps") {
    const n = Math.max(0, Math.round(Number(message.n) || 0));
    pet.stepsToday += n;
    pet.mood = clamp(pet.mood + Math.min(8, n / 40));
    return true;
  }
  if (message.t === "weather") {
    pet.weather = { kind: String(message.kind || "clear"), temp: Number.isFinite(Number(message.temp)) ? Math.round(Number(message.temp)) : null };
    return true;
  }
  return false;
}

// `seconds` es el tiempo de la mascota (puede ir acelerado); `real` el del reloj, para animaciones y avisos.
export function tick(pet, seconds, real = seconds) {
  pet.now += seconds * 1000;
  const rest = sleeping(pet);
  pet.fullness = clamp(pet.fullness - (100 / DRAIN.fullness) * seconds * (rest ? 0.5 : 1));
  const hungry = pet.fullness < LOW.fullness;
  pet.mood = clamp(pet.mood + (rest ? 0.4 : hungry ? -2 : -1) * (100 / DRAIN.mood) * seconds);
  if (pet.anim) {
    pet.anim.t += real;
    if (pet.anim.t >= pet.anim.length) {
      if (pet.anim.kind === "eat") pet.fullness = clamp(pet.fullness + MEAL);
      pet.anim = null;
    }
  }
  if (pet.alert && (pet.alert.left -= real) <= 0) nextAlert(pet);
  const due = pet.events.find((event) => !event.rung && pet.now >= event.at);
  if (due) {
    due.rung = true;
    raise(pet, "cal", "AHORA", due.title);
  }
  pet.events = pet.events.filter((event) => pet.now < event.at + 60000);
}

const play = (pet, kind, length) => {
  pet.anim = { kind, t: 0, length };
};

export function feed(pet) {
  if (sleeping(pet) || pet.anim) return false;
  if (pet.fullness > 90) {
    play(pet, "no", 1.1);
    return false;
  }
  play(pet, "eat", 2.6);
  return true;
}

export function stroke(pet) {
  if (sleeping(pet) || pet.anim || pet.now - pet.lastPet < 1500) return false;
  pet.lastPet = pet.now;
  pet.mood = clamp(pet.mood + 4);
  play(pet, "love", 1.3);
  return true;
}

// Devuelve true si cambió algo; agotada no se despierta.
export function toggleSleep(pet) {
  if (exhausted(pet)) return false;
  pet.asleep = !pet.asleep;
  pet.anim = null;
  // Si lo despiertas de madrugada, no se vuelve a dormir solo esa noche.
  if (!pet.asleep && isNight(pet.now)) pet.nightWoke = true;
  if (pet.asleep) pet.autoSlept = false;
  return true;
}

const isNight = (ms) => {
  const hour = new Date(ms).getHours();
  return hour >= 23 || hour < 7;
};

// Tinto duerme de noche (de 23:00 a 7:00) y despierta por la mañana, salvo que lo hayas despertado tú.
export function autoSleep(pet) {
  if (isNight(pet.now)) {
    if (!pet.asleep && !pet.nightWoke && !pet.anim) {
      pet.asleep = true;
      pet.autoSlept = true;
    }
  } else {
    pet.nightWoke = false;
    if (pet.autoSlept && pet.asleep) pet.asleep = false;
    pet.autoSlept = false;
  }
}

export function reward(pet, stars) {
  pet.mood = clamp(pet.mood + Math.min(35, stars * 4));
  pet.fullness = clamp(pet.fullness - 3);
  if (stars > 0) play(pet, "love", 1.6);
}

export function dismiss(pet) {
  if (!pet.alert) return false;
  nextAlert(pet);
  return true;
}

// Sorpresas: una mariposa que cruza el cuarto o un regalo en el suelo. Se tocan para ganar estrellas.
export function surpriseTick(pet, real, rng) {
  if (sleeping(pet)) return;
  const s = pet.surprise;
  if (s) {
    s.t += real;
    if (s.kind === "mariposa") {
      s.x = -14 + s.t * 42;
      s.y = 96 + 26 * Math.sin(s.t * 2.1);
    }
    if (s.t > (s.kind === "mariposa" ? 6.4 : 9)) pet.surprise = null;
    return;
  }
  pet.nextSurprise -= real;
  if (pet.nextSurprise <= 0) {
    pet.surprise = rng() < 0.6 ? { kind: "mariposa", t: 0, x: -14, y: 96 } : { kind: "regalo", t: 0, x: 204, y: 206 };
    pet.nextSurprise = 70 + rng() * 90;
  }
}

// Devuelve el tipo de sorpresa si se tocó, y la quita.
export function tapSurprise(pet, x, y) {
  const s = pet.surprise;
  if (!s || Math.hypot(s.x - x, s.y - y) > (s.kind === "regalo" ? 24 : 26)) return null;
  pet.surprise = null;
  return s.kind;
}

// Cómo se encuentra, de lo más urgente a lo menos.
export function feeling(pet) {
  if (sleeping(pet)) return "dormido";
  if (pet.fullness < LOW.fullness) return "hambriento";
  if (pet.phone && pet.phone.level <= LOW.phone && !pet.phone.charging) return "cansado";
  if (energy(pet) <= LOW.energy) return "cansado";
  if (pet.mood < LOW.mood) return "triste";
  if (pet.mood > 70 && pet.fullness > 50) return "contento";
  return "tranquilo";
}

// La frase corta que explica por qué está así.
export function whisper(pet) {
  if (exhausted(pet)) return "Sin energía: Claude agotado";
  if (pet.asleep) return "Zzz…";
  if (pet.fullness < LOW.fullness) return "Tengo hambre";
  if (pet.phone && pet.phone.level <= LOW.phone && !pet.phone.charging) return `Tu móvil está al ${pet.phone.level} %`;
  if (energy(pet) <= LOW.energy) return `Queda un ${energy(pet)} % de Claude`;
  if (pet.mood < LOW.mood) return "¿Jugamos un rato?";
  const next = pet.events.find((event) => !event.rung);
  if (next) return `${next.title} en ${Math.max(1, Math.round((next.at - pet.now) / 60000))} min`;
  return feeling(pet) === "contento" ? "¡Qué buen día!" : "Aquí estoy";
}

// La etapa de la vida de Tinto, por los días que lleva con nosotros.
export function stage(pet) {
  const days = (pet.now - pet.born) / 86400000;
  return days < 3 ? "gatito" : days < 10 ? "joven" : "adulto";
}

export function age(pet) {
  const minutes = Math.floor((pet.now - pet.born) / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return days ? `${days} d ${hours} h` : hours ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}
