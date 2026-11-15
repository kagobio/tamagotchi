// Genera los scripts de comandos de SolidCraft para las dos tapas a partir de ../dims.mjs
// y, con `--run`, los ejecuta con solidcraft-cli para sacar STEP, STL y el diseño .sc.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as M from "../dims.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const step = (command, params) => ({ command, params });
const { BODY, CAVITY, SPLIT, THICK, SKIN, PRINT } = M;
const right = BODY.x + BODY.w;
const near = BODY.y + BODY.d;
const cx = BODY.x + BODY.w / 2;
const cy = BODY.y + BODY.d / 2;
const corners = (plan, z) => [[plan.x, plan.y, z], [plan.x + plan.w, plan.y, z], [plan.x, plan.y + plan.d, z], [plan.x + plan.w, plan.y + plan.d, z]];
const box = (plan, z0, z1, extra) => step("solid.box", { length: plan.w, width: plan.d, height: z1 - z0, center: [plan.x + plan.w / 2, plan.y + plan.d / 2, (z0 + z1) / 2], ...extra });
const cylinder = (at, r, z0, z1, extra) => step("solid.cylinder", { radius: r, height: z1 - z0, base: [at[0], at[1], z0], ...extra });

// Un vaciado de planta rectangular con las esquinas redondeadas: croquis en z y corte en una dirección.
function pocket(name, plan, z, depth, direction) {
  const centre = [plan.x + plan.w / 2, plan.y + plan.d / 2];
  return [
    step("sketch.create", { plane: "XY", offset: z, name: `Croquis${name}` }),
    step("sketch.rectangle.center", { center: centre, corner: [plan.x + plan.w, plan.y + plan.d] }),
    ...[["l1", "l2"], ["l2", "l3"], ["l3", "l4"], ["l4", "l1"]].map(([a, b]) => step("sketch.fillet", { a, b, radius: plan.r })),
    step("sketch.finish", {}),
    step("solid.extrude", { distance: depth, direction, operation: "cut", name }),
  ];
}

function back() {
  const floor = SKIN;
  const out = [
    box(BODY, 0, SPLIT, { name: "Bloque", body_name: "Trasera" }),
    step("solid.fillet", { edges: corners(BODY, SPLIT / 2), radius: BODY.r, name: "Esquinas" }),
    step("solid.chamfer", { edges: [[cx, BODY.y, 0]], distance: PRINT.chamferBack, name: "Chaflan" }),
    ...pocket("Hueco", CAVITY, SPLIT, SPLIT - floor, "negative"),
  ];
  PRINT.ribs.forEach((rib, index) => out.push(box(rib, floor - 0.2, floor + PRINT.ribH, { operation: "join", name: `Nervio${index + 1}` })));
  M.BOSSES.forEach((at, index) => out.push(cylinder(at, M.BOSS_R, floor - 0.2, M.CARRIER.z, { operation: "join", name: `Poste${index + 1}` })));
  M.BOSSES.forEach((at, index) =>
    out.push(step("solid.hole", { position: [at[0], at[1], 0], diameter: PRINT.screwHole, type: "counterbore", cb_diameter: PRINT.headBore, cb_depth: PRINT.headDepth, name: `Tornillo${index + 1}` })),
  );
  out.push(box({ x: -M.PORT.half, y: CAVITY.y + CAVITY.d - 1, w: M.PORT.half * 2, d: 4 }, M.PORT.z, SPLIT + 1, { operation: "cut", name: "MuescaUSB" }));
  PRINT.soundHoles.forEach((at, index) => out.push(cylinder(at, PRINT.soundHole / 2, -1, floor + 1, { operation: "cut", name: `Sonido${index + 1}` })));
  return out;
}

function front() {
  const roof = THICK - SKIN;
  const win = M.WINDOW;
  const lens = { x: win.x - PRINT.lens.margin, y: win.y - PRINT.lens.margin, w: win.w + PRINT.lens.margin * 2, d: win.d + PRINT.lens.margin * 2 };
  const out = [
    box(BODY, SPLIT, THICK, { name: "Bloque", body_name: "Frontal" }),
    step("solid.fillet", { edges: corners(BODY, (SPLIT + THICK) / 2), radius: BODY.r, name: "Esquinas" }),
    step("solid.chamfer", { edges: [[cx, BODY.y, THICK]], distance: PRINT.chamferFront, name: "Chaflan" }),
    ...pocket("Hueco", CAVITY, SPLIT, roof - SPLIT, "positive"),
  ];
  M.BOSSES.forEach((at, index) => out.push(cylinder(at, M.BOSS_R, PRINT.frontBossZ, roof + 0.2, { operation: "join", name: `Poste${index + 1}` })));
  M.BOSSES.forEach((at, index) => out.push(cylinder(at, PRINT.insertHole / 2, PRINT.frontBossZ - 1, PRINT.frontBossZ + PRINT.insertDepth, { operation: "cut", name: `Inserto${index + 1}` })));
  out.push(box(lens, roof - 0.4, roof + PRINT.lens.depth, { operation: "cut", name: "AsientoLente" }));
  out.push(box(win, roof - 1, THICK + 1, { operation: "cut", name: "Ventana" }));
  out.push(step("solid.fillet", { edges: corners(win, THICK - 0.4), radius: win.r, name: "EsquinasVentana" }));
  M.BUTTONS.forEach((at, index) => out.push(cylinder(at, PRINT.capHole / 2, roof - 1, THICK + 1, { operation: "cut", name: `Boton${index + 1}` })));
  const lug = [M.LUG.x + M.LUG.w / 2, M.LUG.y + M.LUG.d / 2];
  out.push(cylinder(lug, M.LUG.r, M.LUG_Z[0], M.LUG_Z[1], { operation: "join", name: "Anilla" }));
  out.push(cylinder(M.LUG_HOLE.at, M.LUG_HOLE.r, M.LUG_Z[0] - 1, M.LUG_Z[1] + 1, { operation: "cut", name: "OjoAnilla" }));
  return out;
}

const upTo = process.argv.includes("--steps") ? Number(process.argv[process.argv.indexOf("--steps") + 1]) : Infinity;
for (const [name, commands] of [["trasera", back()], ["frontal", front()]]) {
  const file = join(HERE, `${name}.json`);
  writeFileSync(file, `${JSON.stringify({ commands: commands.slice(0, upTo) }, null, 1)}\n`);
  if (!process.argv.includes("--run")) continue;
  const out = ["step", "stl", "3mf"].flatMap((kind) => ["--out", join(HERE, `${name}.${kind}`)]);
  const reply = execFileSync("solidcraft-cli", ["run", file, ...out, "--save", join(HERE, `${name}.sc`), "--quality", "fine"], { encoding: "utf8" });
  console.log(name, reply.trim().split("\n").slice(-14).join("\n"));
}
