// Une la lógica, el dibujo y las entradas (táctil, botones, inclinación) con el panel de pruebas.
import { BAR, MENU, SLOTS } from "./draw.js";
import { H, SCALE, W } from "./gfx.js";
import { KINDS, itemById, itemsOf } from "./items.js";
import * as G from "./games.js";
import * as Meta from "./meta.js";
import * as Pet from "./pet.js";
import { drawScreen } from "./screens.js";
import { UI, inCircle, inRect } from "./drawui.js";
import * as Sfx from "./sfx.js";

const KEY = "tinto-v2";
const $ = (id) => document.getElementById(id);
const canvas = $("screen");
const ctx = canvas.getContext("2d");
canvas.width = W * SCALE;
canvas.height = H * SCALE;
const paint = (v) => {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  drawScreen(ctx, v);
};
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved.fullness === "number") return { ...Pet.createPet(Date.now()), ...saved, now: Date.now(), anim: null, alert: null, alertQueue: [], surprise: null, nextSurprise: 50 };
  } catch {
    /* sin almacenamiento: se empieza de cero */
  }
  return null;
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(pet));
  } catch {
    /* sin almacenamiento */
  }
}

let pet = load();
if (!pet) pet = Pet.createPet(Date.now());
pet.meta = Meta.fixMeta(pet.meta);
const view = { pet, meta: pet.meta, t: 0, screen: "home", menu: 0, game: null, hub: { i: 0 }, shop: { tab: "hat", i: 0 }, info: { tab: 0 }, result: null, focus: null, shopMsg: null, wants: null, outfit: {}, basket: "natural", off: false };
let speed = 1;
let bootLeft = 0;
let idle = 0;

const syncOutfit = () => {
  const eq = view.meta.equipped;
  view.outfit = { hat: eq.hat, collar: eq.collar };
  view.basket = eq.basket;
};
syncOutfit();

// Lo que mandaría el programa del ordenador por USB o Bluetooth: una línea JSON por mensaje.
const log = [];
function send(message) {
  Pet.apply(pet, message);
  if (message.t === "steps") {
    const n = Math.max(0, Math.round(Number(message.n) || 0));
    const c = view.meta.counters;
    c.steps += n;
    c.stepBank = (c.stepBank || 0) + n;
    while (c.stepBank >= 200) {
      c.stepBank -= 200;
      toastEvents(Meta.award(view.meta, 1));
    }
    toastEvents(Meta.checkAchievements(view.meta, pet.now));
  } else if (message.t === "clap") {
    view.meta.counters.claps += 1;
    Sfx.play("meow");
  } else if (message.t === "claude-done" || message.t === "claude-ask") Sfx.play("toast");
  log.unshift(JSON.stringify(message));
  log.length = Math.min(log.length, 6);
  $("log").textContent = log.join("\n");
  wake();
}
const wake = () => {
  view.off = false;
  idle = 0;
};

const toastEvents = (events) => {
  for (const e of events) Pet.toast(pet, e.type, e.type === "reto" ? "RETO CUMPLIDO" : "LOGRO", `${e.text} +${e.reward}`);
  if (events.length) Sfx.play("toast");
};

// ───────── navegación ─────────
const go = (screen) => {
  view.screen = screen;
  idle = 0;
};

function startGame(id) {
  if (!Meta.isUnlocked(view.meta, id)) {
    Sfx.play("error");
    return;
  }
  view.game = G.createGame(id, (Date.now() ^ (Math.random() * 1e9)) >>> 0);
  go("game");
  Sfx.play("tap");
}

function finishGame() {
  const g = view.game;
  const result = G.gameResult(g);
  const summary = Meta.finishGame(view.meta, g.id, result, pet.now, { wanted: view.wants });
  Pet.reward(pet, summary.stars);
  view.result = { id: g.id, result, summary, t: 0 };
  go("result");
  Sfx.play(result.stars > 0 ? "win" : "miss");
}

function act(name) {
  if (name === "comer") {
    if (Pet.feed(pet)) toastEvents(Meta.record(view.meta, "feed", 1));
  } else if (name === "dormir") Pet.toggleSleep(pet);
  else if (name === "estado") {
    view.info.tab = 0;
    go("info");
  } else if (name === "tienda") go("shop");
  else if (name === "jugar") {
    if (Pet.sleeping(pet)) {
      Sfx.play("error");
      return;
    }
    go("hub");
  }
}

function shopAction() {
  const list = itemsOf(view.shop.tab);
  const item = list[Math.min(view.shop.i, list.length - 1)];
  const meta = view.meta;
  if (!meta.owned[item.id]) {
    const r = Meta.buy(meta, item.id);
    if (r.ok) {
      Meta.equip(meta, item.id);
      syncOutfit();
      view.shopMsg = { text: "¡Comprado!", t: 2 };
      Sfx.play("buy");
      toastEvents(r.events);
    } else {
      view.shopMsg = { text: r.reason, t: 2 };
      Sfx.play("error");
    }
  } else {
    Meta.equip(meta, item.id);
    syncOutfit();
    Sfx.play("tap");
  }
}

const shopStep = (d) => {
  const list = itemsOf(view.shop.tab);
  view.shop.i = (view.shop.i + d + list.length) % list.length;
  Sfx.play("tap");
};
const hubStep = (d) => {
  view.hub.i = (view.hub.i + d + G.GAMES.length) % G.GAMES.length;
  Sfx.play("tap");
};
const startFocus = () => {
  view.focus = { start: pet.now, length: 25 * 60000, done: false, reward: 10 };
  go("focus");
};

// ───────── botones de la placa ─────────
// PWR: pulsación corta pasa a la opción siguiente; mantenida apaga o enciende la pantalla.
function pwr(long) {
  if (long) {
    view.off = !view.off;
    return;
  }
  if (view.off) return wake();
  idle = 0;
  const s = view.screen;
  if (s === "home") {
    if (!Pet.dismiss(pet)) view.menu = (view.menu + 1) % MENU.length;
  } else if (s === "hub") hubStep(1);
  else if (s === "shop") {
    const list = itemsOf(view.shop.tab);
    if (view.shop.i < list.length - 1) shopStep(1);
    else {
      const k = KINDS.findIndex((x) => x.id === view.shop.tab);
      if (k < KINDS.length - 1) view.shop = { tab: KINDS[k + 1].id, i: 0 };
      else go("home");
    }
  } else if (s === "info") {
    if (view.info.tab < 2) view.info.tab += 1;
    else go("home");
  } else if (s === "game") G.gameInput(view.game, { type: "pwr" });
  else if (s === "result") go("hub");
  else go("home");
}

// BOOT: confirma.
function boot() {
  if (view.off) return wake();
  idle = 0;
  const s = view.screen;
  if (s === "home") {
    if (!Pet.dismiss(pet)) act(MENU[view.menu]);
  } else if (s === "hub") startGame(G.GAMES[view.hub.i].id);
  else if (s === "shop") shopAction();
  else if (s === "info") go("home");
  else if (s === "game") G.gameInput(view.game, { type: "boot" });
  else if (s === "result") startGame(view.result.id);
  else go("home");
}

function reset() {
  save();
  bootLeft = 0.6;
  go("home");
  view.game = null;
  view.off = false;
}

// ───────── pantalla táctil ─────────
function pointerDown(x, y) {
  if (view.off) return wake();
  idle = 0;
  const s = view.screen;
  if (s === "home") {
    if (Pet.dismiss(pet)) return;
    const found = Pet.tapSurprise(pet, x, y);
    if (found) {
      toastEvents(Meta.award(view.meta, found === "regalo" ? 3 : 1, "surprises"));
      Pet.toast(pet, "regalo", found === "regalo" ? "¡UN REGALO!" : "¡LA HAS ATRAPADO!", `+${found === "regalo" ? 3 : 1} estrellas`);
      Sfx.play("gold");
      return;
    }
    if (y >= BAR.y - 4) {
      const slot = SLOTS.findIndex((cx) => Math.abs(cx - x) <= BAR.size / 2 + 4);
      if (slot >= 0) {
        view.menu = slot;
        act(MENU[slot]);
      }
    } else if (y > 80 && y < 200 && Math.abs(x - 120) < 70 && Pet.stroke(pet)) {
      toastEvents(Meta.record(view.meta, "pet", 1));
      Sfx.play("meow");
    }
  } else if (s === "hub") {
    if (inCircle({ ...UI.back, r: 18 }, x, y)) go("home");
    else if (inCircle(UI.hub.prev, x, y)) hubStep(-1);
    else if (inCircle(UI.hub.next, x, y)) hubStep(1);
    else if (inRect(UI.hub.play, x, y) || inRect(UI.hub.card, x, y)) startGame(G.GAMES[view.hub.i].id);
  } else if (s === "shop") {
    if (inCircle({ ...UI.back, r: 18 }, x, y)) go("home");
    else if (inCircle(UI.shop.prev, x, y)) shopStep(-1);
    else if (inCircle(UI.shop.next, x, y)) shopStep(1);
    else if (inRect(UI.shop.action, x, y)) shopAction();
    else for (const tab of UI.shop.tabs) if (inRect(tab, x, y)) view.shop = { tab: tab.id, i: 0 };
  } else if (s === "info") {
    if (inCircle({ ...UI.back, r: 18 }, x, y)) go("home");
    else {
      UI.info.tabs.forEach((r, i) => {
        if (inRect(r, x, y)) view.info.tab = i;
      });
      if (view.info.tab === 0 && inRect(UI.info.focus, x, y)) startFocus();
      else if (view.info.tab === 0 && inRect(UI.info.clock, x, y)) go("clock");
    }
  } else if (s === "game") {
    if (inCircle({ ...UI.back, r: 18 }, x, y)) {
      view.game.over = true;
      return;
    }
    G.gameInput(view.game, { type: "down", x, y });
  } else if (s === "result") {
    if (inRect(UI.result.again, x, y)) startGame(view.result.id);
    else if (inRect(UI.result.exit, x, y)) go("hub");
  } else if (s === "focus") {
    if (inRect(UI.focus.exit, x, y)) go("home");
  } else if (s === "clock") go("home");
}
const pointerMove = (x, y) => {
  if (view.screen === "game") G.gameInput(view.game, { type: "move", x, y });
};
const pointerUp = () => {
  if (view.screen === "game") G.gameInput(view.game, { type: "up" });
};

const toScreen = (event) => {
  const box = canvas.getBoundingClientRect();
  return [((event.clientX - box.left) * W) / box.width, ((event.clientY - box.top) * H) / box.height];
};
canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  pointerDown(...toScreen(event));
});
canvas.addEventListener("pointermove", (event) => pointerMove(...toScreen(event)));
for (const type of ["pointerup", "pointercancel"]) canvas.addEventListener(type, pointerUp);

let held = 0;
let heldTimer = 0;
const power = $("pwr");
power.addEventListener("pointerdown", () => {
  held = performance.now();
  heldTimer = setTimeout(() => {
    held = 0;
    pwr(true);
  }, 700);
});
for (const type of ["pointerup", "pointerleave", "pointercancel"])
  power.addEventListener(type, () => {
    clearTimeout(heldTimer);
    if (held && type === "pointerup") pwr(false);
    held = 0;
  });
power.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    pwr(false);
  }
});
$("boot").addEventListener("click", boot);
$("rst").addEventListener("click", reset);

// ───────── inclinación: panel, teclado y giroscopio ─────────
const tiltInput = { pad: { x: 0, y: 0 }, keys: { x: 0, y: 0 }, gyro: null };
const pad = $("tilt-pad");
const knob = $("tilt-knob");
const setPad = (event) => {
  const box = pad.getBoundingClientRect();
  tiltInput.pad = { x: clamp(((event.clientX - box.left) / box.width - 0.5) * 2, -1, 1), y: clamp(((event.clientY - box.top) / box.height - 0.5) * 2, -1, 1) };
};
pad.addEventListener("pointerdown", (event) => {
  pad.setPointerCapture(event.pointerId);
  setPad(event);
});
pad.addEventListener("pointermove", (event) => {
  if (pad.hasPointerCapture(event.pointerId)) setPad(event);
});
for (const type of ["pointerup", "pointercancel"]) pad.addEventListener(type, () => (tiltInput.pad = { x: 0, y: 0 }));
const heldKeys = new Set();
const keyTilt = () => ({ x: (heldKeys.has("ArrowRight") || heldKeys.has("d") ? 1 : 0) - (heldKeys.has("ArrowLeft") || heldKeys.has("a") ? 1 : 0), y: (heldKeys.has("ArrowDown") || heldKeys.has("s") ? 1 : 0) - (heldKeys.has("ArrowUp") || heldKeys.has("w") ? 1 : 0) });
$("device").addEventListener("keydown", (event) => {
  if (event.target !== $("device")) return;
  const tilting = view.screen === "game" && view.game.id === "laberinto";
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "d", "w", "s"].includes(event.key) && tilting) {
    heldKeys.add(event.key);
    tiltInput.keys = keyTilt();
  } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") pwr(false);
  else if (event.key === "Enter" || event.key === " ") boot();
  else return;
  event.preventDefault();
});
$("device").addEventListener("keyup", (event) => {
  heldKeys.delete(event.key);
  tiltInput.keys = keyTilt();
});
$("gyro").addEventListener("click", async () => {
  try {
    if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) {
      const answer = await DeviceOrientationEvent.requestPermission();
      if (answer !== "granted") return;
    }
    window.addEventListener("deviceorientation", (event) => {
      if (event.gamma === null) return;
      tiltInput.gyro = { x: clamp(event.gamma / 25, -1, 1), y: clamp((event.beta - 35) / 25, -1, 1) };
    });
    $("gyro").textContent = "Giroscopio activado";
  } catch {
    $("gyro").textContent = "Este dispositivo no da el giroscopio";
  }
});
const currentTilt = () => {
  const out = { x: 0, y: 0 };
  for (const source of [tiltInput.pad, tiltInput.keys, tiltInput.gyro]) {
    if (!source) continue;
    if (Math.abs(source.x) > Math.abs(out.x)) out.x = source.x;
    if (Math.abs(source.y) > Math.abs(out.y)) out.y = source.y;
  }
  return out;
};

// ───────── panel de pruebas ─────────
const phone = () => send({ t: "phone", level: Number($("phone-level").value), charging: $("phone-charging").checked });
$("phone-level").addEventListener("input", () => {
  $("phone-out").textContent = `${$("phone-level").value} %`;
  phone();
});
$("phone-charging").addEventListener("change", phone);
$("claude-used").addEventListener("input", () => {
  $("claude-out").textContent = `${$("claude-used").value} % usado`;
  send({ t: "claude", used: Number($("claude-used").value) });
});
$("cal-form").addEventListener("submit", (event) => {
  event.preventDefault();
  send({ t: "cal", title: $("cal-title").value.trim() || "Evento", minutes: Number($("cal-minutes").value) });
});
$("claude-done").addEventListener("click", () => send({ t: "claude-done" }));
$("claude-ask").addEventListener("click", () => send({ t: "claude-ask" }));
$("steps-btn").addEventListener("click", () => send({ t: "steps", n: 100 }));
$("clap-btn").addEventListener("click", () => send({ t: "clap" }));
const weather = () => send({ t: "weather", kind: $("weather-kind").value, temp: Number($("weather-temp").value) });
$("weather-kind").addEventListener("change", weather);
$("weather-temp").addEventListener("input", weather);
$("sound").addEventListener("change", () => (Sfx.sound.muted = !$("sound").checked));
$("unlock").addEventListener("click", () => {
  view.meta.lifetime = Math.max(view.meta.lifetime, 80);
});
$("give-stars").addEventListener("click", () => {
  Meta.award(view.meta, 50);
});
for (const input of document.querySelectorAll('input[name="speed"]')) input.addEventListener("change", () => (speed = Number(input.value)));
$("restart").addEventListener("click", () => {
  pet = Pet.createPet(Date.now());
  pet.meta = Meta.fixMeta(null);
  view.pet = pet;
  view.meta = pet.meta;
  syncOutfit();
  Meta.refreshDay(view.meta, pet.now);
  go("home");
  view.game = null;
  phone();
  send({ t: "claude", used: Number($("claude-used").value) });
  save();
});

if (pet.phone) {
  $("phone-level").value = pet.phone.level;
  $("phone-charging").checked = pet.phone.charging;
}
if (pet.claude) $("claude-used").value = pet.claude.used;
$("phone-out").textContent = `${$("phone-level").value} %`;
$("claude-out").textContent = `${$("claude-used").value} % usado`;
// Si la página la sirve el programa del ordenador (con ?key=…), se conecta y Tinto vive con tus datos de verdad.
const liveKey = new URLSearchParams(location.search).get("key");
const live = Boolean(liveKey) && location.protocol.startsWith("http");
if (!live) {
  phone();
  send({ t: "claude", used: Number($("claude-used").value) });
}
pet.alert = null;
pet.alertQueue = [];

function showLive(text, state) {
  const badge = $("live");
  badge.textContent = text;
  badge.dataset.state = state;
  badge.hidden = false;
}
function connectLive() {
  $("manual-title").textContent = "Datos en directo (puedes probar a mano)";
  showLive("Conectando con el programa del ordenador…", "wait");
  const source = new EventSource(`/events?key=${encodeURIComponent(liveKey)}`);
  source.onopen = () => showLive("Conectado al programa del ordenador", "ok");
  source.onerror = () => showLive("Sin conexión con el programa del ordenador: reintentando", "off");
  source.onmessage = (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message.t === "phone") {
      $("phone-level").value = message.level;
      $("phone-charging").checked = message.charging;
      $("phone-out").textContent = `${message.level} %`;
    } else if (message.t === "claude") {
      $("claude-used").value = message.used;
      $("claude-out").textContent = `${message.used} % usado`;
    }
    send(message);
  };
}
if (live) connectLive();

function status() {
  const feeling = Pet.feeling(pet);
  $("state").textContent = `${Pet.NAME} está ${feeling}`;
  $("needs").textContent = `hambre ${Math.round(pet.fullness)} % · ánimo ${Math.round(pet.mood)} % · energía ${Pet.energy(pet)} % · ${view.meta.stars} estrellas`;
}

// ───────── el bucle ─────────
const day = Meta.refreshDay(view.meta, pet.now);
if (day.streakBonus) Pet.toast(pet, "reto", `RACHA DE ${view.meta.streak.days} DÍAS`, `+${day.streakBonus} estrellas`);
let last = 0;
let saved = 0;
let slow = 0;
function frame(now) {
  const real = last ? Math.min((now - last) / 1000, 0.1) : 0;
  last = now;
  if (!still.matches) view.t += real;
  if (bootLeft > 0) {
    bootLeft -= real;
    paint({ ...view, off: true });
  } else {
    Pet.tick(pet, real * speed, real);
    idle += real;
    if (view.shopMsg) view.shopMsg.t -= real;
    if (view.screen === "home") Pet.surpriseTick(pet, real, Math.random);
    slow += real;
    if (slow > 4) {
      slow = 0;
      view.wants = Pet.sleeping(pet) ? null : Meta.wantedGame(view.meta, pet.now, pet.mood);
      const d = Meta.refreshDay(view.meta, pet.now);
      if (d.streakBonus) Pet.toast(pet, "reto", `RACHA DE ${view.meta.streak.days} DÍAS`, `+${d.streakBonus} estrellas`);
    }
    if (view.screen === "game") {
      const g = view.game;
      if (g.tilt) g.tilt = currentTilt();
      G.gameTick(g, real);
      for (const name of G.takeFx(g)) Sfx.play(name);
      if (g.over) finishGame();
    } else if (view.screen === "result") view.result.t += real;
    else if (view.screen === "focus") {
      const f = view.focus;
      if (!f.done && pet.now - f.start >= f.length) {
        f.done = true;
        view.meta.counters.focus += 1;
        toastEvents(Meta.award(view.meta, f.reward));
        Sfx.play("win");
      }
    } else if (view.screen === "home" && idle > 90 && !pet.alert) go("clock");
    paint(view);
  }
  const k = currentTilt();
  knob.style.transform = `translate(${k.x * 38}px, ${k.y * 38}px)`;
  if (now - saved > 4000) {
    saved = now;
    save();
    status();
  }
  requestAnimationFrame(frame);
}
status();
requestAnimationFrame(frame);

// Para las pruebas automáticas: leer el estado desde fuera.
window.__tinto = { view, go, startGame, pwr, boot, send, Meta, G, setSpeed: (n) => (speed = n), pointerDown, pointerMove, pointerUp, itemById };
