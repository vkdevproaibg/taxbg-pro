import { useMemo } from 'react'
import { TAX_RATES_2026 } from '../../constants/tax-rates-2026'

export interface DividendInput {
  annualProfit: number
  ownerSharePct: number
  compareToSalary: number
}

export interface DividendResult {
  corporateTax: number
  profitAfterTax: number
  dividendGross: number
  dividendTax: number
  dividendNet: number
  salaryNet: number
  salaryEmployerCost: number
  salaryEmployeeCost: number
  diff: number
  recommendation: 'dividend' | 'salary' | 'equal'
  breakdown: { label: string; amount: number; note?: string; separator?: boolean }[]
}

export function useDividend(input: DividendInput): DividendResult {
  return useMemo(() => {
    const r = TAX_RATES_2026
    const share = input.ownerSharePct / 100

    const corporateTax = Math.max(input.annualProfit, 0) * r.corporateTax.value
    const profitAfterTax = Math.max(input.annualProfit - corporateTax, 0)
    const dividendGross = profitAfterTax * share
    const dividendTax = dividendGross * r.dividendTax.value
    const dividendNet = dividendGross - dividendTax

    const gross = input.compareToSalary
    const cap = Math.min(gross, r.maxOsig.value)
    const eeRate = r.employee.doo.value + r.employee.upf.value + r.employee.zo.value +
                   r.employee.ozm.value + r.employee.bezr.value
    const erRate = r.employer.doo.value + r.employer.upf.value + r.employer.zo.value +
                   r.employer.ozm.value + r.employer.tzpb.value + r.employer.bezr.value
    const empEe = cap * eeRate
    const empEr = cap * erRate
    const salaryNet = gross - empEe - (Math.max(gross - empEe, 0) * r.personalIncomeTax.value)
    const salaryEmployerCost = gross + empEr
    const salaryEmployeeCost = empEe + (Math.max(gross - empEe, 0) * r.personalIncomeTax.value)

    const diff = dividendNet - salaryNet
    const recommendation: DividendResult['recommendation'] =
      Math.abs(diff) < 200 ? 'equal' : diff > 0 ? 'dividend' : 'salary'

    return {
      corporateTax,
      profitAfterTax,
      dividendGross,
      dividendTax,
      dividendNet,
      salaryNet,
      salaryEmployerCost,
      salaryEmployeeCost,
      diff,
      recommendation,
      breakdown: [
        { label: 'Прибыль ООД до налогов', amount: input.annualProfit },
        { label: 'Корпоративен данък 10%', amount: -corporateTax, note: 'ЗКПО чл. 20' },
        { label: 'Чиста печалба', amount: profitAfterTax },
        { label: `Дял на собственика (${input.ownerSharePct}%)`, amount: dividendGross },
        { label: 'Данък дивиденти 5%', amount: -dividendTax, note: 'ЗДДФЛ чл. 38 ал. 2' },
        { label: 'ДИВИДЕНТ НА РЪКА', amount: dividendNet },
        { separator: true, label: '', amount: 0 },
        { label: 'Заплата брутто (для сравнения)', amount: gross },
        { label: `Осигуровки работник (${(eeRate * 100).toFixed(2)}%)`, amount: -empEe },
        { label: 'ДДФЛ 10%', amount: -(Math.max(gross - empEe, 0) * r.personalIncomeTax.value) },
        { label: 'ЗАПЛАТА НА РЪКА', amount: salaryNet },
      ],
    }
  }, [input])
}
