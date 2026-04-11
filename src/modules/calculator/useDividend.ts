import { useMemo } from 'react'
import { getRateValue } from '../../lib/taxRates'

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
    const rateDate = `${new Date().getFullYear()}-01-01`
    const share = input.ownerSharePct / 100

    const corporateTaxRate = getRateValue('corporateTax', rateDate)
    const dividendTaxRate  = getRateValue('dividendTax', rateDate)
    const maxOsig          = getRateValue('maxOsig', rateDate)
    const ddflRate         = getRateValue('personalIncomeTax', rateDate)

    const eeDoo  = getRateValue('employee.doo', rateDate)
    const eeUpf  = getRateValue('employee.upf', rateDate)
    const eeZo   = getRateValue('employee.zo', rateDate)
    const eeOzm  = getRateValue('employee.ozm', rateDate)
    const eeBezr = getRateValue('employee.bezr', rateDate)

    const erDoo  = getRateValue('employer.doo', rateDate)
    const erUpf  = getRateValue('employer.upf', rateDate)
    const erZo   = getRateValue('employer.zo', rateDate)
    const erOzm  = getRateValue('employer.ozm', rateDate)
    const erTzpb = getRateValue('employer.tzpb', rateDate)
    const erBezr = getRateValue('employer.bezr', rateDate)

    const corporateTax = Math.max(input.annualProfit, 0) * corporateTaxRate
    const profitAfterTax = Math.max(input.annualProfit - corporateTax, 0)
    const dividendGross = profitAfterTax * share
    const dividendTax = dividendGross * dividendTaxRate
    const dividendNet = dividendGross - dividendTax

    const gross = input.compareToSalary
    const cap = Math.min(gross, maxOsig)
    const eeRate = eeDoo + eeUpf + eeZo + eeOzm + eeBezr
    const erRate = erDoo + erUpf + erZo + erOzm + erTzpb + erBezr
    const empEe = cap * eeRate
    const empEr = cap * erRate
    const salaryNet = gross - empEe - (Math.max(gross - empEe, 0) * ddflRate)
    const salaryEmployerCost = gross + empEr
    const salaryEmployeeCost = empEe + (Math.max(gross - empEe, 0) * ddflRate)

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
        { label: 'ДДФЛ 10%', amount: -(Math.max(gross - empEe, 0) * ddflRate) },
        { label: 'ЗАПЛАТА НА РЪКА', amount: salaryNet },
      ],
    }
  }, [input])
}
