import { useCompaniesStore } from '../store/companiesStore'
import { useAccountingStore } from '../store/accountingStore'
import { useEmployeesStore } from '../store/employeesStore'

/**
 * Returns true when the active company's data is fully loaded and ready.
 * Use this in pages that depend on per-company data to avoid showing stale
 * data from a previously selected company while the new company loads.
 */
export function useCompanyDataReady(): boolean {
  const activeId = useCompaniesStore((s) => s.activeCompanyId)
  const accSynced = useAccountingStore((s) => s.isSynced)
  const empSynced = useEmployeesStore((s) => s.isSynced)
  return Boolean(activeId && accSynced && empSynced)
}
