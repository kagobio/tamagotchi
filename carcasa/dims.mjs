// Medidas de la carcasa y de los componentes, en milímetros.
// Es la única fuente de medidas: la figura y el CAD imprimible leen de aquí.
// Ejes: x a lo ancho, y hacia abajo (extremo de los botones), z desde la espalda (0) hacia el frente.

// Cuerpo exterior
export const BODY = { x: -44, y: -68, w: 88, d: 136, r: 8 };
export const WALL = 2;
export const SKIN = 1.6;
export const SPLIT = 10;    // z donde parte la carcasa en tapa trasera / frontal
export const THICK = 10;    // grosor total

// Hueco interior
export const CAVITY = {
  x: BODY.x + WALL,
  y: BODY.y + WALL,
  w: BODY.w - WALL * 2,
  d: BODY.d - WALL * 2,
  r: BODY.r - WALL,
};

// Tornillos de ensamblaje (4 esquinas)
export const BOSSES = [[-36, -60], [36, -60], [-36, 60], [36, 60]];
export const BOSS_R = 3;
export const SCREW = { r: 1, head: 1.9, headH: 1.6, length: 12 };

// Pantalla e-paper 4.26" 800×480 (GDEQ0426T82) — medidas del módulo con PCB
export const SCREEN = {
  plan: { x: -38, y: -58, w: 76, d: 100, r: 2 },
  active: { x: -35.5, y: -50, w: 71, d: 85 },   // área activa visible
  z: WALL,
  h: 1.2,
  name: "GDEQ0426T82",
  px: { w: 800, h: 480 },
};

// Placa ESP32-C3 (tipo Seeed XIAO ESP32C3 — 17.5 × 21 mm)
export const MCU = {
  plan: { x: -8.75, y: 42, w: 17.5, d: 21, r: 1.2 },
  z: WALL + SCREEN.h + 0.5,
  h: 1.5,
  name: "XIAO ESP32C3",
};

// Puerto USB-C de la placa
export const USB = { plan: { x: -4.5, y: 60, w: 9, d: 8.2, r: 1.4 }, z: 4.8, h: 3.2 };

// Batería LiPo (502540 — 25 × 40 × 5 mm, ~300 mAh)
export const BATTERY = {
  plan: { x: -12.5, y: 10, w: 25, d: 40, r: 1.5 },
  z: WALL,
  h: 5,
  name: "LiPo 502540",
  mAh: 300,
};

// Lector microSD (módulo plano)
export const SD = {
  plan: { x: -8, y: -62, w: 16, d: 14, r: 1 },
  z: WALL,
  h: 2,
};

// Botones (2): barra inferior — Atrás (◀) + Siguiente (▶)
// Radio 6 mm para facilitar la pulsación con el pulgar.
// Pulsación corta = atrás/siguiente · pulsación larga = menú/confirmar
export const BUTTONS = [
  { at: [-16, 64], r: 6, label: "◀", long: "inicio"   },
  { at: [ 16, 64], r: 6, label: "▶", long: "confirmar" },
];
export const BUTTON_H = 3.5;

// Botón de encendido (arista derecha, estilo smartphone)
export const POWER = { at: [44, -20], r: 2.5 };

// Anillo MagSafe en la tapa trasera — permite sujetarse al iPhone
// Radio del anillo de imanes: 27.7 mm (estándar Apple MagSafe)
export const MAGSAFE = {
  r:        27.7,   // radio del anillo de imanes (mm)
  magnets:  36,     // número de imanes en el anillo
  magnetR:  1.5,    // radio de cada imán (mm)
  z:        -WALL,  // en la cara trasera (exterior)
  name:     "MagSafe",
  note:     "Compatible con iPhone 12 y posteriores",
};

// Conjuntos desmontables (para la figura isométrica)
export const PIECES = [
  { id: "screws",  travel: 0,   key: -1,          name: "Tornillos",     note: "4 × M2×12, entran por la espalda" },
  { id: "back",    travel: 15,  key: 0,            name: "Tapa trasera",  note: "pared 2 mm" },
  { id: "battery", travel: 32,  key: BATTERY.z,    name: "Batería",       note: `${BATTERY.name}, ~${BATTERY.mAh} mAh` },
  { id: "mcu",     travel: 48,  key: MCU.z,        name: "Cerebro",       note: "XIAO ESP32C3, WiFi, USB-C" },
  { id: "screen",  travel: 64,  key: SCREEN.z,     name: "Pantalla",      note: `${SCREEN.name}, 4.26", 800×480 px` },
  { id: "front",   travel: 100, key: THICK,        name: "Tapa frontal",  note: "ventana e-paper, 2 botones" },
];

export const SPRING = { stagger: 0.06, stiffness: 60, damping: 13.8, substeps: 4 };
