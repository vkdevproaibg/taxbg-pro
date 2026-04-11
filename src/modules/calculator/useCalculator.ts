import { useMemo } from 'react'
import { getRateValue } from '../../lib/taxRates'

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
    const rateDate = `${new Date().getFullYear()}-01-01`
    const { revenue, expenses, legalForm, expenseMode = 'normative' } = input

    if (legalForm === 'ood') {
      const corporateTax = getRateValue('corporateTax', rateDate)
      const grossProfit = revenue - expenses
      const taxableBase = Math.max(grossProfit, 0)
      const incomeTax = taxableBase * corporateTax
      const netAnnual = grossProfit - incomeTax
      // Statutory ЗКПО rate is always corporateTax (10%)
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
      const minOsigBase =
        getRateValue('minOsigSol', rateDate) || getRateValue('minOsig', rateDate)
      const maxOsig = getRateValue('maxOsig', rateDate)
      const ddflRate = getRateValue('personalIncomeTax', rateDate)
      const normExpense = getRateValue('normativeExpenses.self', rateDate)

      const clampedOsig = Math.min(Math.max(revenue / 12, minOsigBase), maxOsig)
      const dooRate = input.hasBornBefore1960
        ? getRateValue('selfEmployed.dooNoUpf', rateDate)
        : getRateValue('selfEmployed.doo', rateDate)
      const upfRate = input.hasBornBefore1960
        ? 0
        : getRateValue('selfEmployed.upf', rateDate)
      const osigRate = dooRate + upfRate + getRateValue('selfEmployed.zo', rateDate)
      const osigMonthly = clampedOsig * osigRate
      const osigAnnual = osigMonthly * 12

      const deductibleExpenses = expenseMode === 'normative'
        ? revenue * normExpense
        : expenses
      const taxableBase = Math.max(revenue - deductibleExpenses - osigAnnual, 0)
      const incomeTax = taxableBase * ddflRate
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
