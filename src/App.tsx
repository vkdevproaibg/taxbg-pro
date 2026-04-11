import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { runMigration } from './lib/migration'
import PracticalLearning from './pages/PracticalLearning'
import TourOverlay from './components/tour/TourOverlay'
import Companies from './pages/Companies'
import Expat      from './pages/Expat'
import StartupVisa from './pages/StartupVisa'
import Learning    from './pages/Learning'
import Testing    from './pages/Testing'
import AuditEntry      from './pages/AuditEntry'
import LifecycleEvents from './pages/LifecycleEvents'
import Layout from './components/layout/Layout'
import DemoBanner from './components/layout/DemoBanner'
import { useAuthStore } from './store/authStore'
import Accounting from './pages/Accounting'
import Assistant from './pages/Assistant'
import Auditor from './pages/Auditor'
import Auth from './pages/Auth'
import Calculator from './pages/Calculator'
import Calendar from './pages/Calendar'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import LegalReference from './pages/LegalReference'
import Platforms from './pages/Platforms'
import Reports from './pages/Reports'
import Salary from './pages/Salary'
import Settings from './pages/Settings'
import Onboarding from './modules/onboarding'
import SuperAdmin from './pages/SuperAdmin'
import { useUserStore } from './store/userStore'
import { useAccountingStore } from './store/accountingStore'
import { useCompaniesStore } from './store/companiesStore'
import { ensureCapitalEntry } from './lib/journalAI'

function App() {
  const { initialize, isLoading, isDemo } = useAuthStore()
  const onboardingDone = useUserStore((s) => s.onboardingDone)
  const companies      = useCompaniesStore((s) => s.companies)
  const isSynced       = useCompaniesStore((s) => s.isSynced)

  useEffect(() => {
    initialize()
    runMigration()
    useAccountingStore.getState().backfillJournalEntries()
    if (useCompaniesStore.getState().companies.length > 0) {
      ensureCapitalEntry()
    }
  }, [])

  // Handle Stripe return after successful payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe') === 'success') {
      // Reload profile so subscription = 'pro' is picked up
      useAuthStore.getState().fetchProfile()
      // Clean the URL — no reload needed
      const clean = window.location.pathname
      window.history.replaceState({}, '', clean)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--surface)' }}>
        <div className="text-center space-y-3">
          <p className="text-2xl">🌿</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            TaxBG Pro загружается...
          </p>
        </div>
      </div>
    )
  }

  // Show onboarding only when:
  // 1. Authenticated (not demo)
  // 2. onboarding not marked done in localStorage
  // 3. Supabase sync is complete but no companies found
  //    (isSynced guard prevents flash during initial load)
  const needsOnboarding =
    !isDemo &&
    !onboardingDone &&
    isSynced &&
    companies.length === 0

  if (needsOnboarding) return <Onboarding />

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/*" element={
        <Layout>
          <DemoBanner />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/auditor" element={<Auditor />} />
            <Route path="/legal" element={<LegalReference />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/salary" element={<Salary />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/accounting" element={<Accounting />} />
            <Route path="/platforms" element={<Platforms />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/learning"     element={<Learning />} />
            <Route path="/testing"     element={<Testing />} />
            <Route path="/audit-entry" element={<AuditEntry />} />
            <Route path="/lifecycle"   element={<LifecycleEvents />} />
            <Route path="/startup-visa" element={<StartupVisa />} />
            <Route path="/expat"       element={<Expat />} />
            <Route path="/tours"       element={<PracticalLearning />} />
            <Route path="/superadmin"  element={<SuperAdmin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <TourOverlay />
        </Layout>
      } />
    </Routes>
  )
}

export default App
