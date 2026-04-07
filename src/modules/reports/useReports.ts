import { useMemo, useState } from 'react'
import { format, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { useAccountingStore } from '../../store/accountingStore'
import { useUserStore } from '../../store/userStore'
import { TAX_RATES_2026 } from '../../constants/tax-rates-2026'
import { DEADLINES_2026 } from '../../constants/deadlines'
import type { DDSFormData, ZKPOFormData } from './types'

export function useReports() {
  const store         = useAccountingStore()
  const { companyName, legalForm } = useUserStore()

  const [eik, setEik]                     = useState('')
  const [vatNumber, setVatNumber]         = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [selectedYear, setSelectedYear]   = useState(() => new Date().getFullYear())

  const monthFrom = selectedMonth + '-01'
  const monthTo   = format(endOfMonth(new Date(monthFrom)), 'yyyy-MM-dd')
  const yearFrom  = format(startOfYear(new Date(selectedYear, 0)), 'yyyy-MM-dd')
  const yearTo    = format(endOfYear(new Date(selectedYear, 0)),   'yyyy-MM-dd')

  const ddsData = useMemo((): DDSFormData => {
    const txs = store.getByPeriod(monthFrom, monthTo)

    const vatOut20        = txs.filter(t => t.type === 'vat_out' && t.vatRate === 0.20).reduce((s, t) => s + (t.vatAmount ?? 0), 0)
    const salesBase20     = txs.filter(t => t.type === 'vat_out' && t.vatRate === 0.20).reduce((s, t) => s + t.amount, 0)
    const vatOut9         = txs.filter(t => t.type === 'vat_out' && t.vatRate === 0.09).reduce((s, t) => s + (t.vatAmount ?? 0), 0)
    const salesBase9      = txs.filter(t => t.type === 'vat_out' && t.vatRate === 0.09).reduce((s, t) => s + t.amount, 0)
    const salesBase0      = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const vatIn20         = txs.filter(t => t.type === 'vat_in'  && t.vatRate === 0.20).reduce((s, t) => s + (t.vatAmount ?? 0), 0)
    const purchasesBase20 = txs.filter(t => t.type === 'vat_in'  && t.vatRate === 0.20).reduce((s, t) => s + t.amount, 0)
    const vatIn9          = txs.filter(t => t.type === 'vat_in'  && t.vatRate === 0.09).reduce((s, t) => s + (t.vatAmount ?? 0), 0)
    const purchasesBase9  = txs.filter(t => t.type === 'vat_in'  && t.vatRate === 0.09).reduce((s, t) => s + t.amount, 0)

    const vatResult = (vatOut20 + vatOut9) - (vatIn20 + vatIn9)

    return {
      period: selectedMonth,
      companyName,
      eik,
      vatNumber: vatNumber || ('BG' + eik),
      salesBase20, vatOut20,
      salesBase9,  vatOut9,
      salesBase0,
      purchasesBase20, vatIn20,
      purchasesBase9,  vatIn9,
      vatPayable: Math.max(vatResult, 0),
      vatRefund:  Math.max(-vatResult, 0),
    }
  }, [store, monthFrom, monthTo, selectedMonth, companyName, eik, vatNumber])

  const zkpoData = useMemo((): ZKPOFormData => {
    const totalRevenue      = store.getTotalIncome(yearFrom, yearTo)
    const totalExpenses     = store.getTotalExpenses(yearFrom, yearTo)
    const accountingProfit  = totalRevenue - totalExpenses
    const nonDeductible     = 0
    const taxableProfit     = Math.max(accountingProfit + nonDeductible, 0)
    const corporateTax      = taxableProfit * TAX_RATES_2026.corporateTax.value

    return {
      year: selectedYear,
      companyName,
      eik,
      totalRevenue,
      totalExpenses,
      accountingProfit,
      nonDeductibleExpenses: nonDeductible,
      taxableProfit,
      corporateTax,
      advancePaid: 0,
      taxDue: corporateTax,
    }
  }, [store, yearFrom, yearTo, selectedYear, companyName, eik])

  return {
    eik, setEik,
    vatNumber, setVatNumber,
    selectedMonth, setSelectedMonth,
    selectedYear, setSelectedYear,
    ddsData,
    zkpoData,
    deadlines: DEADLINES_2026.filter(d => d.forms.includes(legalForm)),
    legalForm,
  }
}
