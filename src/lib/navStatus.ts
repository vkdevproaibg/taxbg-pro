// src/lib/navStatus.ts
// Computes traffic-light status for each nav item.
// Derived entirely from store data — never stored separately.
// Recalculates on every render via Zustand selectors.

import { useAccountingStore } from '../store/accountingStore'
import { useJournalStore }    from '../store/journalStore'
import { useEmployeesStore }  from '../store/employeesStore'
import { useCompaniesStore }  from '../store/companiesStore'
import { useAuthStore }       from '../store/authStore'
import { useLegislationStore } from '../store/legislationStore'
import { buildBalanceSheet }  from './financialReports'

export type NavStatus = 'green' | 'yellow' | 'red' | 'none'

export interface NavStatusMap {
  dashboard:   NavStatus
  accounting:  NavStatus
  reports:     NavStatus
  calendar:    NavStatus
  employees:   NavStatus
  salary:      NavStatus
  auditor:     NavStatus
  companies:   NavStatus
  'audit-help': NavStatus
  superadmin:  NavStatus
}

/** Returns red if overdue, yellow if within warningDays, green otherwise. */
function deadlineStatus(deadlineDate: string, warningDays = 7): NavStatus {
  const diffDays = Math.floor(
    (new Date(deadlineDate).getTime() - Date.now()) / 86_400_000
  )
  if (diffDays < 0)            return 'red'
  if (diffDays <= warningDays) return 'yellow'
  return 'green'
}

export function useNavStatus(): NavStatusMap {
  const transactions = useAccountingStore(s => s.transactions)
  const entries      = useJournalStore(s => s.entries)
  const employees    = useEmployeesStore(s => s.employees)
  const company      = useCompaniesStore(s => s.getActive())
  const isSuperAdmin = useAuthStore(s => s.isSuperAdmin())
  const pendingAlerts = useLegislationStore(s =>
    s.alerts.filter(a => a.status === 'pending')
  )

  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1  // 1-12
  const mm    = String(month).padStart(2, '0')
  const today = now.toISOString().split('T')[0]

  // ── Companies ────────────────────────────────────────────
  const companiesStatus: NavStatus =
    !company       ? 'yellow' :
    !company.eik   ? 'yellow' : 'green'

  // ── Accounting ───────────────────────────────────────────
  const hasTransactions = transactions.length > 0
  const hasJournal      = entries.length > 0

  let balanceOk = true   // optimistic when no data
  if (hasJournal && company) {
    try {
      balanceOk = buildBalanceSheet(entries, today, company.name).isBalanced
    } catch {
      balanceOk = false
    }
  }

  const accountingStatus: NavStatus =
    !hasTransactions          ? 'yellow' :
    hasJournal && !balanceOk  ? 'red'    : 'green'

  // ── Reports / ДДС ────────────────────────────────────────
  // ДДС: declared by the 14th of next month
  // ЗКПО: by 30 June of next year — only warn if close
  let reportsStatus: NavStatus = 'green'

  if (company?.hasVat && hasTransactions) {
    const nextMM = month === 12
      ? `${year + 1}-01`
      : `${year}-${String(month + 1).padStart(2, '0')}`

    const ddsDeadline = `${nextMM}-14`

    const hasVatThisMonth = transactions.some(
      t => t.type === 'vat_out' && t.date.startsWith(`${year}-${mm}`)
    )

    if (hasVatThisMonth) {
      reportsStatus = deadlineStatus(ddsDeadline, 5)
    }
  }

  // ── Calendar / Deadlines ─────────────────────────────────
  // Осигуровки: due by 25th of each month
  const osigDeadline = `${year}-${mm}-25`
  const calendarStatus: NavStatus = deadlineStatus(osigDeadline, 5)

  // ── Employees ────────────────────────────────────────────
  const activeEmployees = employees.filter(e => e.active)
  const employeesStatus: NavStatus =
    activeEmployees.length === 0 ? 'yellow' : 'green'

  // ── Salary ───────────────────────────────────────────────
  const salaryPaidThisMonth = transactions.some(
    t => t.type === 'salary' && t.date.startsWith(`${year}-${mm}`)
  )
  const salaryStatus: NavStatus =
    activeEmployees.length === 0 ? 'none'   :
    !salaryPaidThisMonth         ? 'yellow' : 'green'

  // ── Auditor ──────────────────────────────────────────────
  const auditorStatus: NavStatus =
    hasJournal && !balanceOk    ? 'red'    :
    calendarStatus === 'red'    ? 'red'    :
    calendarStatus === 'yellow' ? 'yellow' : 'green'

  // ── Audit Help ───────────────────────────────────────────
  // Informational page — no action required
  const auditHelpStatus: NavStatus = 'none'

  // ── SuperAdmin ───────────────────────────────────────────
  const superadminStatus: NavStatus = isSuperAdmin
    ? (pendingAlerts.length > 0 ? 'yellow' : 'green')
    : 'none'

  // ── Dashboard — worst of all sections ───────────────────
  const allStatuses: NavStatus[] = [
    accountingStatus, reportsStatus, calendarStatus, auditorStatus,
    ...(isSuperAdmin ? [superadminStatus] : []),
  ]
  const dashboardStatus: NavStatus =
    allStatuses.includes('red')    ? 'red'    :
    allStatuses.includes('yellow') ? 'yellow' : 'green'

  return {
    dashboard:   dashboardStatus,
    accounting:  accountingStatus,
    reports:     reportsStatus,
    calendar:    calendarStatus,
    employees:   employeesStatus,
    salary:      salaryStatus,
    auditor:     auditorStatus,
    companies:   companiesStatus,
    'audit-help': auditHelpStatus,
    superadmin:  superadminStatus,
  }
}
