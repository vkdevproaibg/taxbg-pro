import { useMemo } from 'react'
import { TAX_RATES_2026 } from '../../constants/tax-rates-2026'

export type LegalFormCalc = 'ood' | 'self'
export type ExpenseMode = 'normative' | 'actual'

export interface CalcInput {
  revenue: number
  expenses: number
  legalForm: LegalFormCalc
  hasBornBefore1960?: boolean
  expenseMode?: ExpenseMode
}

export interface CalcResult {
  revenue: number
  expenses: number
  grossProfit: number

  osigBase: number
  osigMonthly: number
  osigAnnual: number

  taxableBase: number
  incomeTax: number

  netAnnual: number
  effectiveRate: number

  breakdown: { label: string; amount: number; note?: string }[]
}

export function useCalculator(input: CalcInput): CalcResult {
  return useMemo(() => {
    const r = TAX_RATES_2026
    const { revenue, expenses, legalForm, expenseMode = 'normative' } = input

    if (legalForm === 'ood') {
      const grossProfit = revenue - expenses
      const taxableBase = Math.max(grossProfit, 0)
      const incomeTax = taxableBase * r.corporateTax.value
      const netAnnual = grossProfit - incomeTax
      // Statutory ЗКПО rate is always r.corporateTax.value (10%)
      // effectiveRate = tax burden on revenue (налоговая нагрузка на приход)
      const effectiveRate = revenue > 0
        ? (incomeTax / revenue) * 100
        : 0

      return {
        revenue,
        expenses,
        grossProfit,
        osigBase: 0,
        osigMonthly: 0,
        osigAnnual: 0,
        taxableBase,
        incomeTax,
        netAnnual,
        effectiveRate,
        breakdown: [
          { label: 'Приходи', amount: revenue },
          { label: 'Разходи', amount: -expenses },
          { label: 'Данъчна печалба', amount: taxableBase },
          { label: 'Корпоративен данък 10%', amount: -incomeTax, note: 'ЗКПО чл. 20' },
          { label: 'Нетна печалба (ООД)', amount: netAnnual },
        ],
      }
    } else {
      const minOsigBase = r.minOsigSol.value
      const clampedOsig = Math.min(Math.max(revenue / 12, minOsigBase), r.maxOsig.value)
      const dooRate = input.hasBornBefore1960 ? r.selfEmployed.dooNoUpf.value : r.selfEmployed.doo.value
      const upfRate = input.hasBornBefore1960 ? 0 : r.selfEmployed.upf.value
      const osigRate = dooRate + upfRate + r.selfEmployed.zo.value
      const osigMonthly = clampedOsig * osigRate
      const osigAnnual = osigMonthly * 12

      const deductibleExpenses = expenseMode === 'normative'
        ? revenue * r.normativeExpenses.self.value
        : expenses
      const taxableBase = Math.max(revenue - deductibleExpenses - osigAnnual, 0)
      const incomeTax = taxableBase * r.personalIncomeTax.value
      const netAnnual = revenue - deductibleExpenses - osigAnnual - incomeTax
      const effectiveRate = revenue > 0 ? ((osigAnnual + incomeTax) / revenue) * 100 : 0

      return {
        revenue,
        expenses,
        grossProfit: revenue - expenses,
        osigBase: clampedOsig,
        osigMonthly,
        osigAnnual,
        taxableBase,
        incomeTax,
        netAnnual,
        effectiveRate,
        breakdown: [
          { label: 'Приходи', amount: revenue },
          expenseMode === 'normative'
            ? { label: 'Норм. разходи 25%', amount: -deductibleExpenses, note: 'ЗДДФЛ чл. 29' }
            : { label: 'Реални разходи', amount: -deductibleExpenses, note: 'ЗДДФЛ чл. 29' },
          {
            label: 'Осигуровки годишно',
            amount: -osigAnnual,
            note: `${(osigRate * 100).toFixed(1)}% от ${clampedOsig.toFixed(0)} €/мес`,
          },
          { label: 'ДДФЛ 10%', amount: -incomeTax, note: 'ЗДДФЛ чл. 48' },
          { label: 'Нетен доход (самоосиг.)', amount: netAnnual },
        ],
      }
    }
  }, [input])
}
