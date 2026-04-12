import { useState } from 'react'
import { useUserStore } from '../../store/userStore'
import { useCalculator } from './useCalculator'
import type { LegalFormCalc, ExpenseMode } from './useCalculator'
import DividendCalculator from './DividendCalculator'
import { trackEvent } from '../../lib/analytics'

const T = {
  ru: {
    expenseModeLabel: 'Режим расходов (ЗДДФЛ чл. 29)',
    normative: 'Нормативные 25% — без документов',
    actual: 'Фактические расходы — по фактурам',
  },
  en: {
    expenseModeLabel: 'Expense mode (ZDDFL art. 29)',
    normative: 'Normative 25% — no documents',
    actual: 'Actual expenses — with invoices',
  },
  bg: {
    expenseModeLabel: 'Вид разходи (ЗДДФЛ чл. 29)',
    normative: 'Нормативни 25% — без документи',
    actual: 'Реални разходи — с фактури',
  },
  uk: {
    expenseModeLabel: 'Режим витрат (ЗДДФЛ ст. 29)',
    normative: 'Нормативні 25% — без документів',
    actual: 'Фактичні витрати — за рахунками',
  },
}

type CalcTab = 'tax' | 'dividend'

export default function CalculatorModule() {
  const [tab, setTab] = useState<CalcTab>('tax')
  const language = useUserStore((s) => s.language) || 'ru'
  const labels = T[language] ?? T.ru
  const legalFormStore = useUserStore((s) => s.legalForm)
  const initForm: LegalFormCalc = legalFormStore === 'ood' ? 'ood' : 'self'

  const [revenue, setRevenue] = useState(50000)
  const [expenses, setExpenses] = useState(10000)
  const [legalForm, setLegalForm] = useState<LegalFormCalc>(initForm)
  const [bornBefore1960, setBornBefore1960] = useState(false)
  const [expenseMode, setExpenseMode] = useState<ExpenseMode>('normative')

  const result = useCalculator({ revenue, expenses, legalForm, hasBornBefore1960: bornBefore1960, expenseMode })

  const handleLegalFormChange = (form: LegalFormCalc) => {
    setLegalForm(form)
    trackEvent('calculator_used', { legalForm: form })
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setTab('tax')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm transition-colors ${
            tab === 'tax' ? 'bg-white font-medium shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Данъчен калкулатор
        </button>
        <button
          onClick={() => setTab('dividend')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm transition-colors ${
            tab === 'dividend' ? 'bg-white font-medium shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Дивиденти vs Заплата
        </button>
      </div>

      {tab === 'tax' && (
        <>
      <div>
        <h1 className="text-2xl font-semibold">Данъчен калкулатор</h1>
        <p className="mt-1 text-sm text-slate-400">Годишен разчет · ставки 2026 · EUR</p>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Правна форма</label>
            <select
              value={legalForm}
              onChange={e => handleLegalFormChange(e.target.value as LegalFormCalc)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
            >
              <option value="ood">ООД — корпоративен данък 10%</option>
              <option value="self">Самоосигуряващ се — ДДФЛ 10%</option>
            </select>
          </div>
          {legalForm === 'self' && (
            <div className="flex items-end">
              <label className="cursor-pointer flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={bornBefore1960}
                  onChange={e => setBornBefore1960(e.target.checked)}
                  className="rounded"
                />
                Роден преди 1960 (без УПФ)
              </label>
            </div>
          )}
        </div>

        {legalForm === 'self' && (
          <div>
            <label className="mb-1 block text-xs text-slate-400">{labels.expenseModeLabel}</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="radio"
                  name="expenseMode"
                  value="normative"
                  checked={expenseMode === 'normative'}
                  onChange={() => setExpenseMode('normative')}
                />
                {labels.normative}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="radio"
                  name="expenseMode"
                  value="actual"
                  checked={expenseMode === 'actual'}
                  onChange={() => setExpenseMode('actual')}
                />
                {labels.actual}
              </label>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Годишни приходи (€)</label>
            <input
              type="number"
              value={revenue}
              onChange={e => setRevenue(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Годишни разходи (€)</label>
            <input
              type="number"
              value={expenses}
              onChange={e => setExpenses(Number(e.target.value))}
              disabled={legalForm === 'self' && expenseMode === 'normative'}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
            />
            {legalForm === 'self' && expenseMode === 'normative' && (
              <p className="mt-1 text-xs text-slate-400">При нормативни разходи полето не се използва</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Нетна печалба',
            value: result.netAnnual,
            color: result.netAnnual >= 0 ? 'text-green-600' : 'text-red-600',
          },
          { label: 'Данък', value: result.incomeTax, color: 'text-red-500' },
          { label: 'Осигуровки/год', value: result.osigAnnual, color: 'text-orange-500' },
          { label: 'Данъчна тежест', value: null, pct: result.effectiveRate, color: 'text-violet-600' },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className={`text-xl font-bold ${item.color}`}>
              {item.pct !== undefined
                ? `${item.pct.toFixed(1)}%`
                : `${item.value!.toFixed(2)} €`}
            </div>
            <div className="mt-1 text-xs text-slate-400">{item.label}</div>
            {item.label === 'Данъчна тежест' && (
              <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                данък / приходи · ЗКПО: 10%
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <span className="text-sm font-medium text-slate-700">Разбивка</span>
        </div>
        <div className="divide-y divide-slate-50">
          {result.breakdown.map(row => (
            <div key={row.label} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm text-slate-700">{row.label}</span>
                {row.note && <span className="ml-2 text-xs text-slate-400">{row.note}</span>}
              </div>
              <span className={`text-sm font-medium ${row.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {row.amount >= 0 ? '+' : ''}
                {row.amount.toFixed(2)} €
              </span>
            </div>
          ))}
        </div>
      </div>
        </>
      )}

      {tab === 'dividend' && <DividendCalculator />}
    </div>
  )
}
