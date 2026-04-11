import { useUserStore } from '../store/userStore'
import { useAccountingStore } from '../store/accountingStore'
import { useCompaniesStore } from '../store/companiesStore'

export interface DataReadiness {
  isReady: boolean           // все данные введены
  hasCompany: boolean        // есть название компании
  hasEik: boolean            // есть ЕИК
  hasTransactions: boolean   // есть хотя бы одна транзакция
  missingSteps: string[]     // что нужно заполнить
}

export function useDataReadiness(): DataReadiness {
  const { companyName, eik } = useUserStore()
  const transactions = useAccountingStore((s) => s.transactions)
  const { companies, getActive } = useCompaniesStore()

  // Prefer active company data over userStore fallback
  const activeCompany = getActive()
  const effectiveName = activeCompany?.name || companyName
  const effectiveEik  = activeCompany?.eik  || eik

  const hasCompany      = effectiveName.trim().length > 0
  const hasEik          = effectiveEik.trim().length >= 9
  const hasTransactions = transactions.length > 0

  // suppress unused variable warning — companies is used for context
  void companies

  const missingSteps: string[] = []
  if (!hasCompany)      missingSteps.push('Введите название компании в Настройки → Профил')
  if (!hasEik)          missingSteps.push('Введите ЕИК / Булстат в Настройки → Профил')
  if (!hasTransactions) missingSteps.push('Добавьте первую транзакцию в Бухгалтерия → Доходи')

  return {
    isReady: hasCompany && hasEik && hasTransactions,
    hasCompany,
    hasEik,
    hasTransactions,
    missingSteps,
  }
}
