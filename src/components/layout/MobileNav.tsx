import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, CalendarDays,
  Calculator, Menu, Archive,
} from 'lucide-react'
import { useSidebarStore } from '../../store/sidebarStore'
import { useUserStore } from '../../store/userStore'

export default function MobileNav() {
  const toggle = useSidebarStore((s) => s.toggle)
  const viewMode = useUserStore((s) => s.viewMode)
  const isOwner = viewMode === 'owner'

  const tabs = [
    { to: '/',            icon: LayoutDashboard, label: 'Главная',    end: true },
    isOwner
      ? { to: '/vault',       icon: Archive,         label: 'Хранилище', end: false }
      : { to: '/accounting',  icon: BookOpen,        label: 'Учёт',      end: false },
    { to: '/calendar',    icon: CalendarDays,    label: 'Дедлайны',  end: false },
    { to: '/calculator',  icon: Calculator,      label: 'Расчёт',    end: false },
  ]

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 md:hidden border-t bg-[--surface-card]/95 backdrop-blur-md"
      style={{ borderColor: 'var(--border)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex h-14">
        {tabs.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex-1 flex flex-col items-center justify-center gap-[3px] text-[10px] font-medium transition-colors"
            style={({ isActive }) => ({
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.2 : 1.7}
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={toggle}
          className="flex-1 flex flex-col items-center justify-center gap-[3px] text-[10px] font-medium transition-colors"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Открыть меню"
        >
          <Menu size={21} strokeWidth={1.7} />
          <span>Меню</span>
        </button>
      </div>
    </nav>
  )
}
