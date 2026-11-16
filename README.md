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

`simulador/` es Tinto tal como se verá en la pantalla de 240 × 280 de la placa. Se abre con `simulador/simulador.html` (un solo archivo, sin servidor) y se regenera con `node simulador/bundle.mjs`.

**Cuidados.** Come, duerme (solo de noche, de 23:00 a 7:00, y se despierta por la mañana), se deja acariciar y reacciona a la batería del móvil, al calendario, al uso de Claude, al tiempo, a los pasos y a los aplausos.

**Ocho juegos**, cada uno con una forma distinta de jugar:

| Juego | Cómo se juega |
|---|---|
| Atrapa estrellas | tocar un carril |
| Caza del láser | arrastrar el láser y quedarse quieto cuando Tinto se agazapa |
| Laberinto de lana | inclinar la placa |
| Carrera de estanterías | tocar para saltar (doble salto) |
| ¿Dónde está el ovillo? | seguir la caja que lo esconde |
| Cazaratones | tocar ratones, no pájaros |
| Simón de maullidos | repetir la secuencia de sonidos y colores |
| Pesca en la pecera | mantener para bajar el anzuelo, soltar para subirlo |

**Para seguir jugando:** las estrellas son la moneda de una **tienda** (sombreros, collares, decoración del cuarto y color de la cesta). Hay un **bonus por cambiar de juego**, un **juego del día** que da el doble, **tres retos diarios**, una **racha** de días seguidos, **doce logros**, sorpresas que aparecen (mariposas y regalos) y Tinto **pide un juego** cuando se aburre. Los juegos más difíciles se abren con las estrellas ganadas.

**Más:** modo reloj, modo concentración de 25 minutos, sonidos, y un panel para probarlo todo (inclinación con el ratón o el giroscopio del móvil, pasos, aplausos, el tiempo, avisos de Claude).

Estructura: la lógica no sabe nada de la pantalla (`pet.js`, `games.js`, `meta.js`, `items.js`) y se prueba con robots que juegan de verdad; el dibujo está en `gfx.js`, `room.js`, `outfit.js`, `draw.js`, `drawgames.js`, `drawui.js`; `main.js` lo une con las entradas.

Pruebas: `node --test simulador/test/*.test.mjs` (27 pruebas de la lógica) y, con Playwright, `node simulador/test/flujo.e2e.cjs` (recorrido completo con clics y botones).

## Programa del ordenador

`companion/` lleva a Tinto la batería del iPhone, los avisos de Outlook y el uso de Claude. Guía de instalación para Windows en [`companion/README.md`](companion/README.md). Las pruebas: `cd companion && npm test`.

`mods/tinto-usage/` es el mod de Claude Code que le manda el uso. Se instala desde el marketplace de este repositorio: `/plugin install tinto-usage --marketplace kagobio/tamagotchi`.
