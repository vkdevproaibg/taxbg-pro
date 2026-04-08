import { useEffect, useRef, useState } from 'react'
import { buildAuditorSystemPrompt } from '../../lib/auditor'
import { llmChat, TAX_SYSTEM_PROMPT, type LLMMessage } from '../../lib/llm'
import { useUserStore } from '../../store/userStore'
import { useAccountingStore } from '../../store/accountingStore'
import { useEmployeesStore } from '../../store/employeesStore'

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
  const { hasVat, hasEmployees, eik } = useUserStore()
  const transactions = useAccountingStore((s) => s.transactions)
  const employees = useEmployeesStore((s) => s.employees)
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { role: 'assistant', content: 'Привет! Я TaxBG AI, чем помочь?' },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const auditKeyRef = useRef<string>('')
  const auditorPromptRef = useRef<string>('')

  useEffect(() => {
    const auditKey = `${legalForm}:${taxPeriod}:${companyName}:${hasVat}:${hasEmployees}:${eik}:${transactions.length}:${employees.length}`
    if (auditKeyRef.current === auditKey) return
    auditKeyRef.current = auditKey

    const auditMessage = buildAuditorSystemPrompt({
      legalForm,
      companyName,
      taxPeriod,
      hasVat: hasVat ?? false,
      hasEmployees: hasEmployees ?? false,
      transactions,
      employees,
      eik: eik ?? '',
    })
    auditorPromptRef.current = auditMessage
  }, [companyName, legalForm, taxPeriod, hasVat, hasEmployees, eik, transactions, employees])

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
        systemPrompt: `${TAX_SYSTEM_PROMPT}\n\n${auditorPromptRef.current}`,
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
