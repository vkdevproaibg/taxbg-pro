export interface LLMCatalogModel {
  id: string
  name: string
  contextLength: number | null
  promptPricePerM: number | null
  completionPricePerM: number | null
  vendor: string
}

interface OpenRouterModelRaw {
  id: string
  name?: string
  context_length?: number
  pricing?: {
    prompt?: string
    completion?: string
  }
}

interface OpenRouterModelsResponse {
  data?: OpenRouterModelRaw[]
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

function parsePerMillion(value?: string): number | null {
  if (!value) return null
  const n = Number(value)
  if (Number.isNaN(n)) return null
  return n * 1_000_000
}

export function formatUsdPerM(value: number | null): string {
  if (value === null) return 'n/a'
  return `$${value.toFixed(value < 1 ? 4 : 2)} / 1M`
}

export function formatContext(value: number | null): string {
  if (value === null) return 'n/a'
  return value.toLocaleString()
}

export async function fetchOpenRouterModels(apiKey?: string): Promise<LLMCatalogModel[]> {
  const headers: Record<string, string> = {}
  if (apiKey?.trim()) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  const response = await fetch(`${OPENROUTER_BASE}/models`, { headers })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter models error ${response.status}: ${errorText}`)
  }

  const data = (await response.json()) as OpenRouterModelsResponse
  const models = data.data ?? []

  return models.map((model) => ({
    id: model.id,
    name: model.name ?? model.id,
    contextLength: model.context_length ?? null,
    promptPricePerM: parsePerMillion(model.pricing?.prompt),
    completionPricePerM: parsePerMillion(model.pricing?.completion),
    vendor: model.id.split('/')[0] ?? 'unknown',
  }))
}

export async function testOpenRouterModel(options: {
  apiKey: string
  model: string
  prompt?: string
}): Promise<{ content: string; latencyMs: number }> {
  const startedAt = performance.now()

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
      'HTTP-Referer': import.meta.env.VITE_APP_URL ?? 'http://localhost:5173',
      'X-Title': 'TaxBG Pro',
    },
    body: JSON.stringify({
      model: options.model,
      messages: [
        {
          role: 'user',
          content: options.prompt ?? 'Reply with: OK',
        },
      ],
      max_tokens: 80,
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter test error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty test response')

  return {
    content,
    latencyMs: Math.round(performance.now() - startedAt),
  }
}

export async function testInternetLatency(): Promise<number> {
  const startedAt = performance.now()
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    method: 'GET',
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Internet test error ${response.status}: ${errorText}`)
  }

  return Math.round(performance.now() - startedAt)
}
