# Programa del ordenador de Tinto

Lleva tres cosas a Tinto: la **batería del iPhone**, los **avisos de Outlook** y lo que te queda de **uso de Claude**. Corre en tu ordenador con Windows y no instala nada más que Node.js.

```
iPhone (Atajos) ──WiFi──┐
Outlook ────────────────┼──► programa del ordenador ──► simulador (hoy)  /  placa ESP32-C6 (después)
Claude Code (mod) ──────┘
```

## 1. Arrancarlo

1. Instala Node.js (versión 20 o superior). En una terminal de Windows:
   ```bash
   winget install OpenJS.NodeJS.LTS
   ```
2. Descarga este repositorio (o `git clone https://github.com/kagobio/tamagotchi`).
3. Elige de dónde sale el calendario (apartado 3) y arranca:
   ```bash
   node companion/index.mjs setup --calendar com
   node companion/index.mjs
   ```
   También vale hacer doble clic en `companion\iniciar-tinto.bat`.
4. Windows preguntará si dejas que Node use la red. Acepta **solo en redes privadas**: hace falta para que el iPhone llegue.
5. El programa imprime un enlace `http://localhost:8787/?key=…`. Ábrelo: es el simulador de Tinto con tus datos de verdad. Arriba a la derecha pone «Conectado al programa del ordenador».

La clave (`key`) se crea sola la primera vez y se guarda en `%APPDATA%\tinto\config.json`. Sin ella el programa no contesta a nadie. Para volver a ver los enlaces: `node companion/index.mjs urls`.

## 2. Batería del iPhone

El iPhone no puede avisar solo de su batería: lo hace una **automatización de Atajos** que llama al programa por la WiFi. Funciona mientras el iPhone y el ordenador estén en la misma red.

**Antes:** averigua la dirección del ordenador con `ipconfig` (la «Dirección IPv4», por ejemplo `192.168.1.34`). Conviene fijarla en el router para que no cambie.

**El atajo** (app Atajos → pestaña Atajos → «+»), llámalo `Tinto batería`:

1. Acción **Obtener nivel de batería**.
2. Acción **Obtener contenido de URL**, con método GET y esta dirección, metiendo la variable *Nivel de batería* donde pone NIVEL:
   ```
   http://192.168.1.34:8787/phone?key=TU_CLAVE&level=NIVEL&charging=0
   ```
3. Haz una copia llamada `Tinto batería cargando` igual pero con `charging=1`.

**Las automatizaciones** (pestaña Automatización → «+» → Automatización personal). En cada una, elige **Ejecutar inmediatamente** y desactiva **Avisar al ejecutar**:

| Cuando | Qué atajo ejecuta |
|---|---|
| Cargador: se conecta | `Tinto batería cargando` |
| Cargador: se desconecta | `Tinto batería` |
| Nivel de batería: baja de 20 %, de 10 % y sube de 80 % | `Tinto batería` |
| Wi‑Fi: se conecta a la de casa | `Tinto batería` |

Así Tinto se entera de cada cambio importante y avisa cuando el móvil baja del 20 %. No es una lectura continua: entre dos avisos muestra el último valor.

Los nombres de los menús pueden variar un poco según la versión de iOS. La primera vez, iOS pedirá permiso para que Atajos use la red local: acéptalo.

Para probar sin el iPhone, desde el propio ordenador:
```bash
curl "http://localhost:8787/phone?key=TU_CLAVE&level=12&charging=0"
```

## 3. Outlook

Hay dos formas. Elige según tu Outlook.

**A. Outlook clásico de Windows** (el de las aplicaciones de Microsoft 365, con la cinta de opciones completa). Es lo más directo: lee el calendario por PowerShell.
```bash
node companion/index.mjs setup --calendar com
```
Si usas el «nuevo Outlook» (el interruptor «Nuevo Outlook» arriba a la derecha está activado) no funciona: pasa a la opción B o vuelve al clásico.

**B. Enlace ICS** (vale para el nuevo Outlook y para Outlook.com). En outlook.com: Configuración → Calendario → Calendarios compartidos → **Publicar un calendario** → permisos «Puede ver todos los detalles» → Publicar, y copia el enlace ICS.
```bash
node companion/index.mjs setup --calendar ics --ics "https://outlook.live.com/owa/calendar/…/calendar.ics"
```
Ese enlace da acceso de lectura a tu calendario a quien lo tenga: no lo compartas. En cuentas de trabajo o del centro de estudios el administrador puede haber desactivado la publicación.

Avisos: por defecto 10 minutos antes (`--lead 15,5` para dos avisos). Se saltan los eventos de todo el día, los marcados como «libre» y los cancelados.

## 4. Uso de Claude

**La app de escritorio de Claude Code no ejecuta el *statusline***, que es la vía habitual para leer el uso. Por eso hay un **mod** que sí funciona ahí: cada vez que cambia un límite (5 horas o semanal) se lo cuenta al programa.

En la app de escritorio: pulsa **+** junto a la caja del mensaje → **Plugins** → **Add marketplace** → escribe `kagobio/tamagotchi` → **Add plugin** → `tinto-usage`. Te pedirá el puerto (8787) y la clave. Desde una terminal sería `/plugin install tinto-usage --marketplace kagobio/tamagotchi`.

Si el repositorio es privado, tu ordenador necesita tener credenciales de GitHub (`gh auth login`) para instalarlo.

Tinto muestra como «energía» el límite que más se ha gastado de los dos. Mientras no llegue ningún dato, la barra de Claude sale vacía con un guion. El dato solo se actualiza mientras Claude Code está en uso; cuando un límite se reinicia, Tinto lo ve vacío por sí solo.

*Si usas Claude Code en terminal*, también puedes poner el *statusline* en lugar del mod:
```bash
node companion/index.mjs install-statusline
```
(no sustituye uno que ya tengas, salvo con `--force`).

## 5. Seguridad

- Todo pide la clave. Se compara sin filtrar información y el programa no guarda nada de lo que recibe salvo en memoria.
- Por defecto escucha en tu red local para que el iPhone llegue. Si solo quieres usarlo en este ordenador: `node companion/index.mjs setup --host 127.0.0.1` (entonces el iPhone no podrá avisar).
- La clave viaja en la dirección: úsalo solo en una red de confianza (tu casa), no en una WiFi pública.

## 6. Para la placa (cuando haya firmware)

La placa hablará con el mismo programa. Lo que ofrece:

| Dirección | Qué hace |
|---|---|
| `GET /state?key=` | Foto del momento: móvil, Claude (%) y próximos eventos |
| `GET /events?key=` | Flujo (SSE) de mensajes; al conectar repite lo último que se sabe |
| `GET/POST /phone` | `level` 0–100 y `charging` |
| `POST /claude` | `{ "windows": [{ "kind": "five_hour", "percentUsed": 37.5, "resetsAt": "…" }] }` |
| `POST /cal` | `{ "title": "…", "minutes": 10 }`, para pruebas |

Los mensajes del flujo son los mismos que entiende el juego: `{"t":"phone","level":64,"charging":false}`, `{"t":"claude","used":37}` y `{"t":"cal","title":"Reunión","minutes":10}`.

## Qué está probado y qué no

- **Probado aquí (31 pruebas automáticas más una de punta a punta con un navegador):** el servidor y su clave, los avisos del móvil, el uso de Claude, el calendario ICS (repeticiones, zonas horarias y cambio de hora), los avisos con varios márgenes, la instalación del statusline y la conexión del simulador. El mod pasa su validación y sus pruebas.
- **Sin probar en un ordenador con Windows:** la lectura de Outlook clásico (`outlook.ps1`), el arranque en Windows y el mod dentro de la app de escritorio.
- **Sin probar con un iPhone:** el atajo y las automatizaciones.
- **No verificado:** que la app de escritorio deje al mod hacer peticiones a `127.0.0.1` (depende de las políticas de red de tu instalación). Si la barra de Claude sigue vacía con el mod instalado, es lo primero que hay que mirar.
- **Sin comprobar con un enlace real:** el calendario ICS de Outlook.com, porque el formato exacto de sus zonas horarias solo se ve con un calendario de verdad.
