import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import { useAuth } from './hooks/useAuth'
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
import { useUserStore } from './store/userStore'

function App() {
  const { user, loading } = useAuth()
  const onboardingDone = useUserStore((s) => s.onboardingDone)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400">Загрузка...</div>
      </div>
    )
  }

  if (!user) return <Auth />
  if (!onboardingDone) return <Onboarding />

  return (
    <Layout>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
