import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import { useAuth } from './hooks/useAuth'
import { isSupabaseConfigured } from './lib/supabase'
import Accounting from './pages/Accounting'
import Assistant from './pages/Assistant'
import Auth from './pages/Auth'
import Calculator from './pages/Calculator'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Platforms from './pages/Platforms'
import Reports from './pages/Reports'
import Salary from './pages/Salary'
import Settings from './pages/Settings'
import Onboarding from './modules/onboarding'
import { useUserStore } from './store/userStore'

function App() {
  const { user, loading } = useAuth()
  const onboardingDone = useUserStore((s) => s.onboardingDone)

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          <h1 className="mb-2 text-base font-semibold">Supabase не настроен</h1>
          <p className="mb-3">Добавьте переменные в файл .env в корне проекта и перезапустите dev-сервер.</p>
          <pre className="overflow-x-auto rounded-lg bg-white/70 p-3 text-xs text-amber-900">VITE_SUPABASE_URL=https://xxx.supabase.co{`\n`}VITE_SUPABASE_ANON_KEY=eyJ...</pre>
        </div>
      </div>
    )
  }

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
