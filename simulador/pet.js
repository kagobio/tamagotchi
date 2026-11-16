// La lógica de la mascota, sin nada de pantalla: estado, paso del tiempo, acciones y mensajes del ordenador.
// Solo usa números y objetos sencillos para que pasarla al firmware de la placa sea mecánico.

export const NAME = "Brote";

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
  };
}

const clamp = (value, low = 0, high = 100) => Math.min(high, Math.max(low, value));

// Lo que le queda de energía: el uso de Claude que aún está libre.
export const energy = (pet) => (pet.claude ? clamp(100 - pet.claude.used) : 100);
export const exhausted = (pet) => energy(pet) <= 0;
export const sleeping = (pet) => pet.asleep || exhausted(pet);

function raise(pet, kind, top, text) {
  pet.alert = { kind, top, text, left: ALERT_SECONDS };
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
  if (pet.alert && (pet.alert.left -= real) <= 0) pet.alert = null;
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
  return true;
}

export function reward(pet, stars) {
  pet.mood = clamp(pet.mood + Math.min(35, stars * 4));
  pet.fullness = clamp(pet.fullness - 3);
  if (stars > 0) play(pet, "love", 1.6);
}

export function dismiss(pet) {
  if (!pet.alert) return false;
  pet.alert = null;
  return true;
}

// Cómo se encuentra, de lo más urgente a lo menos.
export function feeling(pet) {
  if (sleeping(pet)) return "dormida";
  if (pet.fullness < LOW.fullness) return "hambrienta";
  if (pet.phone && pet.phone.level <= LOW.phone && !pet.phone.charging) return "cansada";
  if (energy(pet) <= LOW.energy) return "cansada";
  if (pet.mood < LOW.mood) return "triste";
  if (pet.mood > 70 && pet.fullness > 50) return "contenta";
  return "tranquila";
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
  return feeling(pet) === "contenta" ? "¡Qué buen día!" : "Aquí estoy";
}

export function age(pet) {
  const minutes = Math.floor((pet.now - pet.born) / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return days ? `${days} d ${hours} h` : hours ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}

// El minijuego: estrellas que caen por tres carriles y la mascota se coloca debajo.
export const GAME = { seconds: 20, lanes: 3, floor: 1 };

export function createGame() {
  return { t: 0, lane: 1, stars: [], caught: 0, missed: 0, next: 0.6, over: false, seed: 7 };
}

export function gameTick(game, seconds) {
  if (game.over) return;
  game.t += seconds;
  const speed = 0.45 + game.t * 0.03;
  game.next -= seconds;
  if (game.next <= 0 && game.t < GAME.seconds - 1.5) {
    game.seed = (game.seed * 1103515245 + 12345) % 2147483648;
    game.stars.push({ lane: game.seed % GAME.lanes, y: 0 });
    game.next = Math.max(0.55, 1.2 - game.t * 0.03);
  }
  for (const star of game.stars) star.y += speed * seconds;
  for (const star of game.stars.filter((item) => item.y >= GAME.floor)) {
    if (star.lane === game.lane) game.caught += 1;
    else game.missed += 1;
  }
  game.stars = game.stars.filter((item) => item.y < GAME.floor);
  if (game.t >= GAME.seconds) game.over = true;
}
