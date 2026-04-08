import { useAuth } from '../../hooks/useAuth'
import { useUserStore } from '../../store/userStore'

export default function Topbar() {
  const { user, signOut } = useAuth()
  const companyName = useUserStore((s) => s.companyName)

  return (
    <header className="sticky top-0 z-10 border-b border-[--border] bg-[--surface-card]/95 backdrop-blur-sm">
      <div className="h-1 bg-flag-stripe" />

      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          {companyName && (
            <span className="text-sm font-medium text-[--text-primary]">
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
