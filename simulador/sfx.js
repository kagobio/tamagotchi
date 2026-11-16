// Sonidos sencillos hechos con WebAudio; en la placa serán tonos por el altavoz.
let audio = null;
export const sound = { muted: false };

function context() {
  if (!audio) {
    const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    audio = new AC();
  }
  if (audio.state === "suspended") audio.resume();
  return audio;
}

function tone(freq, start, dur, { type = "sine", vol = 0.1, to = null } = {}) {
  const a = context();
  if (!a || sound.muted) return;
  const o = a.createOscillator();
  const g = a.createGain();
  const at = a.currentTime + start;
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(a.destination);
  o.start(at);
  o.stop(at + dur + 0.05);
}

const PADS = [262, 330, 392, 523];
const SFX = {
  tap: () => tone(620, 0, 0.04, { type: "triangle", vol: 0.05 }),
  coin: () => {
    tone(880, 0, 0.08, { type: "triangle" });
    tone(1320, 0.07, 0.12, { type: "triangle" });
  },
  gold: () => [880, 1100, 1320, 1760].forEach((f, i) => tone(f, i * 0.06, 0.12, { type: "triangle" })),
  miss: () => tone(240, 0, 0.2, { type: "sawtooth", to: 110, vol: 0.06 }),
  jump: () => tone(360, 0, 0.14, { type: "square", to: 720, vol: 0.04 }),
  hit: () => tone(160, 0, 0.25, { type: "sawtooth", to: 70, vol: 0.09 }),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.18, { type: "triangle" })),
  swap: () => tone(420, 0, 0.05, { type: "triangle", vol: 0.04 }),
  pop: () => tone(520, 0, 0.07, { type: "sine", to: 760, vol: 0.07 }),
  hook: () => tone(300, 0, 0.12, { type: "triangle", to: 600, vol: 0.08 }),
  stalk: () => tone(90, 0, 0.5, { type: "sawtooth", vol: 0.035 }),
  pounce: () => tone(500, 0, 0.25, { type: "sine", to: 180, vol: 0.07 }),
  lost: () => tone(330, 0, 0.1, { type: "triangle", to: 250, vol: 0.05 }),
  catch: () => {
    tone(880, 0, 0.1, { type: "triangle" });
    tone(1320, 0.08, 0.16, { type: "triangle" });
  },
  meow: () => {
    tone(700, 0, 0.34, { type: "triangle", to: 430, vol: 0.09 });
    tone(1400, 0, 0.3, { type: "sine", to: 860, vol: 0.03 });
  },
  buy: () => [660, 990].forEach((f, i) => tone(f, i * 0.08, 0.14, { type: "triangle" })),
  error: () => tone(200, 0, 0.18, { type: "square", to: 140, vol: 0.05 }),
  toast: () => [784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.16, { type: "sine", vol: 0.08 })),
};
PADS.forEach((f, i) => {
  SFX[`tono${i}`] = () => tone(f, 0, 0.32, { type: "triangle", vol: 0.12 });
});

export function play(name) {
  try {
    if (SFX[name]) SFX[name]();
  } catch {
    /* sin audio */
  }
}
