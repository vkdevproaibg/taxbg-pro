import { useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTourStore } from '../../store/tourStore'
import { useAccountingStore } from '../../store/accountingStore'
import { useJournalStore } from '../../store/journalStore'
import { buildOPR } from '../../lib/financialReports'
import { X, ChevronLeft, ChevronRight, Minimize2, Maximize2 } from 'lucide-react'

const FINANCIAL_STEP_IDS = ['view-opr', 'view-balance', 'dds-declaration', 'zkpo-declaration']

export default function TourOverlay() {
  const {
    activeTour, session, isOverlayMinimized,
    nextStep, prevStep, endTour, minimizeOverlay,
    getCurrentStep, isStepComplete, completeStep,
  } = useTourStore()

  const navigate = useNavigate()
  const location = useLocation()

  const transactions = useAccountingStore((s) => s.transactions)
  const entries      = useJournalStore((s) => s.entries)

  const step    = getCurrentStep()
  const stepIdx = session?.currentStepIndex ?? 0
  const total   = activeTour?.steps.length ?? 0
  const isFirst = stepIdx === 0
  const isLast  = stepIdx === total - 1

  // Auto-navigate + dispatch tab activation event
  useEffect(() => {
    if (!step) return
    if (step.navigateTo && location.pathname !== step.navigateTo) {
      navigate(step.navigateTo)
    }
    if (step.activateTab) {
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('tour:activate-tab', { detail: { tab: step.activateTab } })
        )
      }, 150)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id])

  // Compute live financial numbers for relevant steps
  const liveNumbers = useMemo(() => {
    if (!step || !FINANCIAL_STEP_IDS.includes(step.id)) return null
    try {
      const year = new Date().getFullYear()
      const from = `${year}-01-01`
      const to   = `${year}-12-31`
      const opr  = buildOPR(entries, transactions, from, to, 'Demo')
      const vatOut = transactions
        .filter((t) => t.type === 'vat_out')
        .reduce((s, t) => s + (t.vatAmount ?? 0), 0)
      const totalExpenseAmt = transactions
        .filter((t) => ['expense', 'vat_in', 'salary'].includes(t.type))
        .reduce((s, t) => s + t.amount, 0)
      const bankBalance =
        transactions
          .filter((t) => ['income', 'vat_out', 'appstore', 'stripe'].includes(t.type))
          .reduce((s, t) => s + t.amount, 0) - totalExpenseAmt
      return {
        totalIncome:   opr.totalRevenue.toFixed(2),
        totalExpenses: opr.totalExpenses.toFixed(2),
        taxableProfit: opr.taxableProfit.toFixed(2),
        corporateTax:  opr.corporateTax.toFixed(2),
        netProfit:     opr.netProfit.toFixed(2),
        vatPayable:    vatOut.toFixed(2),
        bankBalance:   bankBalance.toFixed(2),
      }
    } catch {
      return null
    }
  }, [step?.id, transactions.length, entries.length])

  if (!activeTour || !session || !step) return null

  const handleNext = () => {
    completeStep(step.id)
    if (isLast) {
      endTour(true)
    } else {
      nextStep()
    }
  }

  if (isOverlayMinimized) {
    return (
      <div
        className="fixed bottom-20 right-4 z-50 flex items-center
                   gap-2 rounded-xl px-4 py-2.5 shadow-lg cursor-pointer"
        style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        onClick={() => minimizeOverlay(false)}>
        <span className="text-lg">{activeTour.icon}</span>
        <span className="text-sm font-medium">{activeTour.title}</span>
        <span className="text-xs opacity-75">{stepIdx + 1}/{total}</span>
        <Maximize2 size={14} />
      </div>
    )
  }

  return (
    <div
      className="fixed bottom-20 right-4 z-50 w-80 rounded-2xl
                 shadow-2xl flex flex-col overflow-hidden"
      style={{
        border: '1px solid var(--accent)',
        backgroundColor: 'var(--surface-card)',
        maxHeight: '60vh',
      }}>

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ backgroundColor: 'var(--accent)' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{activeTour.icon}</span>
          <div>
            <p className="text-xs font-semibold text-white">{activeTour.title}</p>
            <p className="text-xs text-white/70">Шаг {stepIdx + 1} из {total}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => minimizeOverlay(true)}
            className="p-1 rounded text-white/70 hover:text-white">
            <Minimize2 size={14} />
          </button>
          <button
            onClick={() => endTour(false)}
            className="p-1 rounded text-white/70 hover:text-white">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 shrink-0" style={{ backgroundColor: 'var(--border)' }}>
        <div
          className="h-1 transition-all duration-500"
          style={{
            width: `${((stepIdx + 1) / total) * 100}%`,
            backgroundColor: 'var(--accent)',
          }}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto px-4 py-4 space-y-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {step.title}
        </p>
        <p
          className="text-xs leading-relaxed whitespace-pre-line"
          style={{ color: 'var(--text-secondary)' }}>
          {step.instruction}
        </p>

        {/* Live numbers panel for financial steps */}
        {liveNumbers && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border)' }}>
            <div className="px-3 py-2" style={{ backgroundColor: 'var(--surface)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                📊 Ваши данные сейчас
              </p>
            </div>
            {(step.id === 'view-opr' || step.id === 'zkpo-declaration') && (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {[
                  ['Приходи',         liveNumbers.totalIncome],
                  ['Разходи',         liveNumbers.totalExpenses],
                  ['Данъчна печалба', liveNumbers.taxableProfit],
                  ['Корп. данък 10%', liveNumbers.corporateTax],
                  ['Нетна печалба',   liveNumbers.netProfit],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between px-3 py-1.5">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {value} €
                    </span>
                  </div>
                ))}
              </div>
            )}
            {step.id === 'view-balance' && (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {[
                  ['Банкова сметка', liveNumbers.bankBalance,  false],
                  ['Нетна печалба',  liveNumbers.netProfit,    false],
                  ['ДДС к уплате',   liveNumbers.vatPayable,   false],
                  ['Данък к уплате', liveNumbers.corporateTax, false],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between px-3 py-1.5">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {value} €
                    </span>
                  </div>
                ))}
              </div>
            )}
            {step.id === 'dds-declaration' && (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {[
                  ['Начислен ДДС', liveNumbers.vatPayable, false],
                  ['Вычет ДДС',    '0.00',                 false],
                  ['К уплате',     liveNumbers.vatPayable, true],
                ].map(([label, value, isDue]) => (
                  <div key={label as string} className="flex justify-between px-3 py-1.5">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span
                      className="text-xs font-bold"
                      style={{ color: isDue ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {value} €
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Affects system badges */}
        {step.affectsSystem && step.affectsSystem.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Затрагивает:
            </span>
            {step.affectsSystem.map((s) => (
              <span
                key={s}
                className="rounded-full px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent)',
                }}>
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Completion note shown after marking done */}
        {isStepComplete(step.id) && step.completionNote && (
          <div
            className="rounded-xl p-3"
            style={{
              backgroundColor: 'var(--accent-light)',
              border: '1px solid var(--accent)',
            }}>
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--accent-text)' }}>
              ✓ Готово!
            </p>
            <p className="text-xs" style={{ color: 'var(--accent-text)' }}>
              {step.completionNote}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div
        className="flex items-center justify-between px-4 py-3 border-t shrink-0"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--surface)',
        }}>
        <button
          onClick={prevStep}
          disabled={isFirst}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5
                     text-xs disabled:opacity-30"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <ChevronLeft size={12} />
          Назад
        </button>

        <button
          onClick={handleNext}
          className="flex items-center gap-1 rounded-lg px-4 py-1.5
                     text-xs font-semibold text-white"
          style={{ backgroundColor: 'var(--accent)' }}>
          {isStepComplete(step.id)
            ? isLast
              ? '🏁 Завершить'
              : 'Далее'
            : step.completionTrigger === 'manual'
              ? '✓ Готово'
              : 'Выполнено →'}
          {!isLast && <ChevronRight size={12} />}
        </button>
      </div>
    </div>
  )
}
