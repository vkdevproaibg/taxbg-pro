import { NavLink } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { useAuthStore } from '../../store/authStore'

export default function BottomBar() {
  const t = useT()
  const { profile } = useAuthStore()
  const currentYear = new Date().getFullYear()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${
      isActive ? 'font-medium' : ''
    }`

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
    color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
  })

  return (
    <footer className="bg-[--surface-card]/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-2.5">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider mr-2"
            style={{ color: 'var(--text-muted)' }}>
            Система
          </span>

          <NavLink to="/settings" className={linkClass} style={linkStyle}>
            {({ isActive }) => (
              <>
                <Settings
                  size={14}
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
                />
                <span>{t('nav_settings')}</span>
              </>
            )}
          </NavLink>

          <NavLink to="/learning" className={linkClass} style={linkStyle}>
            <span className="text-sm leading-none">🎓</span>
            <span>Обучение</span>
          </NavLink>

          <NavLink to="/tours" className={linkClass} style={linkStyle}>
            <span className="text-sm leading-none">🎯</span>
            <span>Практикум</span>
          </NavLink>

          <NavLink to="/testing" className={linkClass} style={linkStyle}>
            <span className="text-sm leading-none">🧪</span>
            <span>Тест</span>
          </NavLink>

          <NavLink to="/expat" className={linkClass} style={linkStyle}>
            <span className="text-sm leading-none">🇧🇬</span>
            <span>{t('nav_expat')}</span>
          </NavLink>

          <NavLink to="/startup-visa" className={linkClass} style={linkStyle}>
            <span className="text-sm leading-none">🚀</span>
            <span>Виза D</span>
          </NavLink>

          {profile?.role === 'superadmin' && (
            <NavLink
              to="/superadmin"
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive ? 'font-semibold' : ''
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? '#fef2f2' : 'transparent',
                color: isActive ? '#dc2626' : '#dc2626',
                opacity: isActive ? 1 : 0.7,
              })}
            >
              <span className="text-sm leading-none">⚡</span>
              <span>Админ</span>
            </NavLink>
          )}
        </div>

        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {currentYear}
        </span>
      </div>
    </footer>
  )
}
