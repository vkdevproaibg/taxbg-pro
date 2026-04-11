import { useState } from 'react'
import { SALE_SCENARIOS } from '../../constants/lifecycle-events'
import ChecklistCard from './ChecklistCard'
import HelpButton from '../../components/ui/HelpButton'

export default function SaleTab() {
  const [selectedId,        setSelectedId]        = useState(SALE_SCENARIOS[0].id)
  const [salePrice,         setSalePrice]         = useState(50000)
  const [acquisitionPrice,  setAcquisitionPrice]  = useState(100)
  const [transactionCosts,  setTransactionCosts]  = useState(500)

  const scenario = SALE_SCENARIOS.find(s => s.id === selectedId)!

  const taxableGain = Math.max(salePrice - acquisitionPrice - transactionCosts, 0)
  const ddfl        = taxableGain * 0.10
  const netReceived = salePrice - ddfl - transactionCosts

  return (
    <div className="space-y-6 p-6">

      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Продажа компании или доли
        </h2>
        <HelpButton
          topic="продажа дяла ООД ДДФЛ прехвърляне на дялове нотариус"
          title="Продажа фирмы"
          pageContext="lifecycle-sale"
        />
      </div>

      {/* Scenario selector */}
      <div className="flex gap-2 flex-wrap">
        {SALE_SCENARIOS.map((s) => (
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

      {/* ДДФЛ Calculator */}
      <div className="rounded-xl shadow-sm overflow-hidden"
        style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}>
            Калькулятор ДДФЛ с продажи
          </p>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: 'Цена продажи (€)',              value: salePrice,        set: setSalePrice        },
              { label: 'Цена приобретения доли (€)',     value: acquisitionPrice, set: setAcquisitionPrice },
              { label: 'Расходы на сделку (€)',          value: transactionCosts, set: setTransactionCosts },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {label}
                </label>
                <input type="number" step="100" min="0" value={value}
                  onChange={(e) => set(Number(e.target.value))}
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                  style={{
                    border: '1.5px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
              </div>
            ))}
          </div>

          {/* Result breakdown */}
          <div className="rounded-xl p-4 space-y-2"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            {[
              { label: 'Цена продажи',             value: salePrice,         color: 'var(--accent)',       bold: false },
              { label: 'Минус цена покупки',        value: -acquisitionPrice, color: 'var(--danger)',       bold: false },
              { label: 'Минус расходы сделки',      value: -transactionCosts, color: 'var(--danger)',       bold: false },
              { label: 'Налогооблагаемая прибыль',  value: taxableGain,       color: 'var(--text-primary)', bold: true  },
              { label: 'ДДФЛ 10%',                  value: -ddfl,             color: 'var(--danger)',       bold: true  },
              { label: 'Получите на руки',           value: netReceived,       color: 'var(--accent)',       bold: true  },
            ].map((row) => (
              <div key={row.label}
                className="flex items-center justify-between py-1 border-b last:border-0"
                style={{ borderColor: 'var(--border)' }}>
                <span className={`text-sm ${row.bold ? 'font-semibold' : ''}`}
                  style={{ color: 'var(--text-secondary)' }}>
                  {row.label}
                </span>
                <span className={`text-sm ${row.bold ? 'font-bold' : 'font-medium'}`}
                  style={{ color: row.color }}>
                  {row.value >= 0 ? '+' : ''}{row.value.toFixed(0)} €
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Срок уплаты ДДФЛ: до 30 апреля следующего года ·
            Декларировать в ЗДДФЛ Приложение 5 ·{' '}
            {scenario.taxConsequences[0]?.legalBasis}
          </p>
        </div>
      </div>

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

      {/* Due diligence for buyer */}
      <div className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          📋 Что проверить покупателю (Due Diligence)
        </p>
        <div className="space-y-2">
          {[
            { icon: '🏛️', text: 'Справка об отсутствии долгов в НАП' },
            { icon: '📊', text: 'Все ГФО опубликованы в БРРА за все годы' },
            { icon: '📝', text: 'Все декларации поданы в НАП (ДДС, ЗКПО, Образец 1)' },
            { icon: '💰', text: 'Нет исполнительных производств в ЧСИ' },
            { icon: '👥', text: 'Все сотрудники оформлены официально' },
            { icon: '🏠', text: 'Активы реально существуют и на балансе' },
            { icon: '📜', text: 'Нет судебных исков против компании' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2">
              <span>{item.icon}</span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <a href="https://portal.nra.bg" target="_blank" rel="noreferrer"
            className="rounded-xl px-3 py-1.5 text-xs font-medium text-white"
            style={{ backgroundColor: 'var(--accent)' }}>
            НАП справка →
          </a>
          <a href="https://brra.bg" target="_blank" rel="noreferrer"
            className="rounded-xl px-3 py-1.5 text-xs font-medium"
            style={{ border: '1.5px solid var(--accent)', color: 'var(--accent)' }}>
            БРРА проверка →
          </a>
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
      <ChecklistCard items={scenario.checklist} title="Пошаговый чеклист продавца" />
    </div>
  )
}
