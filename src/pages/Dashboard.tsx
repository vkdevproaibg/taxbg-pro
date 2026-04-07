import { useMemo } from 'react'
import { useUserStore } from '../store/userStore'
import { useAccountingStore } from '../store/accountingStore'
import { DEADLINES_2026 } from '../constants/deadlines'
import { TAX_RATES_2026 } from '../constants/tax-rates-2026'
import { format, addMonths, setDate, isAfter, startOfToday } from 'date-fns'

const LEGAL_LABELS = { ood: 'ООД', et: 'ЕТ', self: 'Самоосигуряващ се' }

function getUpcoming(legalForm: 'ood' | 'et' | 'self', count = 5) {
  const today = startOfToday()
  const results: { deadline: typeof DEADLINES_2026[0]; date: Date }[] = []

  for (let offset = 0; offset < 3; offset++) {
    const base = addMonths(today, offset)
    const month = base.getMonth() + 1

    for (const d of DEADLINES_2026) {
      if (!d.forms.includes(legalForm)) continue
      const targetMonth = d.isMonthly ? month : d.month
      if (!d.isMonthly && d.month !== month) continue
      const date = setDate(new Date(base.getFullYear(), targetMonth - 1, 1), d.day)
      if (isAfter(date, today)) results.push({ deadline: d, date })
    }
  }
  return results.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, count)
}

export default function Dashboard() {
  const { legalForm, companyName } = useUserStore()
  const transactions = useAccountingStore((s) => s.transactions)
  const upcoming = useMemo(() => getUpcoming(legalForm), [legalForm])
  const r = TAX_RATES_2026

  const totalIn = transactions.filter(t => ['income', 'vat_out', 'appstore', 'googleplay', 'stripe'].includes(t.type)).reduce((s, t) => s + t.amount, 0)
  const totalOut = transactions.filter(t => ['expense', 'vat_in', 'salary', 'dividend', 'depreciation', 'vehicle_tax', 'vehicle_expense'].includes(t.type)).reduce((s, t) => s + t.amount * (t.type === 'vehicle_expense' ? (t.deductiblePercent ?? 0.5) : 1), 0)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Дашборд</h1>
        {companyName && <p className="mt-1 text-slate-500">{companyName}</p>}
        <span className="mt-2 inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
          {LEGAL_LABELS[legalForm]}
        </span>
      </div>

      {/* Key rates */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Корпоративен данък', value: `${r.corporateTax.value * 100}%` },
          { label: 'Данък дивиденти', value: `${r.dividendTax.value * 100}%` },
          { label: 'ДДС', value: `${r.vat.value * 100}%` },
          { label: 'МРЗ', value: `${r.minWage.value} €` },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="text-2xl font-bold text-violet-600">{item.value}</div>
            <div className="mt-1 text-xs text-slate-500">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Accounting summary */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Приходи (всичко)', value: totalIn, color: 'text-green-600' },
            { label: 'Разходи (всичко)', value: totalOut, color: 'text-red-500' },
            { label: 'Резултат', value: totalIn - totalOut, color: totalIn - totalOut >= 0 ? 'text-violet-600' : 'text-red-600' },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className={`text-xl font-bold ${item.color}`}>{item.value.toFixed(2)} €</div>
              <div className="mt-1 text-xs text-slate-400">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming deadlines */}
      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
          Предстоящи срокове
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-400">Няма предстоящи срокове</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(({ deadline, date }) => (
              <div key={`${deadline.id}-${date.toISOString()}`}
                className="flex items-start gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="min-w-[52px] rounded-lg bg-violet-50 p-2 text-center">
                  <div className="text-xs text-violet-400">{format(date, 'MMM')}</div>
                  <div className="text-lg font-bold text-violet-700">{format(date, 'd')}</div>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{deadline.title_ru}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{deadline.description_ru}</div>
                  <div className="mt-1 text-xs text-red-400">{deadline.penaltyInfo_ru}</div>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {deadline.authority}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
