// Medidas de la carcasa y de lo que lleva dentro, en milímetros.
// Es la única fuente de medidas: la figura (build.mjs) las lee de aquí y el CAD imprimible debe leer las mismas.
// Ejes: x a lo ancho, y hacia el extremo del USB, z desde la espalda (0) hasta el frente.

export const BODY = { x: -25, y: -32, w: 50, d: 64, r: 11 };
export const WALL = 2;
export const SKIN = 1.6;
export const SPLIT = 9;
export const THICK = 16;
export const CAVITY = { x: BODY.x + WALL, y: BODY.y + WALL, w: BODY.w - WALL * 2, d: BODY.d - WALL * 2, r: BODY.r - WALL };

export const BOSSES = [[-18.5, -26.5], [18.5, -26.5], [-18.5, 26.5], [18.5, 26.5]];
export const BOSS_R = 3;
export const SCREW = { r: 1, head: 1.9, headH: 1.6, length: 12 };

export const LUG = { x: -5, y: -40.5, w: 10, d: 10, r: 5 };
export const LUG_Z = [SPLIT, 13];
export const LUG_HOLE = { at: [0, -36.5], r: 1.7 };

export const PORT = { half: 4.8, z: 4.4 };

export const MOTOR = { at: [15, 14.5], r: 5, z: SKIN, h: 2.7 };
export const BATTERY = { plan: { x: -15, y: -24, w: 30, d: 30, r: 1.5 }, z: 1.8, h: 5, name: "LiPo 503030", mAh: 400 };

export const XIAO = { plan: { x: -8.9, y: 8.2, w: 17.8, d: 21, r: 1.2 }, z: 3.6, h: 1.2 };
export const USB = { plan: { x: -4.5, y: 22.5, w: 9, d: 8.2, r: 1.4 }, z: 4.8, h: 3.2 };

export const CARRIER = { plan: { x: -21, y: -28, w: 42, d: 56, r: 3 }, z: 8.4, h: 1.6 };
export const CARRIER_TOP = CARRIER.z + CARRIER.h;
export const BUZZER = { at: [-15, 14.5], r: 4.5, z: 4.2, h: 4.2 };

export const OLED = {
  board: { x: -17.7, y: -22.5, w: 35.4, d: 33.5, r: 1 },
  boardZ: 11.2,
  boardH: 1.2,
  glass: { x: -17.2, y: -18, w: 34.4, d: 23, r: 0.5 },
  glassH: 1.6,
  active: { x: -14.7, y: -15.5, w: 29.4, d: 14.7, r: 0.3 },
  holes: [[-15.2, -20], [15.2, -20], [-15.2, 8.5], [15.2, 8.5]],
  pixels: [128, 64],
};
export const GLASS_TOP = OLED.boardZ + OLED.boardH + OLED.glassH;

export const BUTTONS = [[-13, 19], [0, 22], [13, 19]];
export const SWITCH = { side: 6, h: 3.5, plungerR: 1.75, plungerH: 1.5 };
export const CAP = { skirtR: 4.5, skirtZ: 13.7, stemR: 3.5, top: 17.2 };
export const CAP_HOLE_R = 3.7;

export const WINDOW = { x: -15.7, y: -16.5, w: 31.4, d: 16.7, r: 1.5 };
export const LENS_DROP = 0.6;

// Cuánto sube cada conjunto al desmontar (mm), de abajo arriba.
export const PIECES = [
  { id: "screws", travel: 0, key: -1, name: "Tornillos", note: "4 × M2×12, entran por la espalda" },
  { id: "back", travel: 13, key: 0, name: "Tapa trasera", note: "pared 2 mm, motor de vibración Ø10" },
  { id: "battery", travel: 28, key: BATTERY.z, name: "Batería", note: `${BATTERY.name}, ~${BATTERY.mAh} mAh` },
  { id: "xiao", travel: 44, key: XIAO.z, name: "Cerebro", note: "XIAO ESP32-S3, USB-C, carga LiPo" },
  { id: "carrier", travel: 62, key: CARRIER.z, name: "Placa portadora", note: "OLED 1.3\", 3 pulsadores, zumbador" },
  { id: "caps", travel: 68, key: CAP.top, name: "Botones", note: "3 capuchones impresos, Ø7" },
  { id: "front", travel: 112, key: THICK, name: "Tapa frontal", note: "ventana 31 × 17, anilla para cordón" },
];
export const SPRING = { stagger: 0.06, stiffness: 64, damping: 14.2, substeps: 4 };

// Solo para el CAD imprimible (cad/build-cad.mjs).
export const PRINT = {
  chamferBack: 0.8,
  chamferFront: 1.2,
  screwHole: 2.4,
  headBore: 4.2,
  headDepth: 1.8,
  insertHole: 3.2,
  insertDepth: 4,
  frontBossZ: 10,
  capHole: CAP_HOLE_R * 2,
  lens: { margin: 1, depth: 0.8 },
  ribs: [
    { x: -14, y: -25.4, w: 28, d: 1 },
    { x: -14, y: 6.4, w: 28, d: 1 },
    { x: -16.6, y: -22, w: 1, d: 26 },
    { x: 15.6, y: -22, w: 1, d: 26 },
  ],
  ribH: 2,
  soundHoles: [[-17.2, 14.5], [-15, 14.5], [-12.8, 14.5]],
  soundHole: 1.5,
};
