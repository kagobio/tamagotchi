// Cuenta a Tinto, que corre en este mismo ordenador, tres cosas de Claude Code:
// cuánto uso queda (límites de 5 horas y semanal), cuándo termina una tarea y cuándo te necesita.
// Si el programa de Tinto no está abierto, no pasa nada.
import type { Register } from 'claude-code'

type Engine = {
  http: { fetch: (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<unknown> }
}

type Link = { port: number; key: string }

function tell($: Engine, link: Link, path: string, body: unknown) {
  if (!link.key) return
  $.http
    .fetch(`http://127.0.0.1:${link.port}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-tinto-key': link.key },
      body: JSON.stringify(body),
    })
    .catch(() => undefined)
}

export const register: Register = (on, options) => {
  const link: Link = { port: Number(options.port) || 8787, key: String(options.key ?? '') }

  on('session.measure', ($, e, next) => {
    if (e.changed.includes('rateLimits') && e.rateLimits.length > 0) {
      tell($, link, '/claude', {
        windows: e.rateLimits.map((w) => ({ kind: w.kind, percentUsed: w.percentUsed, resetsAt: w.resetsAt })),
      })
    }
    return next(e)
  })

  // Claude acaba de responder. Si aún hay trabajo en segundo plano, todavía no ha terminado.
  on('classic.Stop', ($, e, next) => {
    if (!e.background_tasks || e.background_tasks.length === 0) tell($, link, '/notify', { event: 'claude-done' })
    return next(e)
  })

  // Claude pide un permiso o espera una respuesta.
  on('classic.Notification', ($, e, next) => {
    tell($, link, '/notify', { event: 'claude-ask' })
    return next(e)
  })
}
