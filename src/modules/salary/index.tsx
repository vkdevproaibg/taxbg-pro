import { useState } from 'react'
import { useSalary } from './useSalary'
import { TAX_RATES_2026 } from '../../constants/tax-rates-2026'

export default function SalaryModule() {
  const min = TAX_RATES_2026.minWage.value
  const max = TAX_RATES_2026.maxOsig.value
  const [gross, setGross] = useState<number>(min)
  const result = useSalary(gross)

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Заплатен калкулатор</h1>
        <p className="mt-1 text-sm text-slate-400">
          Трудов договор · ставки 2026 · мин. {min} € · макс. осигуровки от {max} €
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <label className="block text-xs text-slate-400">Брутна заплата (€)</label>
        <input
          type="number"
          value={gross}
          min={min}
          step={50}
          onChange={e => setGross(Math.max(min, Number(e.target.value)))}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
        />
        <input
          type="range"
          value={gross}
          min={min}
          max={5000}
          step={50}
          onChange={e => setGross(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>МРЗ {min} €</span>
          <span>5 000 €</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Нетна заплата', value: result.net, color: 'text-green-600' },
          { label: 'Общ разход', value: result.totalCost, color: 'text-red-500' },
          { label: 'Осигуровки работник', value: result.employeeContrib, color: 'text-orange-500' },
          { label: 'Осигуровки работодател', value: result.employerContrib, color: 'text-orange-400' },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className={`text-xl font-bold ${item.color}`}>{item.value.toFixed(2)} €</div>
            <div className="mt-1 text-xs text-slate-400">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <span className="text-sm font-medium text-slate-700">Разбивка</span>
        </div>
        <div className="divide-y divide-slate-50">
          {result.breakdown
            .filter(r => r.amount !== 0 || r.label.startsWith('─'))
            .map((row, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-4 py-2.5 ${row.label.startsWith('─') ? 'bg-slate-50' : ''}`}
              >
                <div>
                  <span className="text-sm text-slate-700">{row.label.startsWith('─') ? '' : row.label}</span>
                  {row.rate && <span className="ml-2 text-xs text-slate-400">{row.rate}</span>}
                  {row.source && <span className="ml-1 text-xs text-slate-300">· {row.source}</span>}
                </div>
                {!row.label.startsWith('─') && (
                  <span className={`text-sm font-medium ${row.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.amount >= 0 ? '+' : ''}
                    {row.amount.toFixed(2)} €
                  </span>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
