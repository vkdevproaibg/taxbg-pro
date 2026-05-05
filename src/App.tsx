import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
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
import Login from './pages/Login'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import UpdatePassword from './pages/UpdatePassword'
import AuthCallback from './pages/AuthCallback'
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
import AuditHelp from './pages/AuditHelp'
import Vault from './pages/Vault'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import AIDisclosure from './pages/AIDisclosure'
import { useUserStore } from './store/userStore'
import { useAccountingStore } from './store/accountingStore'
import { useCompaniesStore } from './store/companiesStore'
import { useNotificationsStore } from './store/notificationsStore'
import { ensureCapitalEntry } from './lib/journalAI'
import { initAnalytics, trackPageView } from './lib/analytics'
import { runHealthCheck } from './lib/healthCheck'

// ---------------------------------------------------------------------------
// Protected route — redirects to /login when not authenticated
// ---------------------------------------------------------------------------
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => !!s.user)
  const isLoading       = useAuthStore((s) => s.isLoading)
  const isDemo          = useAuthStore((s) => s.isDemo)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--surface)' }}>
        <div className="text-center space-y-3">
          <p className="text-2xl">🌿</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>TaxBG Pro загружается…</p>
        </div>
      </div>
    )
  }
  // Allow demo mode (Supabase not configured) to pass through
  if (!isDemo && !isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  const { initialize, isLoading, isDemo } = useAuthStore()
  const onboardingDone = useUserStore((s) => s.onboardingDone)
  const companies      = useCompaniesStore((s) => s.companies)
  const isSynced       = useCompaniesStore((s) => s.isSynced)
  const activeCompanyId = useCompaniesStore((s) => s.activeCompanyId)
  const transactionsCount = useAccountingStore((s) => s.transactions.length)

  const [healthBanner, setHealthBanner] = useState<string | null>(null)
  const location = useLocation()

  useEffect(() => {
    initialize().then(() => {
      // Non-blocking health check after auth is ready
      runHealthCheck().then(hc => {
        const problems: string[] = []
        if (!hc.localStorageAvailable) problems.push('localStorage unavailable')
        if (!hc.browserSupported) problems.push('Browser not fully supported')
        if (problems.length > 0) setHealthBanner(problems.join('; '))
      }).catch(() => { /* non-fatal */ })
    })
    runMigration()
    initAnalytics()
    useAccountingStore.getState().backfillJournalEntries()
    if (useCompaniesStore.getState().companies.length > 0) {
      ensureCapitalEntry()
    }
  }, [])

  // Track page views on route changes
  useEffect(() => {
    trackPageView(location.pathname)
  }, [location.pathname])

  // Refresh notifications whenever relevant state settles (auth, active company, transactions)
  useEffect(() => {
    if (isLoading) return
    useNotificationsStore.getState().refreshNotifications()
  }, [isLoading, isDemo, activeCompanyId, transactionsCount])

  // Periodic refresh every 6 hours for long-lived tabs
  useEffect(() => {
    const interval = setInterval(() => {
      useNotificationsStore.getState().refreshNotifications()
    }, 6 * 60 * 60 * 1000)
    return () => clearInterval(interval)
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
    <>
      {healthBanner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
          padding: '8px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600,
          background: '#fef3c7', color: '#92400e', borderBottom: '1px solid #f59e0b',
        }}>
          {healthBanner}
          <button
            onClick={() => setHealthBanner(null)}
            style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontWeight: 700 }}
          >
            &times;
          </button>
        </div>
      )}
    <Routes>
      {/* Public routes */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/ai-disclosure" element={<AIDisclosure />} />
      {/* Protected routes */}
      <Route path="/*" element={
        <ProtectedRoute>
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
        <Route path="/audit-help"  element={<AuditHelp />} />
            <Route path="/vault"       element={<Vault />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <TourOverlay />
        </Layout>
        </ProtectedRoute>
      } />
    </Routes>
    </>
  )
}

export default App
