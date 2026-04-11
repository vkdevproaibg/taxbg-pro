import { useState, type FormEvent } from 'react'
import { useT } from '../../lib/useT'
import ChatWindow from './ChatWindow'
import { useAssistant } from './useAssistant'
import { usePaywall } from '../../hooks/usePaywall'
import PaywallModal from '../../components/ui/PaywallModal'

export default function AssistantModule() {
  const t = useT()
  const { messages, sendMessage, isLoading, error } = useAssistant()
  const [draft, setDraft] = useState('')
  const { checkAccess } = usePaywall()
  const [showPaywall, setShowPaywall] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    await sendMessage(text)
    setDraft('')
  }

  if (!checkAccess('ai_assistant')) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center">
        <p className="text-4xl mb-4">🤖</p>
        <p
          className="text-lg font-semibold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          AI Ассистент
        </p>
        <p
          className="text-sm mb-6 max-w-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          Налоговый AI консультант доступен в Pro плане
        </p>
        <button
          onClick={() => setShowPaywall(true)}
          className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Узнать о Pro
        </button>
        {showPaywall && (
          <PaywallModal
            reason="ai_assistant"
            onClose={() => setShowPaywall(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('nav_assistant')}</h1>
      <ChatWindow messages={messages} />
      {isLoading && <p className="text-sm text-slate-500">{t('loading')}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          placeholder={t('nav_assistant')}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
          disabled={isLoading}
        >
          {isLoading ? t('loading') : t('common_send')}
        </button>
      </form>
    </div>
  )
}
