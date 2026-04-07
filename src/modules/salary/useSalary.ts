import { useMemo } from 'react'
import { TAX_RATES_2026 } from '../../constants/tax-rates-2026'

export interface SalaryResult {
  gross: number
  employeeContrib: number
  employerContrib: number
  taxBase: number
  incomeTax: number
  net: number
  totalCost: number
  breakdown: { label: string; amount: number; rate?: string; source?: string }[]
}

export function useSalary(gross: number): SalaryResult {
  return useMemo(() => {
    const r = TAX_RATES_2026
    const cap = Math.min(gross, r.maxOsig.value)

    const empEe =
      (r.employee.doo.value + r.employee.upf.value + r.employee.zo.value + r.employee.ozm.value + r.employee.bezr.value) *
      cap
    const empEr =
      (r.employer.doo.value + r.employer.upf.value + r.employer.zo.value + r.employer.ozm.value + r.employer.tzpb.value + r.employer.bezr.value) *
      cap

    const taxBase = Math.max(gross - empEe, 0)
    const incomeTax = taxBase * r.personalIncomeTax.value
    const net = gross - empEe - incomeTax
    const totalCost = gross + empEr

    const eeRate =
      (r.employee.doo.value + r.employee.upf.value + r.employee.zo.value + r.employee.ozm.value + r.employee.bezr.value) * 100
    const erRate =
      (r.employer.doo.value + r.employer.upf.value + r.employer.zo.value + r.employer.ozm.value + r.employer.tzpb.value + r.employer.bezr.value) * 100

    return {
      gross,
      employeeContrib: empEe,
      employerContrib: empEr,
      taxBase,
      incomeTax,
      net,
      totalCost,
      breakdown: [
        { label: 'Брутна заплата', amount: gross },
        { label: 'Осигуровки работник', amount: -empEe, rate: `${eeRate.toFixed(2)}%`, source: 'КСО+ЗЗО' },
        { label: 'ДДФЛ 10%', amount: -incomeTax, rate: '10%', source: 'ЗДДФЛ чл. 48' },
        { label: 'Нетна заплата', amount: net },
        { label: '─────────────────', amount: 0 },
        { label: 'Осигуровки работодател', amount: -empEr, rate: `${erRate.toFixed(2)}%`, source: 'КСО+ЗЗО' },
        { label: 'Общ разход работодател', amount: totalCost },
      ],
    }
  }, [gross])
}
