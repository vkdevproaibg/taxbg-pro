import { useAccountingStore } from '../../store/accountingStore'

const PLATFORM_TYPES = ['appstore', 'googleplay', 'stripe', 'refund']

const PLATFORM_META: Record<string, { label: string; logo: string }> = {
  appstore: { label: 'App Store', logo: '🍎' },
  googleplay: { label: 'Google Play', logo: '▶' },
  stripe: { label: 'Stripe', logo: '💳' },
  refund: { label: 'Refund', logo: '↩' },
}

export default function PlatformHistory() {
  const { transactions, deleteTransaction } = useAccountingStore()

  const platformTxs = [...transactions]
    .filter((t) => PLATFORM_TYPES.includes(t.type))
    .sort((a, b) => b.date.localeCompare(a.date))

  const byMonth = platformTxs.reduce<Record<string, typeof platformTxs>>((acc, tx) => {
    const month = tx.date.slice(0, 7)
    if (!acc[month]) acc[month] = []
    acc[month].push(tx)
    return acc
  }, {})

  if (platformTxs.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
        История на импортите
      </h2>
      {Object.entries(byMonth)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, txs]) => {
          const net = txs.reduce((s, t) => s + (t.type === 'refund' ? -t.amount : t.amount), 0)
          return (
            <div
              key={month}
              className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-700">{month}</span>
                <span className={`text-sm font-bold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {net >= 0 ? '+' : ''}
                  {net.toFixed(2)} €
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {txs.map((tx) => {
                  const meta = PLATFORM_META[tx.type] ?? { label: tx.type, logo: '·' }
                  return (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-6 text-center text-base">{meta.logo}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-slate-700">{tx.description}</div>
                        <div className="text-xs text-slate-400">
                          {tx.date} · {meta.label}
                        </div>
                      </div>
                      <div
                        className={`shrink-0 text-sm font-medium ${tx.type === 'refund' ? 'text-red-500' : 'text-green-600'}`}
                      >
                        {tx.type === 'refund' ? '−' : '+'}
                        {tx.amount.toFixed(2)} €
                      </div>
                      <button
                        onClick={() => deleteTransaction(tx.id)}
                        className="ml-1 text-lg leading-none text-slate-300 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
    </div>
  )
}
