# Mascota de bolsillo

Una mascota virtual impresa en 3D con software propio. Se conecta al ordenador y reacciona a la batería del móvil, a los avisos del calendario y al uso de Claude.

## Carpetas

- `carcasa/`: medidas de la carcasa (`dims.mjs`, en mm) y la figura isométrica de su despiece.
- `.claude/skills/anatomy/`: la skill [Anatomy](https://github.com/wheresryan22/anatomy) (licencia MIT, commit `1482e84`), instalada como skill de proyecto para dibujar las figuras. En Claude Code se usa con `/anatomy`.
