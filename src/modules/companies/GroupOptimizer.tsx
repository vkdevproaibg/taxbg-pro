import { useState, useMemo } from 'react'
import { useCompaniesStore } from '../../store/companiesStore'
import { useGroupStore } from '../../store/groupStore'
import { useAccountingStore } from '../../store/accountingStore'
import { useUserStore } from '../../store/userStore'
import {
  analyzeGroupRules,
  analyzeGroupAI,
  COUNTRY_TAX_RATES,
} from '../../lib/taxOptimizer'
import type { TaxOptimization } from '../../lib/taxOptimizer'
import HelpButton from '../../components/ui/HelpButton'

const ZONE_META = {
  green:  { icon: '🟢', label: 'Зелёная зона', color: 'var(--accent)',      bg: 'var(--accent-light)',  border: 'var(--accent)'  },
  yellow: { icon: '🟡', label: 'Жёлтая зона',  color: '#92400e',            bg: '#fffbeb',              border: '#f59e0b'        },
  red:    { icon: '🔴', label: 'Красная зона',  color: 'var(--danger-text)', bg: 'var(--danger-light)', border: 'var(--danger)'  },
}

const RISK_META = {
  low:    { label: 'Низкий риск',  color: 'var(--accent)' },
  medium: { label: 'Средний риск', color: '#f59e0b'       },
  high:   { label: 'Высокий риск', color: 'var(--danger)' },
}

function OptimizationCard({ opt }: { opt: TaxOptimization }) {
  const [expanded, setExpanded] = useState(false)
  const zone = ZONE_META[opt.zone]
  const risk = RISK_META[opt.risk]

  return (
    <div className="rounded-xl overflow-hidden shadow-sm"
      style={{ border: `1.5px solid ${zone.border}` }}>

      <button
        className="w-full flex items-start gap-3 p-4 text-left"
        style={{ backgroundColor: zone.bg }}
        onClick={() => setExpanded((e) => !e)}>

        <span className="text-xl shrink-0 mt-0.5">{zone.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm" style={{ color: zone.color }}>
              {opt.title}
            </p>
            <span className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: risk.color + '20', color: risk.color }}>
              {risk.label}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: zone.color }}>
            {opt.description.slice(0, 100)}{opt.description.length > 100 ? '...' : ''}
          </p>
          {opt.estimatedSaving !== undefined && (
            <p className="text-sm font-bold mt-1" style={{ color: zone.color }}>
              Экономия: ~{opt.estimatedSaving.toLocaleString('ru', { maximumFractionDigits: 0 })} €/год
            </p>
          )}
        </div>
        <span className="text-lg shrink-0" style={{ color: zone.color }}>
          {expanded ? '−' : '+'}
        </span>
      </button>

      {expanded && (
        <div className="p-4 space-y-4"
          style={{ backgroundColor: 'var(--surface-card)' }}>

          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {opt.description}
          </p>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-muted)' }}>
              Что нужно сделать:
            </p>
            <div className="space-y-1.5">
              {opt.requiredActions.map((action, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs mt-0.5 shrink-0 font-medium"
                    style={{ color: 'var(--accent)' }}>
                    {i + 1}.
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {action}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {opt.warnings.length > 0 && (
            <div className="rounded-xl p-3 space-y-1"
              style={{ backgroundColor: '#fffbeb', border: '1px solid #f59e0b' }}>
              <p className="text-xs font-semibold" style={{ color: '#92400e' }}>
                Риски и предупреждения:
              </p>
              {opt.warnings.map((w, i) => (
                <p key={i} className="text-xs" style={{ color: '#92400e' }}>{w}</p>
              ))}
            </div>
          )}

          <div className="rounded-xl p-3"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
              Анализ рисков:
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {opt.riskDetails}
            </p>
          </div>

          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Правовая база: {opt.legalBasis}
          </p>
        </div>
      )}
    </div>
  )
}

export default function GroupOptimizer() {
  const { companies } = useCompaniesStore()
  const { relations } = useGroupStore()
  const transactions  = useAccountingStore((s) => s.transactions)
  const { llmApiKey } = useUserStore()

  const [aiAnalysis,   setAiAnalysis]   = useState<string | null>(null)
  const [aiRedFlags,   setAiRedFlags]   = useState<string[]>([])
  const [aiLoading,    setAiLoading]    = useState(false)
  const [showAllZones, setShowAllZones] = useState<'all' | 'green' | 'yellow'>('all')

  const totalRevenue = useMemo(() =>
    transactions
      .filter(t => ['income', 'vat_out', 'appstore', 'googleplay', 'stripe'].includes(t.type))
      .reduce((s, t) => s + t.amount, 0),
    [transactions]
  )

  const optimizations = useMemo(() =>
    analyzeGroupRules(companies, relations, totalRevenue),
    [companies, relations, totalRevenue]
  )

  const filteredOpts = optimizations.filter((o) =>
    showAllZones === 'all' || o.zone === showAllZones
  )

  const totalSaving = optimizations
    .filter(o => o.zone !== 'red')
    .reduce((s, o) => s + (o.estimatedSaving ?? 0), 0)

  const handleAIAnalysis = async () => {
    setAiLoading(true)
    try {
      const result = await analyzeGroupAI(
        companies, relations, totalRevenue,
        llmApiKey || undefined
      )
      setAiAnalysis(result.recommendations)
      setAiRedFlags(result.redFlags)
    } finally {
      setAiLoading(false)
    }
  }

  const countryComparison = Object.entries(COUNTRY_TAX_RATES)
    .filter(([code]) => code !== 'OTHER')
    .map(([code, rates]) => ({
      code,
      ...rates,
      effectiveBurden: rates.corporateTax + rates.withholdingTax,
    }))
    .sort((a, b) => a.effectiveBurden - b.effectiveBurden)

  if (companies.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Добавьте компании для анализа налоговой оптимизации
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            AI Налоговый оптимизатор
          </h2>
          <HelpButton
            topic="налоговая оптимизация группа компаний трансфертное ценообразование BEPS"
            title="Налоговая оптимизация"
            pageContext="tax-optimizer"
          />
        </div>
        <button onClick={handleAIAnalysis} disabled={aiLoading}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--accent)' }}>
          {aiLoading ? '⏳ Анализирую...' : '🤖 AI Глубокий анализ'}
        </button>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl p-3"
        style={{ backgroundColor: '#fffbeb', border: '1px solid #f59e0b' }}>
        <p className="text-xs" style={{ color: '#92400e' }}>
          <strong>Важно:</strong> Оптимизатор предоставляет информацию в образовательных целях.
          Зелёная зона — общепризнанные легальные методы.
          Жёлтая зона — требует консультации с налоговым адвокатом перед применением.
          Красная зона — уклонение от налогов, не рекомендуется.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Компаний в группе',    value: String(companies.length),                                  color: 'var(--accent)' },
          { label: 'Юрисдикций',           value: String(new Set(companies.map(c => c.country)).size),       color: 'var(--accent)' },
          { label: 'Возможностей найдено', value: String(optimizations.length),                               color: '#f59e0b'       },
          { label: 'Потенциальная экономия', value: `${(totalSaving / 1000).toFixed(0)}K €/год`,             color: 'var(--accent)' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-4 shadow-sm"
            style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
            <div className="text-2xl font-bold" style={{ color: item.color }}>
              {item.value}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* AI Analysis result */}
      {aiAnalysis && (
        <div className="rounded-xl shadow-sm overflow-hidden"
          style={{ border: '1.5px solid var(--accent)' }}>
          <div className="px-4 py-3 flex items-center gap-2"
            style={{ backgroundColor: 'var(--accent-light)', borderBottom: '1px solid var(--accent)' }}>
            <span>🤖</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>
              AI Анализ структуры группы
            </span>
          </div>
          <div className="p-4">
            <p className="text-sm leading-relaxed whitespace-pre-line"
              style={{ color: 'var(--text-secondary)' }}>
              {aiAnalysis}
            </p>
            {aiRedFlags.length > 0 && (
              <div className="mt-4 rounded-xl p-3"
                style={{ backgroundColor: 'var(--danger-light)', border: '1px solid var(--danger)' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--danger-text)' }}>
                  🚨 Красные флаги — требуют немедленного внимания:
                </p>
                {aiRedFlags.map((flag, i) => (
                  <p key={i} className="text-xs" style={{ color: 'var(--danger-text)' }}>
                    · {flag}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Zone filter */}
      <div className="flex gap-2">
        {[
          { id: 'all',    label: `Все (${optimizations.length})` },
          { id: 'green',  label: `🟢 Зелёная (${optimizations.filter(o => o.zone === 'green').length})` },
          { id: 'yellow', label: `🟡 Жёлтая (${optimizations.filter(o => o.zone === 'yellow').length})` },
        ].map((f) => (
          <button key={f.id}
            onClick={() => setShowAllZones(f.id as 'all' | 'green' | 'yellow')}
            className="rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: showAllZones === f.id ? 'var(--accent)' : 'var(--surface-card)',
              color: showAllZones === f.id ? '#fff' : 'var(--text-secondary)',
              border: showAllZones === f.id
                ? '1.5px solid var(--accent)'
                : '1.5px solid var(--border)',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Optimizations list */}
      <div className="space-y-3">
        {filteredOpts.length === 0 ? (
          <div className="rounded-xl border border-dashed py-8 text-center"
            style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Для текущей структуры группы оптимизаций не найдено.
              Добавьте компании в разных юрисдикциях.
            </p>
          </div>
        ) : (
          filteredOpts.map((opt) => (
            <OptimizationCard key={opt.id} opt={opt} />
          ))
        )}
      </div>

      {/* Country comparison table */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Сравнение юрисдикций
        </h3>
        <div className="rounded-xl overflow-hidden shadow-sm"
          style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Страна', 'КНП', 'Дивиденды', 'WHT', 'IP Box', 'ЕС'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold"
                    style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {countryComparison.map((c) => {
                const isActive = companies.some(co => co.country === c.code)
                return (
                  <tr key={c.code} className="border-b"
                    style={{
                      borderColor: 'var(--border)',
                      backgroundColor: isActive ? 'var(--accent-light)' : 'var(--surface-card)',
                    }}>
                    <td className="px-3 py-2 font-medium"
                      style={{ color: isActive ? 'var(--accent-text)' : 'var(--text-primary)' }}>
                      {c.code} {isActive && '✓'}
                    </td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                      {(c.corporateTax * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                      {(c.dividendTax * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                      {(c.withholdingTax * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2">
                      {c.hasIPBox
                        ? <span style={{ color: 'var(--accent)' }}>✓</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {c.euMember
                        ? <span style={{ color: 'var(--accent)' }}>✓</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
