import { expect, test } from 'claude-code/testing'

const LIMITS = [
  { kind: 'five_hour', percentUsed: 37.5, resetsAt: '2026-11-16T12:00:00Z' },
  { kind: 'seven_day', percentUsed: 12, resetsAt: '2026-11-20T00:00:00Z' },
]
const measure = (rateLimits: typeof LIMITS, changed: Array<'context' | 'rateLimits' | 'cost'>) =>
  ({ context: {} as never, rateLimits, changed })

test('manda los límites al programa de Tinto', { options: { port: 8787, key: 'secreta' } }, async ($, on) => {
  const calls: Array<{ url: string; init: { method?: string; headers?: Record<string, string>; body?: unknown } | undefined }> = []
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('http.fetch', (_, e) => {
    calls.push({ url: e.url, init: e.init })
    return { value: { status: 200, ok: true, headers: {}, text: '{}' } }
  })

  await $.session.measure(measure(LIMITS, ['rateLimits']))
  for (let i = 0; i < 50 && calls.length === 0; i++) await Promise.resolve()

  expect(calls.length).toBe(1)
  const first = calls[0]
  expect(first?.url).toBe('http://127.0.0.1:8787/claude')
  expect(first?.init?.headers?.['x-tinto-key']).toBe('secreta')
  expect(JSON.parse(String(first?.init?.body)).windows[0]).toEqual(LIMITS[0])
})

test('no manda nada si no cambió un límite o si no hay límites', { options: { port: 8787, key: 'secreta' } }, async ($, on) => {
  let sent = 0
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('http.fetch', () => {
    sent += 1
    return { value: { status: 200, ok: true, headers: {}, text: '{}' } }
  })

  await $.session.measure(measure(LIMITS, ['context']))
  await $.session.measure(measure([], ['rateLimits']))
  for (let i = 0; i < 50; i++) await Promise.resolve()
  expect(sent).toBe(0)
})

test('avisa cuando Claude termina y cuando te necesita', { options: { port: 8787, key: 'secreta' } }, async ($, on) => {
  const calls: Array<{ url: string; body: string }> = []
  on('classic.Stop', () => ({}))
  on('classic.Notification', () => ({}))
  on('http.fetch', (_, e) => {
    calls.push({ url: e.url, body: String(e.init?.body) })
    return { value: { status: 200, ok: true, headers: {}, text: '{}' } }
  })

  await $.classic.Stop({ stop_hook_active: false })
  await $.classic.Notification({ message: 'Claude needs your permission', notification_type: 'permission_prompt' })
  for (let i = 0; i < 50 && calls.length < 2; i++) await Promise.resolve()

  expect(calls.map((c) => c.url)).toEqual(['http://127.0.0.1:8787/notify', 'http://127.0.0.1:8787/notify'])
  expect(calls.map((c) => JSON.parse(c.body).event)).toEqual(['claude-done', 'claude-ask'])
})

test('no avisa de que terminó si queda trabajo en segundo plano', { options: { port: 8787, key: 'secreta' } }, async ($, on) => {
  let sent = 0
  on('classic.Stop', () => ({}))
  on('http.fetch', () => {
    sent += 1
    return { value: { status: 200, ok: true, headers: {}, text: '{}' } }
  })

  await $.classic.Stop({ stop_hook_active: false, background_tasks: [{ id: 'b1' } as never] })
  for (let i = 0; i < 50; i++) await Promise.resolve()
  expect(sent).toBe(0)
})
