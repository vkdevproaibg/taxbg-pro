import { useState } from 'react'
import { format } from 'date-fns'
import { useAccountingStore } from '../../store/accountingStore'
import { useUserStore } from '../../store/userStore'
import { exportTransactionsCsv } from '../../lib/csvExport'

export default function ExportPanel() {
  const transactions = useAccountingStore(s => s.transactions)
  const companyName  = useUserStore(s => s.companyName)
  const year         = new Date().getFullYear()
  const [from, setFrom] = useState(`${year}-01-01`)
  const [to,   setTo  ] = useState(format(new Date(), 'yyyy-MM-dd'))

  const count = transactions.filter(t => t.date >= from && t.date <= to).length

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-medium text-slate-700">Експорт на транзакции</h3>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-400">От</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">До</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
          />
        </div>
        <button
          onClick={() => exportTransactionsCsv(transactions, from, to, companyName)}
          disabled={count === 0}
          className="rounded-lg bg-slate-800 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40">
          Изтегли CSV ({count})
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Открывается в Excel и Google Sheets · кодировка UTF-8 · разделитель ;
      </p>
    </div>
  )
}
