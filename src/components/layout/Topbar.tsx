import { useNavigate } from 'react-router-dom'
import { Eye, Calculator as CalcIcon, Menu } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUserStore } from '../../store/userStore'
import { useSidebarStore } from '../../store/sidebarStore'
import NotificationBell from '../ui/NotificationBell'

const VIEW_MODE_LABELS = {
  owner: {
    ru: 'Собственник', en: 'Owner', bg: 'Собственик', uk: 'Власник',
  },
  accountant: {
    ru: 'Бухгалтер', en: 'Accountant', bg: 'Счетоводител', uk: 'Бухгалтер',
  },
} as const

function ViewModeIndicator() {
  const viewMode = useUserStore((s) => s.viewMode)
  const setViewMode = useUserStore((s) => s.setViewMode)
  const language = useUserStore((s) => s.language)
  const isOwner = viewMode === 'owner'
  const label = VIEW_MODE_LABELS[viewMode][language] ?? VIEW_MODE_LABELS[viewMode].ru
  const Icon = isOwner ? Eye : CalcIcon

  return (
    <button
      onClick={() => setViewMode(isOwner ? 'accountant' : 'owner')}
      className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[--surface]"
      style={{
        borderColor: 'var(--border)',
        color: isOwner ? 'var(--accent-text)' : 'var(--text-secondary)',
        backgroundColor: isOwner ? 'var(--accent-light)' : 'var(--surface)',
      }}
      title={label}
    >
      <Icon size={14} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

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
  const toggle = useSidebarStore((s) => s.toggle)

  return (
    <header className="sticky top-0 z-20 border-b border-[--border] bg-[--surface-card]/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <div className="flex items-center gap-2 md:gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={toggle}
            className="flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-[--surface] md:hidden"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Открыть меню"
          >
            <Menu size={20} />
          </button>

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
            <span className="ml-2 hidden sm:inline border-l border-[--border] pl-3 text-sm font-medium text-[--text-primary] truncate max-w-[140px]">
              {companyName}
            </span>
          )}
        </div>

        {/* Right side: view mode + notifications + user menu */}
        <div className="flex items-center gap-2">
          <ViewModeIndicator />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
