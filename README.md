# Mascota de bolsillo

Una mascota virtual impresa en 3D con software propio. Se conecta al ordenador y reacciona a la batería del móvil, a los avisos del calendario y al uso de Claude.

## Carpetas

- `carcasa/`: medidas de la carcasa (`dims.mjs`, en mm) y la figura isométrica de su despiece.
- `.claude/skills/anatomy/`: la skill [Anatomy](https://github.com/wheresryan22/anatomy) (licencia MIT, commit `1482e84`), instalada como skill de proyecto para dibujar las figuras. En Claude Code se usa con `/anatomy`.
- `.claude/skills/solidcraft-*/`: las cinco skills de modelado de [SolidCraft](https://github.com/tangency-labs/solidcraft) (commit `fc44207a`), un CAD paramétrico de código abierto. Sirven para modelar la carcasa imprimible; necesitan el programa `solidcraft-cli` (va incluido en el instalador de SolidCraft); `.mcp.json` lo conecta a Claude Code como servidor MCP.

## Figura de la carcasa

`carcasa/carcasa.html` (oscura) y `carcasa/carcasa-light.html` (clara) son páginas sueltas: se abren en el navegador y la carcasa se desmonta al pasar el cursor, al tocarla o con Espacio. Para regenerarlas después de cambiar `carcasa/dims.mjs`:

```sh
node carcasa/build.mjs
node carcasa/build.mjs --light
```

## Tapas imprimibles

`carcasa/cad/` tiene las dos tapas modeladas con SolidCraft a partir de las mismas medidas de `carcasa/dims.mjs`:

- `trasera.stl`, `frontal.stl` (y `.3mf`): para el laminador.
- `trasera.step`, `frontal.step`: para abrir en cualquier CAD.
- `trasera.sc`, `frontal.sc`: diseños de SolidCraft, editables.
- `trasera.json`, `frontal.json`: los scripts de comandos que las generan.

Para regenerarlas después de cambiar una medida (necesita `solidcraft-cli`):

```sh
node carcasa/cad/build-cad.mjs --run
```

Es una primera versión sin imprimir: las medidas de los componentes son nominales y hay que comprobarlas con las piezas reales.

## Simulador de la mascota

`simulador/` es la mascota ("Brote") tal como se verá en la pantalla de 240 × 280 de la placa, con la lógica del juego separada del dibujo para poder pasarla después al firmware:

- `pet.js`: estado, paso del tiempo, acciones, minijuego y los mensajes del ordenador (`phone`, `claude`, `cal`). No toca la pantalla.
- `draw.js`: todo lo que se pinta, solo con rectángulos y texto.
- `main.js` e `index.html`: botones PWR y BOOT, táctil y un panel que imita lo que mandará el programa del ordenador.
- `simulador.html`: todo junto en un archivo que se abre sin servidor. Se regenera con `node simulador/bundle.mjs`.

Controles: tocar los iconos de abajo (comer, jugar, dormir, estado) o acariciar a Brote; con botones, PWR pasa de opción y BOOT confirma; mantener PWR apaga la pantalla.
