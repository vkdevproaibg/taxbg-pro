export interface DDSFormData {
  period: string
  companyName: string
  eik: string
  vatNumber: string
  salesBase20: number
  vatOut20: number
  salesBase9: number
  vatOut9: number
  salesBase0: number
  purchasesBase20: number
  vatIn20: number
  purchasesBase9: number
  vatIn9: number
  vatPayable: number
  vatRefund: number
}

export interface ZKPOFormData {
  year: number
  companyName: string
  eik: string
  totalRevenue: number
  totalExpenses: number
  accountingProfit: number
  nonDeductibleExpenses: number
  taxableProfit: number
  corporateTax: number
  advancePaid: number
  taxDue: number
  overpaid?: number
}
