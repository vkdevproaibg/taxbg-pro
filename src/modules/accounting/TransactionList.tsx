import { useAccountingStore } from '../../store/accountingStore'
import type { Transaction } from '../../store/accountingStore'
import { useCompanyRole } from '../../hooks/useCompanyRole'
import { useAuthStore } from '../../store/authStore'
import { useMemo, useState } from 'react'
import { useT } from '../../lib/useT'
import { useUserStore } from '../../store/userStore'

interface Props {
  filterFrom?: string
  filterTo?: string
  filterTypes?: string[]
}

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

function TxRow({
  tx,
  onDelete,
  showApprovalBadge,
  onApprove,
  onReject,
  canApprove,
  canEdit,
}: {
  tx: Transaction
  onDelete: (id: string) => void
  showApprovalBadge?: boolean
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  canApprove?: boolean
  canEdit?: boolean
}) {
  const meta = TYPE_META[tx.type] ?? { label: tx.type, color: 'bg-slate-50 text-slate-600', income: true }

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
      tx.status === 'pending_approval'
        ? 'border-amber-200 bg-amber-50'
        : tx.status === 'rejected'
        ? 'border-red-200 bg-red-50'
        : 'border-slate-100 bg-white'
    }`}>
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
        {tx.status === 'rejected' && tx.rejectionNote && (
          <div className="mt-0.5 text-xs text-red-600">
            ✗ {tx.rejectionNote}
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
        {showApprovalBadge && tx.status === 'approved' && (
          <span className="mt-0.5 block text-xs text-green-600">✓</span>
        )}
      </div>

      {/* Approval action buttons */}
      {tx.status === 'pending_approval' && canApprove && onApprove && onReject && (
        <div className="shrink-0 flex gap-1.5">
          <button
            onClick={() => onApprove(tx.id)}
            className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
          >
            ✓
          </button>
          <button
            onClick={() => onReject(tx.id)}
            className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
          >
            ✗
          </button>
        </div>
      )}

      <button onClick={() => onDelete(tx.id)}
        className="ml-1 shrink-0 text-lg leading-none text-slate-300 hover:text-red-400">
        ×
      </button>
    </div>
  )
}

export default function TransactionList({ filterFrom, filterTo, filterTypes }: Props = {}) {
  const { transactions, deleteTransaction, approveTransaction, rejectTransaction } = useAccountingStore()
  const { canApprove, needsApproval } = useCompanyRole()
  const profile = useAuthStore((s) => s.profile)
  const language = useUserStore((s) => s.language)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const LABELS = {
    pending_section: { ru: 'На утверждение', en: 'Awaiting approval', bg: 'Чака одобрение', uk: 'На затвердження' },
    approve:         { ru: 'Одобрить', en: 'Approve', bg: 'Одобри', uk: 'Схвалити' },
    reject:          { ru: 'Отклонить', en: 'Reject', bg: 'Отхвърли', uk: 'Відхилити' },
    rejected_badge:  { ru: 'Отклонена', en: 'Rejected', bg: 'Отхвърлена', uk: 'Відхилено' },
    pending_badge:   { ru: 'Ожидает', en: 'Pending', bg: 'Чака', uk: 'Очікує' },
    reject_reason:   { ru: 'Причина отклонения', en: 'Rejection reason', bg: 'Причина за отхвърляне', uk: 'Причина відхилення' },
    confirm:         { ru: 'Подтвердить', en: 'Confirm', bg: 'Потвърди', uk: 'Підтвердити' },
    cancel:          { ru: 'Отмена', en: 'Cancel', bg: 'Отмени', uk: 'Скасувати' },
    empty:           { ru: 'Нет транзакций', en: 'No transactions yet', bg: 'Все още няма транзакции. Добавете ръчно или импортирайте от платформа.', uk: 'Немає транзакцій' },
  } as const

  const l = (key: keyof typeof LABELS) => LABELS[key][language as keyof typeof LABELS[typeof key]] ?? LABELS[key]['bg']

  const handleApprove = (id: string) => {
    if (profile?.id) approveTransaction(id, profile.id)
  }

  const handleRejectConfirm = () => {
    if (rejectTarget && profile?.id) {
      rejectTransaction(rejectTarget, rejectNote.trim() || '—', profile.id)
      setRejectTarget(null)
      setRejectNote('')
    }
  }

  const pending  = useMemo(() => transactions.filter((t) => t.status === 'pending_approval'), [transactions])
  const rejected = useMemo(() => transactions.filter((t) => t.status === 'rejected'), [transactions])

  const sorted = useMemo(() => {
    let list = transactions.filter((t) => t.status !== 'pending_approval' && t.status !== 'rejected')
    if (filterFrom) list = list.filter((t) => t.date >= filterFrom)
    if (filterTo)   list = list.filter((t) => t.date <= filterTo)
    if (filterTypes) list = list.filter((t) => filterTypes.includes(t.type))
    return list.sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, filterFrom, filterTo, filterTypes])

  const isEmpty = pending.length === 0 && rejected.length === 0 && sorted.length === 0

  if (isEmpty) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
        {l('empty')}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Pending approval section — only visible to approvers when workflow is active */}
      {canApprove && needsApproval && pending.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              {pending.length} · {l('pending_section')}
            </span>
          </div>
          {pending.map((tx) => (
            <TxRow
              key={tx.id}
              tx={tx}
              onDelete={deleteTransaction}
              canApprove={canApprove}
              onApprove={handleApprove}
              onReject={(id) => { setRejectTarget(id); setRejectNote('') }}
            />
          ))}
        </div>
      )}

      {/* Rejected transactions */}
      {rejected.length > 0 && (
        <div className="space-y-2">
          {rejected.map((tx) => (
            <TxRow
              key={tx.id}
              tx={tx}
              onDelete={deleteTransaction}
              showApprovalBadge={needsApproval}
            />
          ))}
        </div>
      )}

      {/* Normal (approved / legacy) transactions */}
      <div className="space-y-2">
        {sorted.map((tx) => (
          <TxRow
            key={tx.id}
            tx={tx}
            onDelete={deleteTransaction}
            showApprovalBadge={needsApproval}
          />
        ))}
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="font-semibold text-slate-800">{l('reject_reason')}</h3>
            <textarea
              autoFocus
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none resize-none"
              placeholder="…"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRejectTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                {l('cancel')}
              </button>
              <button
                onClick={handleRejectConfirm}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                {l('reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
