import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Calculator, Wallet, Users, BookOpen, Store, FileText, Bot, Settings } from 'lucide-react'
import { useT } from '../../lib/i18n'

const NAV_ITEMS = [
  { to: '/',           icon: LayoutDashboard, key: 'nav_dashboard' },
  { to: '/calculator', icon: Calculator,      key: 'nav_calculator' },
  { to: '/salary',     icon: Wallet,          key: 'nav_salary' },
  { to: '/employees',  icon: Users,           key: 'nav_employees' },
  { to: '/accounting', icon: BookOpen,        key: 'nav_accounting' },
  { to: '/platforms',  icon: Store,           key: 'nav_platforms' },
  { to: '/reports',    icon: FileText,        key: 'nav_reports' },
  { to: '/assistant',  icon: Bot,             key: 'nav_assistant' },
  { to: '/settings',   icon: Settings,        key: 'nav_settings' },
] as const

export default function Sidebar() {
  const t = useT()

  return (
    <aside className="flex h-full w-56 flex-col border-r border-slate-100 bg-white px-3 py-4">
      <div className="mb-6 px-3">
        <span className="text-lg font-bold text-violet-600">TaxBG</span>
        <span className="ml-1 text-xs font-medium text-slate-400">Pro</span>
      </div>
      <nav className="flex-1 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-violet-50 font-medium text-violet-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Icon size={16} />
            {t(key as never)}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
