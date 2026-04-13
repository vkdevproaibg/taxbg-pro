import type { DiagnosticSnapshot } from './diagnostics'
import { llmChat } from './llm'
import { useUserStore } from '../store/userStore'

export interface AIDiagnosisResult {
  diagnosis: string
  suggestedFix: string
  autoFixable: boolean
  autoFixAction?: string
}

const LANG_NAMES: Record<string, string> = {
  ru: 'русском',
  en: 'English',
  bg: 'български',
  uk: 'українською',
}

export async function analyzeWithAI(
  snapshot: DiagnosticSnapshot,
): Promise<AIDiagnosisResult | null> {
  const apiKey = useUserStore.getState().llmApiKey
  if (!apiKey) return null

  const lang = snapshot.userLanguage || 'ru'
  const langName = LANG_NAMES[lang] ?? 'русском'

  const systemPrompt = `You are a diagnostic AI for TaxBG Pro — a Bulgarian accounting & tax system for IT entrepreneurs.

Your job: analyze the diagnostic snapshot, find problems, and suggest fixes.

RULES:
- Answer in ${langName} language.
- Be specific: name the exact component, account code, or module that has the issue.
- If the balance sheet doesn't balance: show which accounts cause the mismatch (compare debit vs credit totals).
- If VAT collected != VAT deductible logic is wrong: explain which entries are missing.
- If there are console errors: analyze them for patterns.

autoFixable actions you can recommend (set autoFixable=true):
- 'backfill_journal' — regenerate missing journal entries from transactions
- 'recalculate_balance' — recalculate balance sheet from journal entries
- 'fix_vat_entries' — regenerate VAT journal entries

If you are NOT confident about the fix: set autoFixable=false and write "нужна консультация со счетоводителем" (or equivalent in the user's language).

Respond ONLY as JSON with this structure (no markdown, no code blocks):
{"diagnosis": "...", "suggestedFix": "...", "autoFixable": true/false, "autoFixAction": "backfill_journal"|"recalculate_balance"|"fix_vat_entries"|null}`

  const userMessage = JSON.stringify({
    company: snapshot.company,
    dataStats: snapshot.dataStats,
    financials: snapshot.financials,
    accountBalances: snapshot.accountBalances,
    notifications: snapshot.notifications,
    consoleErrors: snapshot.consoleErrors.slice(0, 5),
    healthCheck: snapshot.healthCheck,
    balanceDifference: snapshot.financials.balanceDifference,
  })

  try {
    const response = await llmChat(
      [{ role: 'user', content: userMessage }],
      {
        systemPrompt,
        temperature: 0.2,
        maxTokens: 1500,
        apiKey,
      },
    )

    // Parse JSON response
    const text = response.content.trim()
    // Strip possible markdown code fences
    const jsonStr = text.replace(/^```json?\s*/, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(jsonStr) as AIDiagnosisResult
    return {
      diagnosis: parsed.diagnosis ?? '',
      suggestedFix: parsed.suggestedFix ?? '',
      autoFixable: Boolean(parsed.autoFixable),
      autoFixAction: parsed.autoFixAction ?? undefined,
    }
  } catch (err) {
    console.error('[aiDiagnostics] analysis failed:', err)
    return null
  }
}
