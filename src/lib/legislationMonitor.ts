import { llmChat } from './llm'
import type { CalendarEvent } from '../constants/calendar-events'

export interface LegislationUpdate {
  eventId: string
  summary_ru: string
  severity: 'info' | 'warning' | 'critical'
  detectedAt: string
  publishedAt?: string
  effectiveFrom?: string
  dvNumber?: string
  sourceUrl?: string
}

const MONITOR_PROMPT = `Ты — юридический монитор болгарского налогового законодательства 2026 года.
Проверь, не изменились ли следующие нормы болгарского права в 2026 году.
Ищи изменения на официальных сайтах: nap.bg, noi.bg, nsi.bg, brra.bg, parliament.bg, dv.parliament.bg.

ВАЖНО: Для каждого найденного изменения указывай:
- Номер Държавен вестник (ДВ бр. XX/YYYY)
- Дату публикации в ДВ (publishedAt)
- Дату вступления в силу (effectiveFrom) — МОЖЕТ ОТЛИЧАТЬСЯ от даты публикации
- Переходный период если есть

Ответь ТОЛЬКО в формате JSON без пояснений:
{
  "changes": [
    {
      "eventId": "id нормы",
      "changed": true,
      "summary_ru": "краткое описание изменения на русском",
      "severity": "info/warning/critical",
      "publishedAt": "YYYY-MM-DD или null",
      "effectiveFrom": "YYYY-MM-DD или null",
      "dvNumber": "ДВ бр. XX/YYYY или null",
      "sourceUrl": "url источника или null"
    }
  ]
}

Нормы для проверки:
`

export async function checkLegislationUpdates(
  events: CalendarEvent[],
  apiKey?: string
): Promise<LegislationUpdate[]> {
  const normsToCheck = events
    .map((e) => [
      `- id: "${e.id}"`,
      `  норма: ${e.legalBasis}`,
      `  ДВ: ${e.dv}`,
      `  опубликовано: ${e.publishedAt}`,
      `  в силе с: ${e.effectiveFrom}`,
      `  действует до: ${e.effectiveTo ?? 'настоящего времени'}`,
      `  версия: ${e.version}`,
      `  проверено: ${e.lastVerified}`,
    ].join('\n'))
    .join('\n\n')

  try {
    const response = await llmChat(
      [{ role: 'user', content: MONITOR_PROMPT + normsToCheck }],
      {
        model: 'anthropic/claude-sonnet-4-5',
        maxTokens: 2000,
        temperature: 0.1,
        apiKey,
      }
    )

    const text = response.content
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0])
    const updates: LegislationUpdate[] = []

    for (const change of parsed.changes ?? []) {
      if (change.changed && change.summary_ru) {
        updates.push({
          eventId: change.eventId,
          summary_ru: change.summary_ru,
          severity: change.severity ?? 'info',
          detectedAt: new Date().toISOString(),
          publishedAt: change.publishedAt ?? undefined,
          effectiveFrom: change.effectiveFrom ?? undefined,
          dvNumber: change.dvNumber ?? undefined,
          sourceUrl: change.sourceUrl ?? undefined,
        })
      }
    }

    return updates
  } catch {
    return []
  }
}

const UPDATES_KEY = 'taxbg-legislation-updates'
const LAST_CHECK_KEY = 'taxbg-legislation-last-check'

export function saveLegislationUpdates(updates: LegislationUpdate[]): void {
  localStorage.setItem(UPDATES_KEY, JSON.stringify(updates))
  localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString())
}

export function loadLegislationUpdates(): LegislationUpdate[] {
  try {
    const raw = localStorage.getItem(UPDATES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getLastCheckDate(): string | null {
  return localStorage.getItem(LAST_CHECK_KEY)
}

export function shouldCheck(): boolean {
  const last = getLastCheckDate()
  if (!last) return true
  return Date.now() - new Date(last).getTime() > 24 * 60 * 60 * 1000
}
