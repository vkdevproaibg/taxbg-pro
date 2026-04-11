import { llmChat } from './llm'
import { getAllRatesAt } from './taxRates'
import type { Transaction } from '../store/accountingStore'
import type { Employee } from '../store/employeesStore'

// ─────────────────────────────────────────────────────────────
// Audit LLM assistant — for non-standard inspector questions.
//
// Privacy rule: never send raw transaction rows. The prompt
// contains only aggregates (last 12 months) and counts.
// ─────────────────────────────────────────────────────────────

export type AuditUserLang = 'ru' | 'en' | 'bg' | 'uk'

export interface AuditLLMOptions {
  question: string
  companyName: string
  eik: string
  legalForm: string
  hasVat: boolean
  hasEmployees: boolean
  transactions: Transaction[]
  employees: Employee[]
  userLanguage: AuditUserLang
  apiKey?: string
}

const INCOME_TYPES: Transaction['type'][] = [
  'income', 'vat_out', 'appstore', 'googleplay', 'stripe',
]
const EXPENSE_TYPES: Transaction['type'][] = [
  'expense', 'vat_in', 'salary', 'depreciation', 'vehicle_tax', 'vehicle_expense',
]

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function aggregate(transactions: Transaction[]): {
  totalIncome: number
  totalExpenses: number
  vatCollected: number
  vatDeductible: number
} {
  const today = new Date()
  const from = new Date(today)
  from.setMonth(from.getMonth() - 12)
  const fromIso = isoDate(from)
  const toIso = isoDate(today)

  const inRange = transactions.filter(t => t.date >= fromIso && t.date <= toIso)

  let totalIncome = 0
  let totalExpenses = 0
  let vatCollected = 0
  let vatDeductible = 0

  for (const t of inRange) {
    if (INCOME_TYPES.includes(t.type)) totalIncome += t.amount
    if (EXPENSE_TYPES.includes(t.type)) totalExpenses += t.amount
    if (t.type === 'vat_out') vatCollected += t.vatAmount ?? 0
    if (t.type === 'vat_in')  vatDeductible += t.vatAmount ?? 0
  }

  return { totalIncome, totalExpenses, vatCollected, vatDeductible }
}

function languageLabel(lang: AuditUserLang): string {
  switch (lang) {
    case 'ru': return 'руски език'
    case 'en': return 'английски език'
    case 'uk': return 'украински език'
    case 'bg': return 'български език'
  }
}

function buildSystemPrompt(opts: AuditLLMOptions): string {
  const agg = aggregate(opts.transactions)
  const employeeCount = opts.employees.length
  const avgSalary =
    employeeCount > 0
      ? opts.employees.reduce((s, e) => s + e.grossSalary, 0) / employeeCount
      : 0

  const today = isoDate(new Date())
  const rates = getAllRatesAt(today)
  // Privacy: include only a compact subset (flat keys + key groups).
  // No raw transaction data. Purely coefficients and thresholds.
  const compactRates: Record<string, number> = {}
  for (const [key, entry] of Object.entries(rates)) {
    compactRates[key] = entry.value
  }
  const ratesJSON = JSON.stringify(compactRates)

  return `Ти си помощник-счетоводител в българско дружество. Отговаряш на въпрос на данъчен инспектор от НАП/НОИ.

ПРАВИЛА:
1. Отговорът ТРЯБВА да е на два езика. Първо — секция "=== BG ===" на български (за инспектора). После — секция "=== USER ===" на ${languageLabel(opts.userLanguage)} (за клиента).
2. Използвай САМО данните от контекста по-долу. НЕ измисляй числа, дати или факти.
3. Цитирай конкретни членове от закона (ЗДДС, КСО, ЗКПО, ЗДДФЛ, ЗСч) когато е уместно.
4. Ако не си сигурен — напиши: "За този въпрос е необходима консултация с лицензиран счетоводител."
5. Тонът е официален и уважителен — това е отговор към държавен орган.
6. НЕ давай правни съвети — само обяснявай фактическата ситуация на база данните.
7. Форматът е обяснителна записка. Не добавяй markdown — само чист текст.

ДАННИ НА ДРУЖЕСТВОТО:
- Име: ${opts.companyName || 'не е въведено'}
- ЕИК: ${opts.eik || 'не е въведен'}
- Правна форма: ${opts.legalForm}
- ДДС регистрация: ${opts.hasVat ? 'да' : 'не'}
- Има служители: ${opts.hasEmployees ? 'да' : 'не'}
- Брой служители: ${employeeCount}
- Средна брутна заплата: ${avgSalary.toFixed(2)} €

ТРАНЗАКЦИИ (последни 12 месеца, обобщени):
- Приходи: ${agg.totalIncome.toFixed(2)} €
- Разходи: ${agg.totalExpenses.toFixed(2)} €
- ДДС начислен (чл. 86 ЗДДС): ${agg.vatCollected.toFixed(2)} €
- ДДС кредит (чл. 68 ЗДДС): ${agg.vatDeductible.toFixed(2)} €

ДЕЙСТВАЩИ СТАВКИ (${today}):
${ratesJSON}

ЗАДАЧА:
Подготви отговор-обяснителна записка към НАП/НОИ по въпроса на инспектора. Формат:

=== BG ===
<текст на български — официална обяснителна записка>

=== USER ===
<същият текст, преведен на ${languageLabel(opts.userLanguage)}>`
}

function parseBilingualResponse(
  raw: string,
  userLanguage: AuditUserLang,
): { bg: string; userLang: string } {
  const bgMarker = /===\s*BG\s*===/i
  const userMarker = /===\s*USER\s*===/i

  const bgMatch = raw.match(bgMarker)
  const userMatch = raw.match(userMarker)

  if (bgMatch && userMatch && userMatch.index! > bgMatch.index!) {
    const bgStart = bgMatch.index! + bgMatch[0].length
    const bgEnd = userMatch.index!
    const userStart = userMatch.index! + userMatch[0].length

    return {
      bg: raw.slice(bgStart, bgEnd).trim(),
      userLang: raw.slice(userStart).trim(),
    }
  }

  // Fallback — LLM didn't follow the marker convention.
  // Return the raw text in both slots so the user can still copy it.
  void userLanguage
  return { bg: raw.trim(), userLang: raw.trim() }
}

export async function generateAuditAnswer(
  opts: AuditLLMOptions,
): Promise<{ bg: string; userLang: string } | null> {
  if (!opts.apiKey) return null

  const systemPrompt = buildSystemPrompt(opts)

  try {
    const response = await llmChat(
      [{ role: 'user', content: opts.question }],
      {
        systemPrompt,
        maxTokens: 1500,
        temperature: 0.2,
        apiKey: opts.apiKey,
      },
    )
    return parseBilingualResponse(response.content, opts.userLanguage)
  } catch (err) {
    console.warn('[auditLLM] generateAuditAnswer failed:', err)
    return null
  }
}
