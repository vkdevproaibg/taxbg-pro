import type { Transaction } from '../store/accountingStore'
import type { Employee } from '../store/employeesStore'
import type { JournalEntry } from '../store/journalStore'
import { AUDIT_TEMPLATES, type AuditLang, type AuditTemplate } from '../constants/audit-templates'
import { getRateValue } from './taxRates'
import { buildOPR } from './financialReports'
import { calculateObrazec1 } from './obrazec1'

// ─────────────────────────────────────────────────────────────
// Audit document generator — fills static templates with data
// from the user's stores. LLM is NOT involved. The output is
// always bilingual: the authoritative Bulgarian text and the
// user-language translation.
// ─────────────────────────────────────────────────────────────

const MISSING = '___'

export interface AuditDocContext {
  companyName: string
  eik: string
  ownerName: string
  legalForm: string
  hasVat: boolean
  hasEmployees: boolean
  transactions: Transaction[]
  employees: Employee[]
  journalEntries: JournalEntry[]
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

function formatDateDMY(d: Date): string {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function money(n: number): string {
  return n.toLocaleString('bg-BG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function last12MonthsRange(today: Date): { fromIso: string; toIso: string } {
  const to = new Date(today)
  const from = new Date(today)
  from.setMonth(from.getMonth() - 12)
  return { fromIso: isoDate(from), toIso: isoDate(to) }
}

const INCOME_TYPES: Transaction['type'][] = [
  'income', 'vat_out', 'appstore', 'googleplay', 'stripe',
]

// ── Data collection ─────────────────────────────────────────

export function collectTemplateData(
  requiredData: string[],
  context: AuditDocContext,
): Record<string, string> {
  const today = new Date()
  const todayIso = isoDate(today)
  const { fromIso, toIso } = last12MonthsRange(today)

  const currentYear = today.getFullYear()
  const previousYear = currentYear - 1

  // ── Revenue (last 12 months) ──
  const incomeTx = context.transactions.filter(
    t => INCOME_TYPES.includes(t.type) && t.date >= fromIso && t.date <= toIso,
  )
  const totalRevenue = incomeTx.reduce((s, t) => s + t.amount, 0)

  // Last complete month (YYYY-MM) for payroll obrazec1
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const period = `${lastMonth.getFullYear()}-${pad2(lastMonth.getMonth() + 1)}`

  // Build rate values up-front
  const rateVatThreshold = getRateValue('vatThreshold', todayIso)
  const rateMaxOsig = getRateValue('maxOsig', todayIso)
  const rateMinWage = getRateValue('minWage', todayIso)
  const rateMinOsigSol =
    getRateValue('minOsigSol', todayIso) || getRateValue('minOsig', todayIso)

  const out: Record<string, string> = {}

  // Lazy OPR — only compute if any ZKPO field is required
  let oprCache: ReturnType<typeof buildOPR> | null = null
  const opr = (): ReturnType<typeof buildOPR> => {
    if (oprCache) return oprCache
    const fromY = `${currentYear}-01-01`
    const toY = `${currentYear}-12-31`
    oprCache = buildOPR(
      context.journalEntries,
      context.transactions,
      fromY,
      toY,
      context.companyName,
    )
    return oprCache
  }

  // Lazy Obrazec 1 — only for osig-obrazec1 template
  let obrazecCache: ReturnType<typeof calculateObrazec1> | null = null
  const obrazec = (): ReturnType<typeof calculateObrazec1> => {
    if (obrazecCache) return obrazecCache
    obrazecCache = calculateObrazec1(
      context.employees,
      period,
      context.companyName,
      context.eik,
    )
    return obrazecCache
  }

  for (const key of requiredData) {
    switch (key) {
      case 'companyName':
        out[key] = context.companyName || MISSING
        break
      case 'eik':
        out[key] = context.eik || MISSING
        break
      case 'ownerName':
        out[key] = context.ownerName || MISSING
        break
      case 'today':
        out[key] = formatDateDMY(today)
        break
      case 'currentYear':
        out[key] = String(currentYear)
        break
      case 'previousYear':
        out[key] = String(previousYear)
        break
      case 'periodFrom':
        out[key] = formatDateDMY(new Date(fromIso))
        break
      case 'periodTo':
        out[key] = formatDateDMY(new Date(toIso))
        break
      case 'period':
        out[key] = period
        break
      case 'totalRevenue':
        out[key] = money(totalRevenue)
        break
      case 'vatThreshold':
        out[key] = money(rateVatThreshold)
        break
      case 'maxOsig':
        out[key] = money(rateMaxOsig)
        break
      case 'minWage':
        out[key] = money(rateMinWage)
        break
      case 'minOsigSol':
        out[key] = money(rateMinOsigSol)
        break

      // ── ZKPO fields — from buildOPR ──
      case 'nonDeductible':
        out[key] = money(opr().nonDeductible)
        break
      case 'taxableProfit':
        out[key] = money(opr().taxableProfit)
        break
      case 'corporateTax':
        out[key] = money(opr().corporateTax)
        break
      case 'netProfit':
        out[key] = money(opr().netProfit)
        break
      case 'financialResult':
        out[key] = money(opr().financialResult)
        break

      // ── Obrazec 1 fields ──
      case 'totalEr':
        out[key] = context.employees.length > 0
          ? money(obrazec().totalEmployerContrib)
          : MISSING
        break
      case 'totalEe':
        out[key] = context.employees.length > 0
          ? money(obrazec().totalEmployeeContrib)
          : MISSING
        break

      // ── Fields the system cannot derive — left for manual fill ──
      case 'dividendAmount':
      case 'dividendTax':
      case 'ownerEgn':
      case 'gfoRegistryNumber':
      case 'balanceDate':
      case 'balanceDifference':
      case 'balanceReason':
      case 'balanceAction':
        out[key] = MISSING
        break

      default:
        out[key] = MISSING
        break
    }
  }

  return out
}

// ── Template filling ────────────────────────────────────────

export function fillTemplate(
  template: string,
  data: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    if (key in data) return data[key]
    return `{{${key}}}`
  })
}

// ── High-level API ──────────────────────────────────────────

export interface GeneratedNote {
  bg: string
  userLang: string
  templateUsed: string
  hasMissing: boolean
}

export function generateExplanatoryNote(
  templateId: string,
  context: AuditDocContext,
  userLanguage: AuditLang,
): GeneratedNote | null {
  const template = AUDIT_TEMPLATES.find(t => t.id === templateId)
  if (!template) return null

  const data = collectTemplateData(template.required_data, context)

  const bgFilled = fillTemplate(template.template_bg, data)
  const langKey =
    userLanguage === 'ru'
      ? 'template_ru'
      : userLanguage === 'en'
        ? 'template_en'
        : userLanguage === 'uk'
          ? 'template_uk'
          : 'template_bg'
  const userFilled = fillTemplate(template[langKey] as string, data)

  const hasMissing =
    bgFilled.includes(MISSING) || userFilled.includes(MISSING)

  return {
    bg: bgFilled,
    userLang: userFilled,
    templateUsed: templateId,
    hasMissing,
  }
}

export function getApplicableTemplates(context: {
  legalForm: 'ood' | 'et' | 'self' | string
  hasVat: boolean
  hasEmployees: boolean
}): AuditTemplate[] {
  return AUDIT_TEMPLATES.filter(tpl => {
    if (!tpl.applicable.legalForms.includes(context.legalForm as 'ood' | 'et' | 'self')) {
      return false
    }
    if (tpl.applicable.hasVat !== undefined && tpl.applicable.hasVat !== context.hasVat) {
      return false
    }
    if (
      tpl.applicable.hasEmployees !== undefined &&
      tpl.applicable.hasEmployees !== context.hasEmployees
    ) {
      return false
    }
    return true
  })
}
