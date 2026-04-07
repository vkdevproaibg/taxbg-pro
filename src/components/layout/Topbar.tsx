import { useAuth } from '../../hooks/useAuth'

export default function Topbar() {
  const { user, signOut } = useAuth()

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <p className="text-sm text-slate-400">TaxBG Pro · 2026</p>
      {user && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{user.email}</span>
          <button
            onClick={signOut}
            className="text-xs text-slate-400 underline hover:text-slate-600"
          >
            Выйти
          </button>
        </div>
      )}
    </header>
  )
}
