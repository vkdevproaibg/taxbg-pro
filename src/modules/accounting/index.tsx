import { useAccountingStore } from '../../store/accountingStore'
import { useT } from '../../lib/useT'
import AddTransaction from './AddTransaction'
import TransactionList from './TransactionList'
import VehicleGuide from './VehicleGuide'
import ExportPanel from './ExportPanel'

export default function AccountingModule() {
  const t = useT()
  const transactions = useAccountingStore((s) => s.transactions)

  const totalIn = transactions
    .filter((t) => ['income', 'vat_out', 'appstore', 'googleplay', 'stripe'].includes(t.type))
    .reduce((s, t) => s + t.amount, 0)

  const totalOut = transactions
    .filter((t) => ['expense', 'vat_in', 'salary', 'dividend', 'depreciation', 'vehicle_tax', 'vehicle_expense'].includes(t.type))
    .reduce((s, t) => {
      if (t.type === 'vehicle_expense') {
        return s + t.amount * (t.deductiblePercent ?? 0.5)
      }
      return s + t.amount
    }, 0)

  return (
    <div className="space-y-5 p-6">
      <h1 className="text-2xl font-semibold">{t('page_accounting')}</h1>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('label_income'),  value: totalIn,            color: 'text-green-600' },
          { label: t('label_expense'), value: totalOut,           color: 'text-red-500'   },
          { label: t('label_result'),  value: totalIn - totalOut, color: totalIn - totalOut >= 0 ? 'text-violet-600' : 'text-red-600' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className={`text-xl font-bold ${item.color}`}>{item.value.toFixed(2)} €</div>
            <div className="mt-1 text-xs text-slate-400">{item.label}</div>
          </div>
        ))}
      </div>

      <VehicleGuide />

      <AddTransaction />
      <TransactionList />
      <ExportPanel />
    </div>
  )
}
