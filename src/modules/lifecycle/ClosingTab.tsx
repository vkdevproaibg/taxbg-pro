import { useState } from 'react'
import {
  CLOSING_CHECKLIST,
  CLOSING_TAX_CONSEQUENCES,
} from '../../constants/lifecycle-events'
import ChecklistCard from './ChecklistCard'
import HelpButton from '../../components/ui/HelpButton'

export default function ClosingTab() {
  const [capitalInvested, setCapitalInvested] = useState(1000)
  const [assetsRemaining, setAssetsRemaining] = useState(30000)
  const [debtsToPay,      setDebtsToPay]      = useState(5000)

  const liquidationShare = Math.max(assetsRemaining - debtsToPay, 0)
  const taxableBase      = Math.max(liquidationShare - capitalInvested, 0)
  const ddfl             = taxableBase * 0.05
  const netReceived      = liquidationShare - ddfl

  const criticalCount = CLOSING_CHECKLIST.filter(i => i.isCritical).length

  return (
    <div className="space-y-6 p-6">

      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Закрытие компании (Ликвидация)
        </h2>
        <HelpButton
          topic="ликвидация ООД заличаване БРРА ликвидационен дял"
          title="Ликвидация"
          pageContext="lifecycle-closing"
        />
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Минимум',           value: '6 месяцев',                    icon: '⏱' },
          { label: 'Критичных шагов',   value: String(criticalCount),           icon: '🔴' },
          { label: 'Всего шагов',       value: String(CLOSING_CHECKLIST.length), icon: '📋' },
          { label: 'ДДФЛ с дивиденди', value: '5%',                            icon: '💶' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-4 text-center shadow-sm"
            style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
            <div className="text-xl mb-1">{item.icon}</div>
            <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
              {item.value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* Important warning */}
      <div className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--danger-light)', border: '1.5px solid var(--danger)' }}>
        <p className="font-semibold text-sm mb-2" style={{ color: 'var(--danger-text)' }}>
          🔴 Важно перед началом ликвидации
        </p>
        <div className="space-y-1">
          {[
            'Ликвидация занимает МИНИМУМ 6 месяцев — это законодательный срок для кредиторов',
            'Нельзя заличить компанию с долгами — сначала уплатить всё',
            'Публикация в Държавен вестник — обязательна, иначе БРРА откажет',
            'Без справки НАП об отсутствии долгов — заличаване невозможно',
          ].map((w, i) => (
            <p key={i} className="text-xs" style={{ color: 'var(--danger-text)' }}>· {w}</p>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl shadow-sm overflow-hidden"
        style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}>
            Типичный timeline ликвидации
          </p>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {[
            { month: 'Месяц 1',    title: 'Решение + БРРА + ДВ',   desc: 'Решение о ликвидации, регистрация в БРРА, публикация в Държавен вестник' },
            { month: 'Месяц 1–6', title: 'Ликвидационен период',  desc: 'Закрытие договоров, взыскание долгов, уплата обязательств, продажа активов' },
            { month: 'Месяц 6+',  title: 'Финальные декларации',  desc: 'Все декларации НАП, финальный ГФО, получение справки об отсутствии долгов' },
            { month: 'Месяц 7–12', title: 'Заличаване',           desc: 'Ликвидационен баланс, распределение дяла, подача в БРРА, закрытие счёта' },
          ].map((step) => (
            <div key={step.month} className="flex items-start gap-4 px-4 py-3"
              style={{ backgroundColor: 'var(--surface-card)' }}>
              <span className="text-xs font-mono shrink-0 mt-0.5 w-20"
                style={{ color: 'var(--accent)' }}>
                {step.month}
              </span>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {step.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Liquidation calculator */}
      <div className="rounded-xl shadow-sm overflow-hidden"
        style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}>
            Калькулятор ликвидационного дяла
          </p>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: 'Активы компании (€)',        value: assetsRemaining, set: setAssetsRemaining },
              { label: 'Долги и обязательства (€)',  value: debtsToPay,      set: setDebtsToPay      },
              { label: 'Вложенный капитал (€)',       value: capitalInvested, set: setCapitalInvested },
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

          <div className="rounded-xl p-4 space-y-2"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            {[
              { label: 'Активы компании',         value: assetsRemaining,  color: 'var(--accent)',       bold: false },
              { label: 'Минус долги',              value: -debtsToPay,      color: 'var(--danger)',       bold: false },
              { label: 'Ликвидационен дял',        value: liquidationShare, color: 'var(--text-primary)', bold: true  },
              { label: 'Минус вложенный капитал',  value: -capitalInvested, color: 'var(--text-muted)',   bold: false },
              { label: 'Налогооблагаемая база',    value: taxableBase,      color: 'var(--text-primary)', bold: false },
              { label: 'ДДФЛ 5%',                 value: -ddfl,            color: 'var(--danger)',       bold: true  },
              { label: 'Получите на руки',         value: netReceived,      color: 'var(--accent)',       bold: true  },
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
                  {row.value.toFixed(0)} €
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            ЗДДФЛ чл. 38 ал. 1 т. 5 · Декларировать в год получения дяла
          </p>
        </div>
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
          {CLOSING_TAX_CONSEQUENCES.map((tc, i) => (
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
          <strong>Рекомендация:</strong> Ликвидация требует адвоката или лицензированного
          ликвидатора. Особенно если есть сотрудники, активы или долги.
          Самостоятельная ликвидация возможна только для простых компаний без активов.
        </p>
      </div>

      {/* Full checklist */}
      <ChecklistCard
        items={CLOSING_CHECKLIST}
        title={`Полный чеклист ликвидации (${CLOSING_CHECKLIST.length} шагов)`}
      />
    </div>
  )
}
