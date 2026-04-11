import { useState } from 'react'
import { useDividend } from './useDividend'
import HelpButton from '../../components/ui/HelpButton'

export default function DividendCalculator() {
  const [annualProfit, setAnnualProfit] = useState(50000)
  const [ownerSharePct, setOwnerSharePct] = useState(100)
  const [compareToSalary, setCompareToSalary] = useState(3000)

  const result = useDividend({ annualProfit, ownerSharePct, compareToSalary })

  const REC = {
    dividend: { color: 'bg-green-50 border-green-200 text-green-700', text: `Дивиденты выгоднее на ${Math.abs(result.diff).toFixed(0)} €` },
    salary:   { color: 'bg-orange-50 border-orange-200 text-orange-700', text: `Зарплата выгоднее на ${Math.abs(result.diff).toFixed(0)} €` },
    equal:    { color: 'bg-slate-50 border-slate-200 text-slate-600', text: 'Разница незначительна — выбор по ситуации' },
  }
  const rec = REC[result.recommendation]

  return (
    <div className="space-y-5">
      {/* Inputs */}
      <div className="space-y-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-700">Дивиденты vs зарплата</h3>
          <HelpButton
            topic="ЗКПО чл. 247 дивиденти ЗДДФЛ чл. 38 данък дивиденти 5%"
            title="Дивиденты и налоги"
            pageContext="calculator"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Годишна печалба на ООД (€)</label>
            <input
              type="number"
              value={annualProfit}
              onChange={e => setAnnualProfit(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Дял на собственика (%)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={ownerSharePct}
              onChange={e => setOwnerSharePct(Math.min(100, Math.max(1, Number(e.target.value))))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-slate-400">
              Заплата брутто за сравнение (€/мес.)
            </label>
            <input
              type="number"
              value={compareToSalary}
              onChange={e => setCompareToSalary(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-400">
              Сколько вы хотели бы получать как зарплату — для сравнения с дивидендами
            </p>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`rounded-xl border p-4 ${rec.color}`}>
        <p className="font-medium">{rec.text}</p>
      </div>

      {/* Result cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Дивидент на ръка', value: result.dividendNet, color: 'text-green-600' },
          { label: 'Заплата на ръка', value: result.salaryNet, color: 'text-blue-600' },
          { label: 'КНП + дивид. данък', value: result.corporateTax + result.dividendTax, color: 'text-red-500' },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className={`text-xl font-bold ${item.color}`}>{item.value.toFixed(2)} €</div>
            <div className="mt-1 text-xs text-slate-400">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <span className="text-sm font-medium text-slate-700">Разбивка</span>
        </div>
        <div className="divide-y divide-slate-50">
          {result.breakdown.map((row, i) =>
            row.separator ? (
              <div key={i} className="h-2 bg-slate-50" />
            ) : (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <span className="text-sm text-slate-700">{row.label}</span>
                  {row.note && <span className="ml-2 text-xs text-slate-400">{row.note}</span>}
                </div>
                <span className={`text-sm font-medium ${row.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {row.amount >= 0 ? '+' : ''}{row.amount.toFixed(2)} €
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Warning */}
      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
        ⚠ Дивиденты нельзя выплачивать если у ООД есть непокрытые убытки прошлых лет (ЗКПО чл. 247).
        Также убедитесь что нет задолженности по налогам перед НАП.
      </div>
    </div>
  )
}
