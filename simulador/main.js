// Une la lógica (pet.js) y el dibujo (draw.js) con los botones, el táctil y el panel de pruebas.
import * as Pet from "./pet.js";
import { BAR, H, LANES, MENU, SCALE, SLOTS, W, drawScreen } from "./draw.js";

const KEY = "tinto-v1";
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

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved.fullness === "number") return { ...Pet.createPet(Date.now()), ...saved, now: Date.now(), anim: null, alert: null };
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
const fresh = !pet;
if (fresh) pet = Pet.createPet(Date.now());
const view = { pet, t: 0, screen: "home", menu: 0, game: null, off: false };
let speed = 1;
let resultLeft = 0;
let bootLeft = 0;

// Lo que mandaría el programa del ordenador por USB o Bluetooth: una línea JSON por mensaje.
const log = [];
function send(message) {
  Pet.apply(pet, message);
  log.unshift(JSON.stringify(message));
  log.length = Math.min(log.length, 6);
  $("log").textContent = log.join("\n");
  wake();
}

function wake() {
  view.off = false;
}

function act(name) {
  if (name === "comer") Pet.feed(pet);
  else if (name === "dormir") Pet.toggleSleep(pet);
  else if (name === "estado") view.screen = "info";
  else if (name === "jugar") {
    if (Pet.sleeping(pet)) return;
    view.game = Pet.createGame();
    view.screen = "game";
  }
}

// PWR: pulsación corta pasa a la opción siguiente; mantenida apaga o enciende la pantalla.
function pwr(long) {
  if (long) {
    view.off = !view.off;
    return;
  }
  if (view.off) return wake();
  if (view.screen === "home") {
    if (!Pet.dismiss(pet)) view.menu = (view.menu + 1) % MENU.length;
  } else if (view.screen === "game") view.game.lane = (view.game.lane + 1) % LANES.length;
  else if (view.screen === "info") view.screen = "home";
}

// BOOT: confirma.
function boot() {
  if (view.off) return wake();
  if (view.screen === "home") {
    if (!Pet.dismiss(pet)) act(MENU[view.menu]);
  } else if (view.screen === "info") view.screen = "home";
  else if (view.screen === "game") view.game.lane = (view.game.lane + LANES.length - 1) % LANES.length;
}

function reset() {
  save();
  bootLeft = 0.6;
  view.screen = "home";
  view.game = null;
  view.off = false;
}

function touch(x, y) {
  if (view.off) return wake();
  if (view.screen === "info") view.screen = "home";
  else if (view.screen === "game") view.game.lane = LANES.reduce((best, lane, index) => (Math.abs(lane - x) < Math.abs(LANES[best] - x) ? index : best), 0);
  else if (view.screen === "home") {
    if (Pet.dismiss(pet)) return;
    if (y >= BAR.y - 4) {
      const slot = SLOTS.findIndex((centre) => Math.abs(centre - x) <= BAR.size / 2 + 3);
      if (slot >= 0) {
        view.menu = slot;
        act(MENU[slot]);
      }
    } else if (y > 80 && y < 200 && Math.abs(x - 120) < 70) Pet.stroke(pet);
  }
}

canvas.addEventListener("pointerdown", (event) => {
  const box = canvas.getBoundingClientRect();
  touch(((event.clientX - box.left) * W) / box.width, ((event.clientY - box.top) * H) / box.height);
});

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
  power.addEventListener(type, (event) => {
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
$("device").addEventListener("keydown", (event) => {
  if (event.target !== $("device")) return;
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") pwr(false);
  else if (event.key === "Enter" || event.key === " ") boot();
  else return;
  event.preventDefault();
});

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
for (const input of document.querySelectorAll('input[name="speed"]')) input.addEventListener("change", () => (speed = Number(input.value)));
$("restart").addEventListener("click", () => {
  pet = Pet.createPet(Date.now());
  view.pet = pet;
  view.screen = "home";
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
phone();
send({ t: "claude", used: Number($("claude-used").value) });
pet.alert = null;

function status() {
  const feeling = Pet.feeling(pet);
  $("state").textContent = `${Pet.NAME} está ${feeling}`;
  $("needs").textContent = `hambre ${Math.round(pet.fullness)} % · ánimo ${Math.round(pet.mood)} % · energía ${Pet.energy(pet)} %`;
}

let last = 0;
let saved = 0;
function frame(now) {
  const real = last ? Math.min((now - last) / 1000, 0.1) : 0;
  last = now;
  if (!still.matches) view.t += real;
  if (bootLeft > 0) {
    bootLeft -= real;
    paint({ ...view, off: true });
  } else {
    Pet.tick(pet, real * speed, real);
    if (view.screen === "game") {
      Pet.gameTick(view.game, real);
      if (view.game.over) {
        Pet.reward(pet, view.game.caught);
        view.screen = "result";
        resultLeft = 2.6;
      }
    } else if (view.screen === "result" && (resultLeft -= real) <= 0) {
      view.screen = "home";
      view.game = null;
    }
    paint(view);
  }
  if (now - saved > 4000) {
    saved = now;
    save();
    status();
  }
  requestAnimationFrame(frame);
}
status();
requestAnimationFrame(frame);
