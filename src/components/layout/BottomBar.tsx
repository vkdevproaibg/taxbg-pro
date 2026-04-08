import { NavLink } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { useT } from '../../lib/i18n'

export default function BottomBar() {
  const t = useT()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[--surface-card]/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[--text-muted]">
            Система
          </span>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${
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
                <Settings
                  size={14}
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
                />
                <span>{t('nav_settings')}</span>
              </>
            )}
          </NavLink>
        </div>

        <span className="text-xs text-[--text-muted]">{currentYear}</span>
      </div>
    </footer>
  )
}