import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ShieldCheck, Building2,
  BookOpen, Store, Calculator, FileText,
  Wallet, Users,
  CalendarDays,
  Scale, Bot, Layers, Shield, Archive,
  Eye, BarChart3, X,
} from 'lucide-react'
import { useT } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/useT'
import CompanySwitcher from '../../modules/companies/CompanySwitcher'
import { useNavStatus } from '../../lib/navStatus'
import NavStatusDot from '../ui/NavStatusDot'
import type { NavStatus } from '../../lib/navStatus'
import { useUserStore } from '../../store/userStore'
import { useCompaniesStore } from '../../store/companiesStore'
import { useSidebarStore } from '../../store/sidebarStore'

type NavItem = {
  to: string
  icon: React.ElementType
  key: string
}

type NavGroup = {
  labelKey: TranslationKey
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'group_main',
    items: [
      { to: '/',          icon: LayoutDashboard, key: 'nav_dashboard'  },
      { to: '/auditor',   icon: ShieldCheck,     key: 'nav_auditor'   },
      { to: '/companies', icon: Building2,       key: 'nav_companies' },
    ],
  },
  {
    labelKey: 'group_taxes',
    items: [
      { to: '/accounting', icon: BookOpen,   key: 'nav_accounting' },
      { to: '/platforms',  icon: Store,      key: 'nav_platforms'  },
      { to: '/calculator', icon: Calculator, key: 'nav_calculator' },
      { to: '/reports',    icon: FileText,   key: 'nav_reports'    },
      { to: '/vault',      icon: Archive,    key: 'nav_vault'      },
    ],
  },
  {
    labelKey: 'group_employees',
    items: [
      { to: '/salary',    icon: Wallet, key: 'nav_salary'    },
      { to: '/employees', icon: Users,  key: 'nav_employees' },
    ],
  },
  {
    labelKey: 'group_deadlines',
    items: [
      { to: '/calendar', icon: CalendarDays, key: 'nav_calendar' },
    ],
  },
  {
    labelKey: 'group_knowledge',
    items: [
      { to: '/legal',      icon: Scale,  key: 'nav_legal'      },
      { to: '/audit-help', icon: Shield, key: 'nav_audit_help' },
      { to: '/assistant',  icon: Bot,    key: 'nav_assistant'  },
      { to: '/lifecycle',  icon: Layers, key: 'nav_lifecycle'  },
    ],
  },
]

const OWNER_VISIBLE_ROUTES: ReadonlySet<string> = new Set([
  '/',
  '/companies',
  '/vault',
  '/calculator',
  '/calendar',
  '/audit-help',
  '/settings',
])

const STATUS_KEYS: Record<string, keyof ReturnType<typeof useNavStatus>> = {
  nav_dashboard:  'dashboard',
  nav_accounting: 'accounting',
  nav_reports:    'reports',
  nav_calendar:   'calendar',
  nav_employees:  'employees',
  nav_salary:     'salary',
  nav_auditor:    'auditor',
  nav_companies:  'companies',
  nav_audit_help: 'audit-help',
}

const TOGGLE_LABELS = {
  toOwner: {
    ru: 'Режим собственника ↔',
    en: 'Owner mode ↔',
    bg: 'Режим собственик ↔',
    uk: 'Режим власника ↔',
  },
  toAccountant: {
    ru: 'Режим бухгалтера ↔',
    en: 'Accountant mode ↔',
    bg: 'Режим счетоводител ↔',
    uk: 'Режим бухгалтера ↔',
  },
} as const

export default function Sidebar() {
  const t            = useT()
  const navStatus    = useNavStatus()
  const viewMode     = useUserStore((s) => s.viewMode)
  const setViewMode  = useUserStore((s) => s.setViewMode)
  const language     = useUserStore((s) => s.language)
  const companiesCount = useCompaniesStore((s) => s.companies.length)
  const { isOpen, close } = useSidebarStore()
  const location = useLocation()

  // Close drawer on navigation (mobile)
  useEffect(() => { close() }, [location.pathname, close])

  const isOwner = viewMode === 'owner'

  const groups = NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!isOwner) return true
        if (item.to === '/companies' && companiesCount <= 1) return false
        return OWNER_VISIBLE_ROUTES.has(item.to)
      }),
    }))
    .filter((group) => group.items.length > 0)

  const toggleLabel = isOwner
    ? (TOGGLE_LABELS.toAccountant[language] ?? TOGGLE_LABELS.toAccountant.ru)
    : (TOGGLE_LABELS.toOwner[language] ?? TOGGLE_LABELS.toOwner.ru)

  return (
    <aside
      className={[
        // Mobile: fixed drawer sliding from left
        'fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden',
        'transition-transform duration-300 ease-in-out',
        // Desktop: static sidebar in flex row
        'md:relative md:inset-auto md:z-auto md:w-56 md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
      style={{ backgroundColor: 'var(--surface-sidebar)' }}
    >
      {/* Mobile drawer header with close button */}
      <div
        className="flex shrink-0 items-center justify-between px-4 py-3 md:hidden"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            🌹
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            TaxBG{' '}
            <span style={{ color: 'var(--accent)' }}>Pro</span>
          </span>
        </div>
        <button
          onClick={close}
          className="rounded-lg p-2 transition-colors hover:bg-[--surface]"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Закрыть меню"
        >
          <X size={18} />
        </button>
      </div>

      <CompanySwitcher />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-2 py-3 space-y-4">
        {groups.map((group) => (
          <div key={group.labelKey}>
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}>
              {t(group.labelKey)}
            </p>

            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, key }) => {
                const statusKey = STATUS_KEYS[key]
                const status: NavStatus = statusKey
                  ? navStatus[statusKey]
                  : 'none'

                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2.5 md:py-2 text-sm transition-colors ${
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
                        <span className="truncate text-xs flex-1">
                          {t(key as Parameters<typeof t>[0])}
                        </span>
                        <NavStatusDot status={status} />
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* View mode toggle */}
      <div className="border-t px-2 py-2" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setViewMode(isOwner ? 'accountant' : 'owner')}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 md:py-2 text-xs transition-colors hover:bg-[--surface]"
          style={{ color: 'var(--text-secondary)' }}
          title={toggleLabel}
        >
          {isOwner ? <Eye size={14} /> : <BarChart3 size={14} />}
          <span className="truncate">{toggleLabel}</span>
        </button>
      </div>
    </aside>
  )
}
