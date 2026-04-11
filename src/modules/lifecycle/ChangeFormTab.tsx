import { useState } from 'react'
import { useAccountingStore } from '../../store/accountingStore'
import { CHANGE_FORM_SCENARIOS } from '../../constants/lifecycle-events'
import ChecklistCard from './ChecklistCard'
import HelpButton from '../../components/ui/HelpButton'

export default function ChangeFormTab() {
  const transactions = useAccountingStore(s => s.transactions)
  const [selectedId, setSelectedId] = useState(CHANGE_FORM_SCENARIOS[0].id)

  const scenario = CHANGE_FORM_SCENARIOS.find(s => s.id === selectedId)!

  const annualRevenue = transactions
    .filter(t => ['income', 'vat_out', 'appstore', 'googleplay', 'stripe'].includes(t.type))
    .reduce((s, t) => s + t.amount, 0)

  const annualExpenses = transactions
    .filter(t => ['expense', 'vat_in', 'salary'].includes(t.type))
    .reduce((s, t) => s + t.amount, 0)

  // ET tax estimate
  const etTaxableBase = Math.max(annualRevenue * (1 - 0.15), 0)
  const etTax         = etTaxableBase * 0.10
  const etOsig        = Math.min(Math.max(annualRevenue / 12, 620.20), 2111.64) * 0.278 * 12
  const etTotal       = etTax + etOsig

  // OOD tax estimate
  const oodProfit   = Math.max(annualRevenue - annualExpenses, 0)
  const oodKNP      = oodProfit * 0.10
  const oodDividend = (oodProfit - oodKNP) * 0.07
  const oodTotal    = oodKNP + oodDividend

  const saving = etTotal - oodTotal

  return (
    <div className="space-y-6 p-6">

      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Смена формы собственности
        </h2>
        <HelpButton
          topic="смена правовой формы ЕТ ООД преобразование трансформация"
          title="Смена формы"
          pageContext="lifecycle-change-form"
        />
      </div>

      {/* Scenario selector */}
      <div className="flex gap-2 flex-wrap">
        {CHANGE_FORM_SCENARIOS.map((s) => (
          <button key={s.id}
            onClick={() => setSelectedId(s.id)}
            className="rounded-xl px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: selectedId === s.id ? 'var(--accent)' : 'var(--surface-card)',
              color: selectedId === s.id ? '#fff' : 'var(--text-secondary)',
              border: selectedId === s.id
                ? '1.5px solid var(--accent)'
                : '1.5px solid var(--border)',
            }}>
            {s.icon} {s.title}
          </button>
        ))}
      </div>

      {/* Scenario info */}
      <div className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
        <p className="font-semibold text-sm" style={{ color: 'var(--accent-text)' }}>
          {scenario.description}
        </p>
        <div className="flex gap-4 mt-2 flex-wrap">
          <span className="text-xs" style={{ color: 'var(--accent-text)' }}>
            ⏱ {scenario.duration}
          </span>
          <span className="text-xs" style={{ color: 'var(--accent-text)' }}>
            💶 {scenario.cost}
          </span>
        </div>
      </div>

      {/* Tax comparison (ET→OOD only) */}
      {selectedId === 'et_to_ood' && annualRevenue > 0 && (
        <div className="rounded-xl shadow-sm overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          <div className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}>
              Сравнение налоговой нагрузки (на основе ваших данных)
            </p>
          </div>
          <div className="grid grid-cols-2 divide-x"
            style={{ borderColor: 'var(--border)' }}>
            {[
              { label: 'ЕТ (сейчас)',  tax: etTax,  osig: etOsig,      total: etTotal,  osigLabel: 'Осигуровки',      color: 'var(--danger)' },
              { label: 'ООД (после)',   tax: oodKNP, osig: oodDividend,  total: oodTotal, osigLabel: 'Дивидент данък',  color: 'var(--accent)' },
            ].map((col) => (
              <div key={col.label} className="p-4" style={{ backgroundColor: 'var(--surface-card)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
                  {col.label}
                </p>
                <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex justify-between">
                    <span>Налог</span>
                    <span>{col.tax.toFixed(0)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{col.osigLabel}</span>
                    <span>{col.osig.toFixed(0)} €</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t"
                    style={{ borderColor: 'var(--border)' }}>
                    <span>Итого</span>
                    <span style={{ color: col.color }}>{col.total.toFixed(0)} €</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {Math.abs(saving) > 100 && (
            <div className="px-4 py-3 text-center"
              style={{ backgroundColor: saving > 0 ? 'var(--accent-light)' : 'var(--danger-light)' }}>
              <p className="text-sm font-semibold"
                style={{ color: saving > 0 ? 'var(--accent-text)' : 'var(--danger-text)' }}>
                {saving > 0
                  ? `Переход на ООД сэкономит ~${saving.toFixed(0)} €/год`
                  : `ЕТ выгоднее на ~${Math.abs(saving).toFixed(0)} €/год`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Warnings */}
      <div className="space-y-2">
        {scenario.warnings.map((w, i) => (
          <div key={i} className="rounded-xl p-3 flex items-start gap-2"
            style={{ backgroundColor: '#fffbeb', border: '1px solid #f59e0b' }}>
            <span className="text-sm shrink-0">⚠️</span>
            <p className="text-xs" style={{ color: '#92400e' }}>{w}</p>
          </div>
        ))}
      </div>

      {/* Tax consequences */}
      <div className="rounded-xl shadow-sm overflow-hidden"
        style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}>
            Налоговые последствия
          </p>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {scenario.taxConsequences.map((tc, i) => (
            <div key={i} className="px-4 py-3"
              style={{ backgroundColor: tc.isRisk ? 'var(--danger-light)' : 'var(--surface-card)' }}>
              <p className="text-sm font-medium"
                style={{ color: tc.isRisk ? 'var(--danger-text)' : 'var(--text-primary)' }}>
                {tc.isRisk ? '⚠ ' : ''}{tc.title}
              </p>
              <p className="text-xs mt-0.5"
                style={{ color: tc.isRisk ? 'var(--danger-text)' : 'var(--text-secondary)' }}>
                {tc.description}
              </p>
              {tc.formula && (
                <p className="text-xs mt-1 font-mono"
                  style={{ color: tc.isRisk ? 'var(--danger)' : 'var(--accent)' }}>
                  {tc.formula}
                </p>
              )}
              <p className="text-xs mt-1 opacity-70"
                style={{ color: tc.isRisk ? 'var(--danger-text)' : 'var(--text-muted)' }}>
                {tc.legalBasis}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Professional help */}
      <div className="rounded-xl p-3 flex items-start gap-2"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <span className="text-sm shrink-0">⚖️</span>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          <strong>Рекомендация:</strong> {scenario.professionalHelp}
        </p>
      </div>

      {/* Checklist */}
      <ChecklistCard items={scenario.checklist} title="Пошаговый чеклист" />
    </div>
  )
}
