import { useNavigate } from 'react-router-dom'

interface Props {
  title: string
  subtitle: string
  missingSteps: string[]
  icon?: string
}

export default function EmptyState({ title, subtitle, missingSteps, icon = '📋' }: Props) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h2 className="text-xl font-semibold mb-2"
        style={{ color: 'var(--text-primary)' }}>
        {title}
      </h2>
      <p className="text-sm mb-6 max-w-md"
        style={{ color: 'var(--text-muted)' }}>
        {subtitle}
      </p>

      {missingSteps.length > 0 && (
        <div className="rounded-xl p-4 text-left w-full max-w-md mb-6"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-muted)' }}>
            Что нужно сделать:
          </p>
          <div className="space-y-2">
            {missingSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-sm mt-0.5" style={{ color: 'var(--accent)' }}>
                  {i + 1}.
                </span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => navigate('/settings')}
        className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
        style={{ backgroundColor: 'var(--accent)' }}>
        Перейти в Настройки →
      </button>
    </div>
  )
}
