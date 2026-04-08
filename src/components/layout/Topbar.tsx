import { useAuth } from '../../hooks/useAuth'
import { useUserStore } from '../../store/userStore'

export default function Topbar() {
  const { user, signOut } = useAuth()
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

        {user && (
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-[--text-muted] sm:block">
              {user.email}
            </span>
            <button
              onClick={signOut}
              className="rounded-lg border border-[--border] px-3 py-1.5 text-xs text-[--text-secondary] hover:bg-[--surface] transition-colors"
            >
              Выйти
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
