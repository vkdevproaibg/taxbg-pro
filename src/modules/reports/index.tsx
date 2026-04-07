import { useState } from 'react'
import { useReports } from './useReports'
import DeclarationDDS from './forms/DeclarationDDS'
import DeclarationZKPO from './forms/DeclarationZKPO'
import DeadlineGuide from './DeadlineGuide'

const TABS = [
  { id: 'dds',  label: 'ДДС декларация',  sub: 'Месечна · до 14-то' },
  { id: 'zkpo', label: 'ЗКПО декларация', sub: 'Годишна · до 30 април' },
] as const

export default function ReportsModule() {
  const [tab, setTab] = useState<'dds' | 'zkpo'>('dds')
  const r = useReports()

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Отчети и декларации</h1>
        <p className="mt-1 text-sm text-slate-400">
          Данните се попълват автоматично от бухгалтерията · ръчна корекция на всяко поле
        </p>
      </div>

      <DeadlineGuide />

      {/* Shared identifiers */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-400">ЕИК на фирмата</label>
          <input value={r.eik} onChange={e => r.setEik(e.target.value)}
            placeholder="123456789"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">ДДС номер</label>
          <input value={r.vatNumber} onChange={e => r.setVatNumber(e.target.value)}
            placeholder="BG123456789"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Месец (ДДС)</label>
          <input type="month" value={r.selectedMonth}
            onChange={e => r.setSelectedMonth(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Година (ЗКПО)</label>
          <input type="number" value={r.selectedYear} min={2026}
            onChange={e => r.setSelectedYear(Number(e.target.value))}
            className="w-24 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm transition-colors ${
              tab === t.id ? 'bg-white font-medium shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
            <span className="ml-1 text-xs text-slate-400">{t.sub}</span>
          </button>
        ))}
      </div>

      {tab === 'dds'  && <DeclarationDDS  data={r.ddsData} />}
      {tab === 'zkpo' && <DeclarationZKPO data={r.zkpoData} />}
    </div>
  )
}
