import { useAccountingStore } from '../../store/accountingStore'
import type { Transaction } from '../../store/accountingStore'

const TYPE_META: Record<string, { label: string; color: string; income: boolean }> = {
  income:     { label: 'Приход',        color: 'bg-green-50 text-green-700',   income: true  },
  vat_out:    { label: 'Продажба+ДДС',  color: 'bg-green-50 text-green-700',   income: true  },
  appstore:   { label: 'App Store',     color: 'bg-blue-50 text-blue-700',     income: true  },
  googleplay: { label: 'Google Play',   color: 'bg-blue-50 text-blue-700',     income: true  },
  stripe:     { label: 'Stripe',        color: 'bg-blue-50 text-blue-700',     income: true  },
  expense:    { label: 'Разход',        color: 'bg-red-50 text-red-600',       income: false },
  vat_in:     { label: 'Покупка+ДДС',  color: 'bg-red-50 text-red-600',       income: false },
  salary:     { label: 'Заплата',       color: 'bg-orange-50 text-orange-600', income: false },
  dividend:   { label: 'Дивидент',      color: 'bg-purple-50 text-purple-600', income: false },
  refund:     { label: 'Refund',        color: 'bg-slate-50 text-slate-500',   income: false },
  asset_purchase: { label: 'Покупка ОС',   color: 'bg-slate-50 text-slate-600',   income: false },
  depreciation:   { label: 'Амортизация',  color: 'bg-slate-50 text-slate-500',   income: false },
  vehicle_tax:    { label: 'Данък МПС',    color: 'bg-amber-50 text-amber-600',   income: false },
  vehicle_expense:{ label: 'Разход МПС',  color: 'bg-orange-50 text-orange-600', income: false },
}

function TxRow({ tx, onDelete }: { tx: Transaction; onDelete: (id: string) => void }) {
  const meta = TYPE_META[tx.type] ?? { label: tx.type, color: 'bg-slate-50 text-slate-600', income: true }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3">
      <div className="min-w-[90px] shrink-0 text-xs text-slate-400">{tx.date}</div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
        {meta.label}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-slate-700">{tx.description}</div>
        {tx.counterparty && (
          <div className="truncate text-xs text-slate-400">{tx.counterparty}</div>
        )}
        {(tx.assetName || tx.municipality) && (
          <div className="text-xs text-slate-400 truncate">
            {tx.assetName}{tx.municipality ? ` · ${tx.municipality}` : ''}
            {tx.deductiblePercent !== undefined
              ? ` · признат ${tx.deductiblePercent * 100}%`
              : ''}
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className={`text-sm font-medium ${meta.income ? 'text-green-700' : 'text-red-600'}`}>
          {meta.income ? '+' : '−'}{tx.amount.toFixed(2)} €
        </div>
        {tx.vatAmount ? (
          <div className="text-xs text-slate-400">ДДС: {tx.vatAmount.toFixed(2)} €</div>
        ) : null}
      </div>
      <button onClick={() => onDelete(tx.id)}
        className="ml-1 shrink-0 text-lg leading-none text-slate-300 hover:text-red-400">
        ×
      </button>
    </div>
  )
}

export default function TransactionList() {
  const { transactions, deleteTransaction } = useAccountingStore()

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
        Все още няма транзакции. Добавете ръчно или импортирайте от платформа.
      </div>
    )
  }

  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-2">
      {sorted.map((tx) => (
        <TxRow key={tx.id} tx={tx} onDelete={deleteTransaction} />
      ))}
    </div>
  )
}
