import { useUserStore } from '../store/userStore'
import { useCompaniesStore } from '../store/companiesStore'
import { useAccountingStore } from '../store/accountingStore'
import { useJournalStore } from '../store/journalStore'
import { useEmployeesStore } from '../store/employeesStore'

export function runMigration(): void {
  const userStore      = useUserStore.getState()
  const companiesStore = useCompaniesStore.getState()
  const accounting     = useAccountingStore.getState()
  const journal        = useJournalStore.getState()
  const employees      = useEmployeesStore.getState()

  // Already migrated — skip
  if (companiesStore.migrated) return

  // Create first company from existing userStore data
  const companyId = companiesStore.addCompany({
    name:         userStore.companyName || 'Моя компания',
    eik:          userStore.eik         || '',
    legalForm:    userStore.legalForm,
    hasVat:       userStore.hasVat,
    hasEmployees: userStore.hasEmployees,
    country:      'BG',
    currency:     'EUR',
    taxResidency: 'BG',
    isOffshore:   false,
    notes:        '',
    color:        '#00966E',
  })

  companiesStore.setActive(companyId)

  // Tag all existing transactions with companyId
  const taggedTransactions = accounting.transactions.map((t) => ({
    ...t,
    companyId,
  }))
  useAccountingStore.setState({ transactions: taggedTransactions })

  // Tag journal entries
  const taggedEntries = journal.entries.map((e) => ({
    ...e,
    companyId,
  }))
  useJournalStore.setState({ entries: taggedEntries })

  // Tag employees
  const taggedEmployees = employees.employees.map((e) => ({
    ...e,
    companyId,
  }))
  useEmployeesStore.setState({ employees: taggedEmployees })

  companiesStore.setMigrated()
}
