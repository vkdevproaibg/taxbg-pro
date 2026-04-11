export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMResponse {
  content: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = import.meta.env.VITE_LLM_MODEL ?? 'anthropic/claude-sonnet-4-5'

export async function llmChat(
  messages: LLMMessage[],
  options?: {
    model?: string
    maxTokens?: number
    temperature?: number
    systemPrompt?: string
    apiKey?: string
  }
): Promise<LLMResponse> {
  // TODO Step 2: if llmMode === 'platform',
  // call Supabase Edge Function instead of direct API
  // The edge function holds our key server-side
  const apiKey = options?.apiKey
  if (!apiKey) {
    throw new Error(
      'Для использования AI введите ключ OpenRouter в Настройки. В Pro подписке ключ не нужен.'
    )
  }

  const model = options?.model ?? DEFAULT_MODEL

  const fullMessages: LLMMessage[] = options?.systemPrompt
    ? [{ role: 'system', content: options.systemPrompt }, ...messages]
    : messages

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': import.meta.env.VITE_APP_URL ?? 'http://localhost:5173',
      'X-Title': 'TaxBG Pro',
    },
    body: JSON.stringify({
      model,
      messages: fullMessages,
      max_tokens: options?.maxTokens ?? 1000,
      temperature: options?.temperature ?? 0.7,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const choice = data.choices?.[0]

  if (!choice?.message?.content) {
    throw new Error('Пустой ответ от LLM')
  }

  return {
    content: choice.message.content,
    model: data.model ?? model,
    usage: data.usage,
  }
}

export async function* llmStream(
  messages: LLMMessage[],
  options?: {
    model?: string
    maxTokens?: number
    temperature?: number
    systemPrompt?: string
    apiKey?: string
  }
): AsyncGenerator<string> {
  // TODO Step 2: if llmMode === 'platform',
  // call Supabase Edge Function instead of direct API
  // The edge function holds our key server-side
  const apiKey = options?.apiKey
  if (!apiKey) {
    throw new Error(
      'Для использования AI введите ключ OpenRouter в Настройки. В Pro подписке ключ не нужен.'
    )
  }

  const model = options?.model ?? DEFAULT_MODEL

  const fullMessages: LLMMessage[] = options?.systemPrompt
    ? [{ role: 'system', content: options.systemPrompt }, ...messages]
    : messages

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': import.meta.env.VITE_APP_URL ?? 'http://localhost:5173',
      'X-Title': 'TaxBG Pro',
    },
    body: JSON.stringify({
      model,
      messages: fullMessages,
      max_tokens: options?.maxTokens ?? 2000,
      temperature: options?.temperature ?? 0.7,
      stream: true,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter API error ${response.status}: ${err}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

    for (const line of lines) {
      const raw = line.slice(6).trim()
      if (raw === '[DONE]') return
      try {
        const json = JSON.parse(raw)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {
        // skip malformed chunks
      }
    }
  }
}

export const TAX_SYSTEM_PROMPT = `Ты — TaxBG AI, налоговый ассистент приложения TaxBG Pro.
Ты эксперт по болгарскому налоговому законодательству 2026 года.
Аудитория — IT предприниматели из России и Украины, переехавшие в Болгарию.

ВАЖНО: Болгария перешла на евро (€, EUR) с 1 января 2026. Все суммы — в евро.
Исторический курс конвертации: 1 EUR = 1.95583 BGN (зафиксирован навсегда).

Отвечай на языке вопроса (RU / UK / EN / BG).
Ссылайся на конкретные статьи законов (ЗКПО, ЗДДФЛ, ЗДДС, КСО, ЗЗО).
Предупреждай о сроках и штрафах.

Актуальные данные 2026:
- Корпоративен данък (ООД): 10%
- ДДФЛ физически лица: 10%
- Данък дивиденти: 5% (ЗДДФЛ чл. 38 ал. 2)
- ДДС: 20% (праг регистрации: ~51 130 €/год)
- МРЗ: 620.20 €/мес.
- Мин. осигурителен доход: ~551 €/мес.
- Макс. осигурителен доход: ~2 111.64 €/мес.
- Самоосигуряващ (без ОЗМ): ДОО 14.8% + УПФ 5% + ЗО 8% = 27.8%
- Трудов договор работодател: ~20.34%
- Трудов договор работник: ~14.5%

Если не уверен — рекомендуй обратиться к лицензированному счетоводител.`
