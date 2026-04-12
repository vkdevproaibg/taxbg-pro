import { Link } from 'react-router-dom'
import { useUserStore } from '../../store/userStore'
import type { AppLanguage } from '../../store/userStore'
import type { AssistantMessage } from './useAssistant'

interface ChatWindowProps {
  messages: AssistantMessage[]
}

const AI_LABEL: Record<AppLanguage, { badge: string; disclaimer: string; learnMore: string }> = {
  ru: {
    badge: '🤖 AI',
    disclaimer: 'Ответ сгенерирован AI. Проверьте перед использованием.',
    learnMore: 'Подробнее',
  },
  uk: {
    badge: '🤖 AI',
    disclaimer: 'Відповідь згенеровано AI. Перевірте перед використанням.',
    learnMore: 'Детальніше',
  },
  en: {
    badge: '🤖 AI',
    disclaimer: 'AI-generated. Please review before use.',
    learnMore: 'Learn more',
  },
  bg: {
    badge: '🤖 AI',
    disclaimer: 'Отговорът е генериран от AI. Проверете преди употреба.',
    learnMore: 'Повече',
  },
}

export default function ChatWindow({ messages }: ChatWindowProps) {
  const language = useUserStore((s) => s.language)
  const labels = AI_LABEL[language] ?? AI_LABEL.ru
  return (
    <div className="space-y-2 rounded border border-slate-200 bg-white p-3">
      {messages.map((message, index) => {
        const isAssistant = message.role !== 'user'
        return (
          <div
            key={`${message.role}-${index}-${message.content}`}
            className={`rounded p-2 text-sm ${message.role === 'user' ? 'ml-8 bg-slate-900 text-white' : 'mr-8 bg-slate-100 text-slate-800'}`}
          >
            {isAssistant && (
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  {labels.badge}
                </span>
                <span className="text-[11px] text-slate-500">
                  {labels.disclaimer}{' '}
                  <Link to="/ai-disclosure" className="underline hover:text-slate-700">
                    {labels.learnMore}
                  </Link>
                </span>
              </div>
            )}
            {message.content}
          </div>
        )
      })}
    </div>
  )
}
