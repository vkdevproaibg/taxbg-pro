import { TAX_RATES_2026 } from '../constants/tax-rates-2026'

// ─────────────────────────────────────────────────────────────
// TAX RATES AUDIT SYSTEM — TaxBG Pro
//
// PURPOSE: Detect when tax rates in code diverge from law,
// and alert when periodic review is due.
//
// HOW TO USE WHEN A LAW CHANGES:
//   1. Update value in src/constants/tax-rates-2026.ts
//   2. Update expectedValue + lastVerified here
//   3. Update nextReview to next expected change date
//   4. Add a row to TAX_RATES_CHANGELOG.md
//   5. npm run build — done
// ─────────────────────────────────────────────────────────────

export interface AuditItem {
  id: string
  name: string
  currentValue: number
  expectedValue: number
  unit: '%' | '€' | '€/мес'
  legalSource: string
  officialUrl: string
  lastVerified: string    // ISO date of last manual check
  reviewCycle: 'annual' | 'quarterly' | 'on_law_change'
  nextReview: string      // alert if today > this date
  notes: string
}

export const TAX_AUDIT_TABLE: AuditItem[] = [
  {
    id: 'corporate_tax',
    name: 'Корпоративен данък',
    currentValue: TAX_RATES_2026.corporateTax.value * 100,
    expectedValue: 10,
    unit: '%',
    legalSource: 'ЗКПО чл. 20',
    officialUrl: 'https://nap.bg/page?id=95',
    lastVerified: '2026-04-10',
    reviewCycle: 'annual',
    nextReview: '2027-01-01',
    notes: 'Неизменна с 2007 г.',
  },
  {
    id: 'personal_income_tax',
    name: 'ДДФЛ (физически лица)',
    currentValue: TAX_RATES_2026.personalIncomeTax.value * 100,
    expectedValue: 10,
    unit: '%',
    legalSource: 'ЗДДФЛ чл. 48',
    officialUrl: 'https://nap.bg/page?id=96',
    lastVerified: '2026-04-10',
    reviewCycle: 'annual',
    nextReview: '2027-01-01',
    notes: 'Плоска ставка с 2008 г.',
  },
  {
    id: 'dividend_tax',
    name: 'Данък дивиденти',
    currentValue: TAX_RATES_2026.dividendTax.value * 100,
    expectedValue: 5,
    unit: '%',
    legalSource: 'ЗДДФЛ чл. 38 ал. 2',
    officialUrl: 'https://nap.bg/page?id=96',
    lastVerified: '2026-04-10',
    reviewCycle: 'annual',
    nextReview: '2027-01-01',
    notes: 'Снижена с 7% до 5% с 01.01.2024 (ДВ бр. 106/2023).',
  },
  {
    id: 'vat_standard',
    name: 'ДДС стандартна ставка',
    currentValue: TAX_RATES_2026.vat.value * 100,
    expectedValue: 20,
    unit: '%',
    legalSource: 'ЗДДС чл. 66 ал. 1',
    officialUrl: 'https://nap.bg/page?id=100',
    lastVerified: '2026-04-10',
    reviewCycle: 'annual',
    nextReview: '2027-01-01',
    notes: '20% с 1999 г.',
  },
  {
    id: 'vat_hospitality',
    name: 'ДДС хотели и ресторанти',
    currentValue: TAX_RATES_2026.vatHospitality.value * 100,
    expectedValue: 9,
    unit: '%',
    legalSource: 'ЗДДС чл. 66 ал. 2',
    officialUrl: 'https://nap.bg/page?id=100',
    lastVerified: '2026-04-10',
    reviewCycle: 'quarterly',
    nextReview: '2026-07-01',
    notes: 'Намалена ставка 9% — обсуждалось повышение. Проверять каждый квартал.',
  },
  {
    id: 'vat_threshold',
    name: 'Праг за задължителна ДДС регистрация',
    currentValue: TAX_RATES_2026.vatThreshold.value,
    expectedValue: 51130,
    unit: '€',
    legalSource: 'ЗДДС чл. 96 ал. 1',
    officialUrl: 'https://nap.bg/page?id=100',
    lastVerified: '2026-04-10',
    reviewCycle: 'annual',
    nextReview: '2027-01-01',
    notes: '51 130 € от 01.01.2026 (EU VAT Directive порог за България).',
  },
  {
    id: 'min_wage',
    name: 'Минимална работна заплата (МРЗ)',
    currentValue: TAX_RATES_2026.minWage.value,
    expectedValue: 620.20,
    unit: '€/мес',
    legalSource: 'ПМС № 40/2026',
    officialUrl: 'https://mlsp.government.bg',
    lastVerified: '2026-04-10',
    reviewCycle: 'annual',
    nextReview: '2027-01-01',
    notes: 'МРЗ меняется ежегодно с 1 января постановлением МС.',
  },
  {
    id: 'min_osig',
    name: 'Минимален осигурителен доход (самоосигуряващ)',
    currentValue: TAX_RATES_2026.minOsig.value,
    expectedValue: 620.20,
    unit: '€/мес',
    legalSource: 'ЗБДОО 2026 Приложение 2',
    officialUrl: 'https://nap.bg/document?id=24',
    lastVerified: '2026-04-10',
    reviewCycle: 'annual',
    nextReview: '2027-01-01',
    notes: 'Равен МРЗ с 2023. Утверждается в ЗБДОО ежегодно в декабре.',
  },
  {
    id: 'max_osig',
    name: 'Максимален осигурителен доход',
    currentValue: TAX_RATES_2026.maxOsig.value,
    expectedValue: 2111.64,
    unit: '€/мес',
    legalSource: 'ЗБДОО 2026 чл. 9',
    officialUrl: 'https://nap.bg/document?id=24',
    lastVerified: '2026-04-10',
    reviewCycle: 'annual',
    nextReview: '2027-01-01',
    notes: 'Меняется ежегодно. Проверять в декабре.',
  },
  {
    id: 'employer_doo',
    name: 'ДОО — работодател',
    currentValue: TAX_RATES_2026.employer.doo.value * 100,
    expectedValue: 9.82,
    unit: '%',
    legalSource: 'КСО чл. 6 ал. 3',
    officialUrl: 'https://nap.bg/page?id=93',
    lastVerified: '2026-04-10',
    reviewCycle: 'annual',
    nextReview: '2027-01-01',
    notes: 'Может меняться при реформе КСО.',
  },
  {
    id: 'employee_doo',
    name: 'ДОО — работник',
    currentValue: TAX_RATES_2026.employee.doo.value * 100,
    expectedValue: 7.12,
    unit: '%',
    legalSource: 'КСО чл. 6 ал. 3',
    officialUrl: 'https://nap.bg/page?id=93',
    lastVerified: '2026-04-10',
    reviewCycle: 'annual',
    nextReview: '2027-01-01',
    notes: '',
  },
  {
    id: 'employer_zo',
    name: 'Здравно осигуряване — работодател',
    currentValue: TAX_RATES_2026.employer.zo.value * 100,
    expectedValue: 4.80,
    unit: '%',
    legalSource: 'ЗЗО чл. 40',
    officialUrl: 'https://nap.bg/page?id=93',
    lastVerified: '2026-04-10',
    reviewCycle: 'annual',
    nextReview: '2027-01-01',
    notes: '',
  },
  {
    id: 'employee_zo',
    name: 'Здравно осигуряване — работник',
    currentValue: TAX_RATES_2026.employee.zo.value * 100,
    expectedValue: 3.20,
    unit: '%',
    legalSource: 'ЗЗО чл. 40',
    officialUrl: 'https://nap.bg/page?id=93',
    lastVerified: '2026-04-10',
    reviewCycle: 'annual',
    nextReview: '2027-01-01',
    notes: '',
  },
  {
    id: 'self_employed_upf',
    name: 'ДЗПО УПФ — самоосигуряващ',
    currentValue: TAX_RATES_2026.selfEmployed.upf.value * 100,
    expectedValue: 5.00,
    unit: '%',
    legalSource: 'КСО чл. 157',
    officialUrl: 'https://nap.bg/page?id=93',
    lastVerified: '2026-04-10',
    reviewCycle: 'annual',
    nextReview: '2027-01-01',
    notes: '',
  },
  {
    id: 'self_employed_zo',
    name: 'Здравно осигуряване — самоосигуряващ',
    currentValue: TAX_RATES_2026.selfEmployed.zo.value * 100,
    expectedValue: 8.00,
    unit: '%',
    legalSource: 'ЗЗО чл. 40',
    officialUrl: 'https://nap.bg/page?id=93',
    lastVerified: '2026-04-10',
    reviewCycle: 'annual',
    nextReview: '2027-01-01',
    notes: '',
  },
]

// ── AUDIT ENGINE ──────────────────────────────────────────────

export type AuditStatus = 'ok' | 'mismatch' | 'needs_review' | 'overdue'

export interface AuditResult {
  item: AuditItem
  status: AuditStatus
  message: string
}

export function auditTaxRates(
  today = new Date().toISOString().split('T')[0]
): AuditResult[] {
  return TAX_AUDIT_TABLE.map(item => {
    const tolerance = 0.005

    if (Math.abs(item.currentValue - item.expectedValue) > tolerance) {
      return {
        item,
        status: 'mismatch' as AuditStatus,
        message: `Текущо: ${item.currentValue}${item.unit} ≠ очаквано: ${item.expectedValue}${item.unit}`,
      }
    }

    const daysUntilReview = Math.floor(
      (new Date(item.nextReview).getTime() - new Date(today).getTime())
      / (1000 * 60 * 60 * 24)
    )

    if (daysUntilReview < 0) {
      return {
        item,
        status: 'overdue' as AuditStatus,
        message: `Просрочена проверка: трябваше ${item.nextReview} (преди ${Math.abs(daysUntilReview)} дни)`,
      }
    }

    if (daysUntilReview <= 30) {
      return {
        item,
        status: 'needs_review' as AuditStatus,
        message: `Проверка след ${daysUntilReview} дни (${item.nextReview})`,
      }
    }

    return {
      item,
      status: 'ok' as AuditStatus,
      message: `Проверено ${item.lastVerified} · следваща проверка: ${item.nextReview}`,
    }
  })
}

export function getAuditSummary(today?: string) {
  const results = auditTaxRates(today)
  return {
    total:        results.length,
    ok:           results.filter(r => r.status === 'ok').length,
    needs_review: results.filter(r => r.status === 'needs_review').length,
    overdue:      results.filter(r => r.status === 'overdue').length,
    mismatch:     results.filter(r => r.status === 'mismatch').length,
    hasCritical:  results.some(r =>
                    r.status === 'mismatch' || r.status === 'overdue'),
    results,
  }
}
