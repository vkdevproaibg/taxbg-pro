const recentErrors: string[] = []
const MAX_ERRORS = 20

let initialized = false

export function initErrorCapture() {
  if (initialized) return
  initialized = true

  // Intercept console.error
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    const msg = args.map(a =>
      a instanceof Error ? `${a.message}\n${a.stack}` : String(a)
    ).join(' ')
    recentErrors.push(`[${new Date().toISOString()}] ${msg}`)
    if (recentErrors.length > MAX_ERRORS) recentErrors.shift()
    originalError.apply(console, args)
  }

  // Global error handler
  window.onerror = (message, source, lineno, colno, error) => {
    const msg = `[${new Date().toISOString()}] ${message} at ${source}:${lineno}:${colno}${error?.stack ? '\n' + error.stack : ''}`
    recentErrors.push(msg)
    if (recentErrors.length > MAX_ERRORS) recentErrors.shift()
  }

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const msg = `[${new Date().toISOString()}] Unhandled rejection: ${reason instanceof Error ? `${reason.message}\n${reason.stack}` : String(reason)}`
    recentErrors.push(msg)
    if (recentErrors.length > MAX_ERRORS) recentErrors.shift()
  })
}

export function getRecentErrors(): string[] {
  return [...recentErrors]
}
