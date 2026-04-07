import { useEffect, useRef, useState } from 'react'
import { buildAuditorReport } from '../../lib/auditor'
import { llmChat, TAX_SYSTEM_PROMPT, type LLMMessage } from '../../lib/llm'
import { useUserStore } from '../../store/userStore'

export interface AssistantMessage {
  role: 'user' | 'assistant'
  content: string
}

export function useAssistant() {
  const llmModel = useUserStore((s) => s.llmModel)
  const llmApiKey = useUserStore((s) => s.llmApiKey)
  const useCustomModelForChat = useUserStore((s) => s.useCustomModelForChat)
  const legalForm = useUserStore((s) => s.legalForm)
  const taxPeriod = useUserStore((s) => s.taxPeriod)
  const companyName = useUserStore((s) => s.companyName)
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { role: 'assistant', content: 'Привет! Я TaxBG AI, чем помочь?' },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const auditKeyRef = useRef<string>('')

  useEffect(() => {
    const auditKey = `${legalForm}:${taxPeriod}:${companyName}`
    if (auditKeyRef.current === auditKey) return
    auditKeyRef.current = auditKey

    const auditMessage = buildAuditorReport({ legalForm, taxPeriod, companyName })
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: `Режим аудитора\n${auditMessage}` },
    ])
  }, [companyName, legalForm, taxPeriod])

  const sendMessage = async (message: string) => {
    const text = message.trim()
    if (!text || isLoading) return

    setError(null)
    setIsLoading(true)
    setMessages((prev) => [...prev, { role: 'user', content: text }])

    try {
      const history: LLMMessage[] = [
        ...messages,
        { role: 'user', content: text } as const,
      ].map((item) => ({
        role: item.role as LLMMessage['role'],
        content: item.content,
      }))

      const response = await llmChat(history, {
        model: useCustomModelForChat ? llmModel : undefined,
        apiKey: llmApiKey || undefined,
        systemPrompt: TAX_SYSTEM_PROMPT,
      })

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.content },
      ])
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : 'Не удалось получить ответ от AI.'
      setError(messageText)
    } finally {
      setIsLoading(false)
    }
  }

  return { messages, sendMessage, isLoading, error }
}
