import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompaniesStore } from '../../store/companiesStore'

export default function CompanySwitcher() {
  const { companies, activeCompanyId, setActive } = useCompaniesStore()
  const [open, setOpen] = useState(false)
  const navigate        = useNavigate()

  const active = companies.find((c) => c.id === activeCompanyId)

  if (companies.length === 0) return null

  return (
    <div className="relative px-2 mb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:opacity-90"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}>
        {/* Color dot */}
        <div className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: active?.color ?? 'var(--accent)' }} />

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate"
            style={{ color: 'var(--text-primary)' }}>
            {active?.name ?? 'Выберите компанию'}
          </p>
          <p className="text-xs truncate"
            style={{ color: 'var(--text-muted)' }}>
            {active?.legalForm?.toUpperCase()} · {active?.country ?? 'BG'}
          </p>
        </div>

        <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-2 right-2 top-full mt-1 z-50 rounded-xl shadow-lg overflow-hidden"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>

          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => {
                setActive(company.id)
                setOpen(false)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:opacity-80"
              style={{
                backgroundColor: company.id === activeCompanyId
                  ? 'var(--accent-light)'
                  : 'transparent',
              }}>
              <div className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: company.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate"
                  style={{ color: company.id === activeCompanyId ? 'var(--accent-text)' : 'var(--text-primary)' }}>
                  {company.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {company.legalForm.toUpperCase()} · {company.country}
                  {company.isOffshore && ' · Offshore'}
                </p>
              </div>
              {company.id === activeCompanyId && (
                <span className="text-xs shrink-0" style={{ color: 'var(--accent)' }}>✓</span>
              )}
            </button>
          ))}

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => { navigate('/companies'); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
              style={{ color: 'var(--accent)' }}>
              <span className="text-sm">+</span>
              <span className="text-xs font-medium">Добавить компанию</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
