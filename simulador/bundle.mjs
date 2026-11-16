// Junta index.html y los módulos (a partir de main.js, siguiendo sus import) en un solo archivo, simulador.html,
// que funciona sin servidor. Cada módulo va en su propio ámbito y los import se convierten en desestructuraciones.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (name) => readFileSync(join(HERE, name), "utf8");
const IMPORT = /^import\s+(?:\*\s+as\s+(\w+)|\{([^}]*)\})\s+from\s+"\.\/([\w-]+\.js)";[ \t]*$/gm;
const varOf = (file) => `__${file.replace(/\.js$/, "").replace(/-/g, "_")}`;

const order = [];
const seen = new Set();
function visit(file) {
  if (seen.has(file)) return;
  seen.add(file);
  for (const match of read(file).matchAll(IMPORT)) visit(match[3]);
  order.push(file);
}
visit("main.js");

function wrap(file) {
  let source = read(file);
  source = source.replace(IMPORT, (_, star, names, from) => {
    if (star) return `const ${star} = ${varOf(from)};`;
    const list = names.split(",").map((n) => n.trim()).filter(Boolean).map((n) => n.replace(/^(\w+)\s+as\s+(\w+)$/, "$1: $2"));
    return list.length ? `const { ${list.join(", ")} } = ${varOf(from)};` : "";
  });
  const names = [...source.matchAll(/^export\s+(?:const|let|function\*?|class)\s+(\w+)/gm)].map((m) => m[1]);
  for (const m of source.matchAll(/^export\s*\{([^}]*)\};?[ \t]*$/gm)) names.push(...m[1].split(",").map((n) => n.trim().split(/\s+as\s+/).pop()).filter(Boolean));
  source = source.replace(/^export\s+(const|let|function\*?|class)\s/gm, "$1 ").replace(/^export\s*\{[^}]*\};?[ \t]*$/gm, "");
  if (file === "main.js") return `// ${file}\n${source}`;
  return `// ${file}\nconst ${varOf(file)} = (() => {\n${source}\nreturn { ${[...new Set(names)].join(", ")} };\n})();`;
}

const code = order.map(wrap).join("\n");
const html = read("index.html").replace('<script type="module" src="./main.js"></script>', () => `<script>\n(() => {\n${code}\n})();\n</script>`);
if (html.includes('src="./main.js"')) throw new Error("no encontré la etiqueta script de index.html");
writeFileSync(join(HERE, "simulador.html"), html);
console.log("wrote simulador.html", `${(html.length / 1024).toFixed(0)} KB`, "· módulos:", order.join(", "));
