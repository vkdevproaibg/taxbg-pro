import { Component, type ReactNode } from 'react'
import { collectDiagnostics, exportDiagnosticsAsJson } from '../lib/diagnostics'
import { supabase } from '../lib/supabase'

const T = {
  ru: {
    title: 'Произошла ошибка',
    desc: 'Приложение столкнулось с непредвиденной ошибкой. Ваши данные в безопасности.',
    sendReport: 'Отправить отчёт',
    reload: 'Перезагрузить',
    download: 'Скачать диагностику',
    sent: 'Отчёт отправлен',
    error: 'Ошибка:',
  },
  en: {
    title: 'Something went wrong',
    desc: 'The application encountered an unexpected error. Your data is safe.',
    sendReport: 'Send report',
    reload: 'Reload',
    download: 'Download diagnostics',
    sent: 'Report sent',
    error: 'Error:',
  },
  bg: {
    title: 'Възникна грешка',
    desc: 'Приложението срещна неочаквана грешка. Вашите данни са в безопасност.',
    sendReport: 'Изпрати доклад',
    reload: 'Презареди',
    download: 'Изтегли диагностика',
    sent: 'Докладът е изпратен',
    error: 'Грешка:',
  },
  uk: {
    title: 'Сталася помилка',
    desc: 'Додаток зіткнувся з непередбаченою помилкою. Ваші дані в безпеці.',
    sendReport: 'Надіслати звіт',
    reload: 'Перезавантажити',
    download: 'Завантажити діагностику',
    sent: 'Звіт надіслано',
    error: 'Помилка:',
  },
}

type Lang = keyof typeof T

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  sent: boolean
  sending: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, sent: false, sending: false }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Persist crash to localStorage for healthCheck
    try {
      localStorage.setItem('taxbg-crash-log', JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
        timestamp: new Date().toISOString(),
      }))
    } catch { /* localStorage may be full */ }
  }

  private getLang(): Lang {
    try {
      // Safe access — stores might be broken
      const raw = localStorage.getItem('taxbg-user')
      if (raw) {
        const parsed = JSON.parse(raw)
        const lang = parsed?.state?.language
        if (lang && lang in T) return lang as Lang
      }
    } catch { /* ignore */ }
    return 'ru'
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleSendReport = async () => {
    this.setState({ sending: true })
    try {
      const snapshot = await collectDiagnostics()
      const diagnosticJson = {
        ...snapshot,
        crashError: this.state.error?.message,
        crashStack: this.state.error?.stack,
      }

      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('support_tickets').insert({
            profile_id: user.id,
            diagnostic_json: diagnosticJson,
            user_description: `Crash: ${this.state.error?.message}`,
            status: 'new',
          })
        }
      }

      this.setState({ sent: true })
    } catch (err) {
      console.error('[ErrorBoundary] send report failed:', err)
    }
    this.setState({ sending: false })
  }

  private handleDownload = async () => {
    try {
      const snapshot = await collectDiagnostics()
      const enriched = {
        ...snapshot,
        crashError: this.state.error?.message,
        crashStack: this.state.error?.stack,
      }
      const json = exportDiagnosticsAsJson(enriched as Parameters<typeof exportDiagnosticsAsJson>[0])
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `taxbg-diagnostics-${new Date().toISOString().slice(0, 19)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[ErrorBoundary] download failed:', err)
    }
  }

  render() {
    const { error, sent, sending } = this.state
    if (!error) return this.props.children

    const lang = this.getLang()
    const t = T[lang]

    return (
      <div style={{
        minHeight: '100vh',
        background: '#1a1a2e',
        color: '#e0e0e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <div style={{ maxWidth: 560, width: '100%' }}>
          <div style={{
            background: '#16213e',
            borderRadius: 16,
            padding: 32,
            border: '1px solid #0f3460',
          }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>&#x26A0;</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#ff6b6b', marginBottom: 8 }}>
              {t.title}
            </h1>
            <p style={{ fontSize: 14, color: '#a0a0a0', marginBottom: 24 }}>
              {t.desc}
            </p>

            <div style={{
              background: '#0f0f23',
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
              maxHeight: 200,
              overflow: 'auto',
            }}>
              <p style={{ fontSize: 12, color: '#ff6b6b', fontWeight: 600, marginBottom: 4 }}>
                {t.error}
              </p>
              <pre style={{
                fontSize: 11,
                color: '#ccc',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                margin: 0,
                fontFamily: 'monospace',
              }}>
                {error.message}
                {'\n\n'}
                {error.stack}
              </pre>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {!sent && (
                <button
                  onClick={this.handleSendReport}
                  disabled={sending}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#e94560',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: sending ? 'wait' : 'pointer',
                    opacity: sending ? 0.7 : 1,
                  }}
                >
                  {sending ? '...' : t.sendReport}
                </button>
              )}
              {sent && (
                <span style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  background: '#1b4332',
                  color: '#52b788',
                  fontSize: 14,
                  fontWeight: 600,
                }}>
                  {t.sent}
                </span>
              )}

              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: '1px solid #0f3460',
                  background: 'transparent',
                  color: '#e0e0e0',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t.reload}
              </button>

              <button
                onClick={this.handleDownload}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: '1px solid #0f3460',
                  background: 'transparent',
                  color: '#a0a0a0',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {t.download}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
