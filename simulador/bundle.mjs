// Junta index.html, pet.js, draw.js y main.js en un solo archivo (simulador.html) que funciona sin servidor.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (name) => readFileSync(join(HERE, name), "utf8");
const dropImports = (source) => source.replace(/^import [^;]*;\s*$/gm, "");
const dropExports = (source) => source.replace(/^export (const|function|let) /gm, "$1 ");

// pet.js se queda en su propio ámbito y devuelve lo que exportaba: main.js lo usa como `Pet.algo`
// y draw.js lo desestructura.
const petSource = read("pet.js");
const petNames = [...petSource.matchAll(/^export (?:const|function) (\w+)/gm)].map((match) => match[1]);
const pet = `const Pet = (() => {\n${dropExports(petSource)}\nreturn { ${petNames.join(", ")} };\n})();`;

const drawImport = read("draw.js").match(/^import \{([^}]*)\} from "\.\/pet\.js";/m);
if (!drawImport) throw new Error("draw.js ya no importa de pet.js: revisa bundle.mjs");
const draw = `const {${drawImport[1]}} = Pet;\n${dropExports(dropImports(read("draw.js")))}`;
const main = dropImports(read("main.js"));

const code = [`// pet.js\n${pet}`, `// draw.js\n${draw}`, `// main.js\n${main}`].join("\n");
const html = read("index.html").replace('<script type="module" src="./main.js"></script>', () => `<script>\n(() => {\n${code}\n})();\n</script>`);
if (html.includes('src="./main.js"')) throw new Error("no encontré la etiqueta script de index.html");
writeFileSync(join(HERE, "simulador.html"), html);
console.log("wrote simulador.html", `${(html.length / 1024).toFixed(0)} KB`, "· exports de pet.js:", petNames.length);
