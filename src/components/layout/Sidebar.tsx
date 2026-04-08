import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ShieldCheck,
  BookOpen, Store, Calculator, FileText,
  Wallet, Users,
  CalendarDays,
  Scale, Bot,
  Settings,
} from 'lucide-react'
import { useT } from '../../lib/i18n'

type NavItem = {
  to: string
  icon: React.ElementType
  key: string
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Главное',
    items: [
      { to: '/',        icon: LayoutDashboard, key: 'nav_dashboard' },
      { to: '/auditor', icon: ShieldCheck,     key: 'nav_auditor'   },
    ],
  },
  {
    label: 'Налоги и финансы',
    items: [
      { to: '/accounting', icon: BookOpen,   key: 'nav_accounting' },
      { to: '/platforms',  icon: Store,      key: 'nav_platforms'  },
      { to: '/calculator', icon: Calculator, key: 'nav_calculator' },
      { to: '/reports',    icon: FileText,   key: 'nav_reports'    },
    ],
  },
  {
    label: 'Сотрудники',
    items: [
      { to: '/salary',    icon: Wallet, key: 'nav_salary'    },
      { to: '/employees', icon: Users,  key: 'nav_employees' },
    ],
  },
  {
    label: 'Сроки и контроль',
    items: [
      { to: '/calendar', icon: CalendarDays, key: 'nav_calendar' },
    ],
  },
  {
    label: 'Знания',
    items: [
      { to: '/legal',     icon: Scale, key: 'nav_legal'     },
      { to: '/assistant', icon: Bot,   key: 'nav_assistant' },
    ],
  },
  {
    label: 'Система',
    items: [
      { to: '/settings', icon: Settings, key: 'nav_settings' },
    ],
  },
]

export default function Sidebar() {
  const t = useT()

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-[--border] bg-[--surface-card] sticky top-0 overflow-hidden">

      {/* Logo */}
      <div className="px-4 py-5 border-b border-[--border] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-bold shadow-sm"
            style={{ backgroundColor: 'var(--accent)' }}>
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
        <div className="mt-3 h-1 rounded-full bg-flag-stripe opacity-80" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}>
              {group.label}
            </p>

            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, key }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive ? 'font-medium' : ''
                    }`
                  }
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                    color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={15}
                        style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}
                      />
                      <span className="truncate text-xs">
                        {t(key as Parameters<typeof t>[0])}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-[--border] shrink-0">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>🇧🇬 България · 2026</p>
      </div>

    </aside>
  )
}
