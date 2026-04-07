import type { AssistantMessage } from './useAssistant'

interface ChatWindowProps {
  messages: AssistantMessage[]
}

export default function ChatWindow({ messages }: ChatWindowProps) {
  return (
    <div className="space-y-2 rounded border border-slate-200 bg-white p-3">
      {messages.map((message, index) => (
        <div
          key={`${message.role}-${index}-${message.content}`}
          className={`rounded p-2 text-sm ${message.role === 'user' ? 'ml-8 bg-slate-900 text-white' : 'mr-8 bg-slate-100 text-slate-800'}`}
        >
          {message.content}
        </div>
      ))}
    </div>
  )
}
