import { useState, type FormEvent } from 'react'
import { useT } from '../../lib/useT'
import ChatWindow from './ChatWindow'
import { useAssistant } from './useAssistant'

export default function AssistantModule() {
  const t = useT()
  const { messages, sendMessage, isLoading, error } = useAssistant()
  const [draft, setDraft] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    await sendMessage(text)
    setDraft('')
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
