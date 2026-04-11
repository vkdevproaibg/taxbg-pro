import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useUserStore } from '../../store/userStore'
import NotificationBell from '../ui/NotificationBell'

function UserMenu() {
  const { user, profile, isDemo, signOut } = useAuthStore()
  const navigate = useNavigate()

  if (isDemo) {
    return (
      <button
        onClick={() => navigate('/auth')}
        className="rounded-lg px-3 py-1.5 text-xs font-medium"
        style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
        Войти
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="text-right hidden sm:block">
        <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          {profile?.full_name ?? user?.email}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {profile?.role === 'superadmin' ? '⚡ Супер-админ'
           : profile?.role === 'superuser' ? '⭐ Супер-юзер'
           : profile?.role === 'accountant' ? '📊 Бухгалтер'
           : profile?.role === 'director' ? '🏢 Директор'
           : profile?.subscription === 'pro' ? '💎 Pro'
           : '🔓 Free'}
        </p>
      </div>
      <button
        onClick={signOut}
        className="rounded-lg border border-[--border] px-3 py-1.5 text-xs text-[--text-secondary] hover:bg-[--surface] transition-colors"
      >
        Выйти
      </button>
    </div>
  )
}

export default function Topbar() {
  const companyName = useUserStore((s) => s.companyName)

  return (
    <header className="sticky top-0 z-20 border-b border-[--border] bg-[--surface-card]/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              🌹
            </div>
            <div>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                TaxBG
              </span>
              <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                {' '}Pro
              </span>
            </div>
          </div>

          {companyName && (
            <span className="ml-2 border-l border-[--border] pl-3 text-sm font-medium text-[--text-primary]">
              {companyName}
            </span>
          )}
        </div>

        {/* Right side: notifications + user menu */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
