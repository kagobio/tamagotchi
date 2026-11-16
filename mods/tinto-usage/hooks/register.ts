// Cada vez que Claude Code mide el uso y cambia un límite, se lo cuenta al programa de Tinto
// que corre en este mismo ordenador. Si el programa no está abierto, no pasa nada.
import type { Register } from 'claude-code'

export const register: Register = (on, options) => {
  const port = Number(options.port) || 8787
  const key = String(options.key ?? '')

  on('session.measure', ($, e, next) => {
    if (key && e.changed.includes('rateLimits') && e.rateLimits.length > 0) {
      $.http
        .fetch(`http://127.0.0.1:${port}/claude`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-tinto-key': key },
          body: JSON.stringify({
            windows: e.rateLimits.map((w) => ({ kind: w.kind, percentUsed: w.percentUsed, resetsAt: w.resetsAt })),
          }),
        })
        .catch(() => undefined)
    }
    return next(e)
  })
}
