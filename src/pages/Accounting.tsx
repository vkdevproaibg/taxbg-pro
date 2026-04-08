import { useMemo, useState } from 'react'
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useUserStore } from '../store/userStore'
import { useAccountingStore } from '../store/accountingStore'
import { useJournalStore } from '../store/journalStore'
import { transactionToJournalEntry, createVatJournalEntry } from '../lib/journalAI'
import AddTransaction from '../modules/accounting/AddTransaction'
import TransactionList from '../modules/accounting/TransactionList'
import ExportPanel from '../modules/accounting/ExportPanel'
import HelpButton from '../components/ui/HelpButton'
import { CHART_OF_ACCOUNTS, CLASS_LABELS } from '../constants/chartOfAccounts'

type AccountingTab =
  | 'income'
  | 'expense'
  | 'ledger'
  | 'opr'
  | 'balance'
  | 'reports'
  | 'documents'

const TABS: { id: AccountingTab; label: string; labelRu: string }[] = [
  { id: 'income', label: 'Доходи', labelRu: 'Доходи' },
  { id: 'expense', label: 'Разходи', labelRu: 'Разходи' },
  { id: 'ledger', label: 'Главна книга', labelRu: 'Главна книга' },
  { id: 'opr', label: 'ОПР', labelRu: 'ОПР' },
  { id: 'balance', label: 'Баланс', labelRu: 'Баланс' },
  { id: 'reports', label: 'Справки', labelRu: 'Справки НАП' },
  { id: 'documents', label: 'Документи', labelRu: 'Документи' },
]

export default function Accounting() {
  const [tab, setTab] = useState<AccountingTab>('income')

  return (
    <div className="flex h-full flex-col">
      <div
        className="border-b px-6 pt-4"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-card)' }}
      >
        <h1 className="mb-3 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Счетоводство
        </h1>
        <div className="flex gap-1 overflow-x-auto pb-px">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                backgroundColor: 'transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'income' && <IncomeTab />}
        {tab === 'expense' && <ExpenseTab />}
        {tab === 'ledger' && <LedgerTab />}
        {['opr', 'balance', 'reports', 'documents'].includes(tab) && (
          <ComingSoonTab label={TABS.find((t) => t.id === tab)!.labelRu} />
        )}
      </div>
    </div>
  )
}

function ComingSoonTab({ label }: { label: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center p-6">
      <div className="mb-3 text-4xl">🚧</div>
      <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
        {label}
      </p>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
        В разработке · будет готово в следующей сессии
      </p>
    </div>
  )
}

function PeriodNav({ currentDate, onChange }: { currentDate: Date; onChange: (d: Date) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(subMonths(currentDate, 1))}
        className="rounded-lg border px-3 py-1.5 text-sm"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--surface-card)',
        }}
      >
        ←
      </button>
      <span className="min-w-[120px] text-center text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
        {format(currentDate, 'LLLL yyyy', { locale: ru })}
      </span>
      <button
        onClick={() => onChange(addMonths(currentDate, 1))}
        className="rounded-lg border px-3 py-1.5 text-sm"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--surface-card)',
        }}
      >
        →
      </button>
      <button
        onClick={() => onChange(new Date())}
        className="rounded-lg border px-3 py-1.5 text-xs"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--text-muted)',
          backgroundColor: 'var(--surface-card)',
        }}
      >
        Сейчас
      </button>
    </div>
  )
}

function IncomeTab() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const transactions = useAccountingStore((s) => s.transactions)
  const { addEntry, entries } = useJournalStore()
  const hasVat = useUserStore((s) => s.hasVat)

  const from = format(startOfMonth(currentDate), 'yyyy-MM-dd')
  const to = format(endOfMonth(currentDate), 'yyyy-MM-dd')

  const incomeTx = useMemo(
    () =>
      transactions.filter(
        (t) =>
          ['income', 'vat_out', 'appstore', 'googleplay', 'stripe', 'refund'].includes(t.type) &&
          t.date >= from &&
          t.date <= to
      ),
    [transactions, from, to]
  )

  const totalIncome = incomeTx.filter((t) => t.type !== 'refund').reduce((s, t) => s + t.amount, 0)
  const totalRefund = incomeTx.filter((t) => t.type === 'refund').reduce((s, t) => s + t.amount, 0)
  const vatCollected = incomeTx
    .filter((t) => t.type === 'vat_out')
    .reduce((s, t) => s + (t.vatAmount ?? 0), 0)

  const breakdown = [
    { label: 'B2B услуги (без ДДС)', types: ['income'], color: 'var(--accent)' },
    { label: 'Продажби с ДДС', types: ['vat_out'], color: 'var(--accent)' },
    { label: 'App Store', types: ['appstore'], color: '#3b82f6' },
    { label: 'Google Play', types: ['googleplay'], color: '#3b82f6' },
    { label: 'Stripe / PSP', types: ['stripe'], color: '#8b5cf6' },
    { label: 'Refund (-)', types: ['refund'], color: 'var(--danger)' },
  ]
    .map((row) => ({
      ...row,
      amount: incomeTx
        .filter((t) => row.types.includes(t.type))
        .reduce((s, t) => s + (row.types.includes('refund') ? -t.amount : t.amount), 0),
    }))
    .filter((row) => row.amount !== 0)

  const autoCreateJournal = (txId: string) => {
    const tx = transactions.find((t) => t.id === txId)
    if (!tx) return
    if (entries.some((e) => e.linkedTransactionId === txId)) return

    const entry = transactionToJournalEntry(tx)
    if (entry) addEntry(entry)

    const vatEntry = createVatJournalEntry(tx)
    if (vatEntry) addEntry(vatEntry)
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Доходи
          </h2>
          <HelpButton topic="ЗДДС чл. 66 ЗКПО чл. 78 приходи от услуги" title="Доходи" pageContext="accounting-income" />
        </div>
        <PeriodNav currentDate={currentDate} onChange={setCurrentDate} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div
          className="col-span-2 rounded-xl p-4 shadow-sm sm:col-span-1"
          style={{ backgroundColor: 'var(--accent-light)', border: '1.5px solid var(--accent)' }}
        >
          <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
            {(totalIncome - totalRefund).toFixed(2)} €
          </div>
          <div className="mt-1 text-xs font-medium" style={{ color: 'var(--accent-text)' }}>
            Нетни приходи
          </div>
        </div>
        {hasVat && (
          <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
            <div className="text-xl font-bold" style={{ color: 'var(--danger)' }}>
              {vatCollected.toFixed(2)} €
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              ДДС начислено
            </div>
          </div>
        )}
        <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {incomeTx.length}
          </div>
          <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Транзакции
          </div>
        </div>
      </div>

      {breakdown.length > 0 && (
        <div className="overflow-hidden rounded-xl shadow-sm" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Разбивка по източници
            </span>
          </div>
          {breakdown.map((row) => (
            <div key={row.label} className="flex items-center justify-between border-b px-4 py-3 last:border-0" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {row.label}
              </span>
              <span className="text-sm font-semibold" style={{ color: row.color }}>
                {row.amount > 0 ? '+' : ''}
                {row.amount.toFixed(2)} €
              </span>
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Добавить приход
        </h3>
        <AddTransaction
          defaultTypes={['income', 'vat_out', 'appstore', 'googleplay', 'stripe', 'refund']}
          onAdd={(txId) => autoCreateJournal(txId)}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Транзакции за периода ({incomeTx.length})
        </h3>
        <TransactionList
          filterFrom={from}
          filterTo={to}
          filterTypes={['income', 'vat_out', 'appstore', 'googleplay', 'stripe', 'refund']}
        />
      </div>

      <ExportPanel />
    </div>
  )
}

function ExpenseTab() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const transactions = useAccountingStore((s) => s.transactions)
  const { addEntry, entries } = useJournalStore()
  const hasVat = useUserStore((s) => s.hasVat)
  const hasEmployees = useUserStore((s) => s.hasEmployees)

  const from = format(startOfMonth(currentDate), 'yyyy-MM-dd')
  const to = format(endOfMonth(currentDate), 'yyyy-MM-dd')

  const expenseTx = useMemo(
    () =>
      transactions.filter(
        (t) =>
          ['expense', 'vat_in', 'salary', 'dividend', 'depreciation', 'vehicle_tax', 'vehicle_expense', 'asset_purchase'].includes(t.type) &&
          t.date >= from &&
          t.date <= to
      ),
    [transactions, from, to]
  )

  const totalExpenses = expenseTx.reduce((s, t) => {
    if (t.type === 'vehicle_expense') return s + t.amount * (t.deductiblePercent ?? 0.5)
    if (t.type === 'asset_purchase') return s
    return s + t.amount
  }, 0)

  const vatDeductible = expenseTx
    .filter((t) => t.type === 'vat_in')
    .reduce((s, t) => s + (t.vatAmount ?? 0), 0)

  const breakdown = [
    { label: 'Услуги и наём (без ДДС)', types: ['expense'], account: '602' },
    { label: 'Покупки с данъчен кредит', types: ['vat_in'], account: '602' },
    { label: 'Заплати', types: ['salary'], account: '604' },
    { label: 'Дивиденти', types: ['dividend'], account: '493' },
    { label: 'Амортизация', types: ['depreciation'], account: '603' },
    { label: 'Разход МПС', types: ['vehicle_expense'], account: '602' },
    { label: 'Данък МПС', types: ['vehicle_tax'], account: '606' },
    { label: 'Покупка ОС (актив)', types: ['asset_purchase'], account: '205' },
  ]
    .map((row) => ({
      ...row,
      amount: expenseTx.filter((t) => row.types.includes(t.type)).reduce((s, t) => {
        if (t.type === 'vehicle_expense') return s + t.amount * (t.deductiblePercent ?? 0.5)
        return s + t.amount
      }, 0),
    }))
    .filter((row) => row.amount > 0)

  const autoCreateJournal = (txId: string) => {
    const tx = transactions.find((t) => t.id === txId)
    if (!tx) return
    if (entries.some((e) => e.linkedTransactionId === txId)) return

    const entry = transactionToJournalEntry(tx)
    if (entry) addEntry(entry)
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Разходи
          </h2>
          <HelpButton topic="ЗКПО чл. 26 непризнаваеми разходи данъчна основа" title="Разходи" pageContext="accounting-expense" />
          {hasEmployees && (
            <span className="rounded-lg px-2 py-1 text-xs" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-text)' }}>
              Има служители
            </span>
          )}
        </div>
        <PeriodNav currentDate={currentDate} onChange={setCurrentDate} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div
          className="col-span-2 rounded-xl p-4 shadow-sm sm:col-span-1"
          style={{ backgroundColor: 'var(--danger-light)', border: '1.5px solid var(--danger)' }}
        >
          <div className="text-2xl font-bold" style={{ color: 'var(--danger)' }}>
            {totalExpenses.toFixed(2)} €
          </div>
          <div className="mt-1 text-xs font-medium" style={{ color: 'var(--danger-text)' }}>
            Признати разходи
          </div>
        </div>
        {hasVat && (
          <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
            <div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
              {vatDeductible.toFixed(2)} €
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Данъчен кредит ДДС
            </div>
          </div>
        )}
        <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {expenseTx.length}
          </div>
          <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Транзакции
          </div>
        </div>
      </div>

      {breakdown.length > 0 && (
        <div className="overflow-hidden rounded-xl shadow-sm" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Разбивка по видове разходи
            </span>
          </div>
          {breakdown.map((row) => (
            <div key={row.label} className="flex items-center justify-between border-b px-4 py-3 last:border-0" style={{ borderColor: 'var(--border)' }}>
              <div>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {row.label}
                </span>
                <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  сч. {row.account}
                </span>
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
                {row.amount.toFixed(2)} €
              </span>
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Добавить разход
        </h3>
        <AddTransaction
          defaultTypes={['expense', 'vat_in', 'salary', 'dividend', 'depreciation', 'vehicle_tax', 'vehicle_expense', 'asset_purchase']}
          onAdd={(txId) => autoCreateJournal(txId)}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Транзакции за периода ({expenseTx.length})
        </h3>
        <TransactionList
          filterFrom={from}
          filterTo={to}
          filterTypes={['expense', 'vat_in', 'salary', 'dividend', 'depreciation', 'vehicle_tax', 'vehicle_expense', 'asset_purchase']}
        />
      </div>

      <ExportPanel />
    </div>
  )
}

function LedgerTab() {
  const { entries, getAccountBalance } = useJournalStore()
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [filterClass, setFilterClass] = useState<number | 'all'>('all')

  const filteredAccounts = CHART_OF_ACCOUNTS.filter((a) => {
    if (filterClass !== 'all' && a.class !== filterClass) return false
    const balance = getAccountBalance(a.code)
    return balance !== 0 || entries.some((e) => e.debitAccount === a.code || e.creditAccount === a.code)
  })

  const accountEntries = selectedAccount
    ? entries
        .filter((e) => e.debitAccount === selectedAccount || e.creditAccount === selectedAccount)
        .sort((a, b) => b.date.localeCompare(a.date))
    : []

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Главна книга
        </h2>
        <HelpButton topic="двустранно счетоводство главна книга сметкоплан" title="Главна книга" pageContext="accounting-ledger" />
      </div>

      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Двустранно счетоводство · Национален сметкоплан на България
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterClass('all')}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            backgroundColor: filterClass === 'all' ? 'var(--accent)' : 'var(--surface-card)',
            color: filterClass === 'all' ? '#fff' : 'var(--text-secondary)',
            borderColor: filterClass === 'all' ? 'var(--accent)' : 'var(--border)',
          }}
        >
          Всички
        </button>
        {Object.entries(CLASS_LABELS).map(([cls, label]) => (
          <button
            key={cls}
            onClick={() => setFilterClass(Number(cls))}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: filterClass === Number(cls) ? 'var(--accent)' : 'var(--surface-card)',
              color: filterClass === Number(cls) ? '#fff' : 'var(--text-secondary)',
              borderColor: filterClass === Number(cls) ? 'var(--accent)' : 'var(--border)',
            }}
          >
            Кл. {cls} · {label}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Нет проводок. Добавьте доходы или расходы - проводки создадутся автоматически.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl shadow-sm" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Сч.', 'Наименование', 'Дебит', 'Кредит', 'Сальдо'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((account) => {
                const debitTotal = entries.filter((e) => e.debitAccount === account.code).reduce((s, e) => s + e.amount, 0)
                const creditTotal = entries.filter((e) => e.creditAccount === account.code).reduce((s, e) => s + e.amount, 0)
                const balance = getAccountBalance(account.code)

                return (
                  <tr
                    key={account.code}
                    className="cursor-pointer border-b transition-opacity hover:opacity-80"
                    style={{
                      borderColor: 'var(--border)',
                      backgroundColor: selectedAccount === account.code ? 'var(--accent-light)' : 'var(--surface-card)',
                    }}
                    onClick={() => setSelectedAccount(selectedAccount === account.code ? null : account.code)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium" style={{ color: 'var(--accent)' }}>
                      {account.code}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                      <div className="font-medium">{account.name_ru}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {account.name_bg}
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {debitTotal > 0 ? `${debitTotal.toFixed(2)} €` : '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {creditTotal > 0 ? `${creditTotal.toFixed(2)} €` : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: balance >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                      {balance.toFixed(2)} €
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedAccount && accountEntries.length > 0 && (
        <div className="overflow-hidden rounded-xl shadow-sm" style={{ border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Обороты по счёту {selectedAccount} · {CHART_OF_ACCOUNTS.find((a) => a.code === selectedAccount)?.name_ru}
            </span>
            <button onClick={() => setSelectedAccount(null)} className="text-lg" style={{ color: 'var(--text-muted)' }}>
              ×
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {accountEntries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 px-4 py-3" style={{ backgroundColor: 'var(--surface-card)' }}>
                <span className="mt-0.5 shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {entry.date}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {entry.description}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Дт {entry.debitAccount} / Кт {entry.creditAccount}
                    {entry.counterparty && ` · ${entry.counterparty}`}
                  </p>
                </div>
                <span
                  className="shrink-0 text-sm font-medium"
                  style={{ color: entry.debitAccount === selectedAccount ? 'var(--accent)' : 'var(--danger)' }}
                >
                  {entry.debitAccount === selectedAccount ? '+' : '−'}
                  {entry.amount.toFixed(2)} €
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
