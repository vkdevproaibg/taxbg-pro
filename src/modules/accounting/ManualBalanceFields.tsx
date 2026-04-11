import { useJournalStore } from '../../store/journalStore'
import { format } from 'date-fns'

export default function ManualBalanceFields() {
  const {
    bankBalance, bankBalanceDate,
    debtorsBalance, creditorsBalance, capitalAmount,
    setBankBalance, setDebtorsBalance,
    setCreditorsBalance, setCapitalAmount,
  } = useJournalStore()

  return (
    <div className="rounded-xl shadow-sm overflow-hidden"
      style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>

      {/* Header */}
      <div className="px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}>
          Данные для баланса — вводятся вручную
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Берутся из банковской выписки и актов сверки с контрагентами
        </p>
      </div>

      <div className="p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Bank balance */}
        <div>
          <label className="mb-1 block text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}>
            Остаток на банковском счёте (€)
          </label>
          <input
            type="number"
            step="0.01"
            value={bankBalance}
            onChange={(e) => setBankBalance(Number(e.target.value), format(new Date(), 'yyyy-MM-dd'))}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Взять из онлайн-банкинга · актуально на {bankBalanceDate || 'не указано'}
          </p>
        </div>

        {/* Capital */}
        <div>
          <label className="mb-1 block text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}>
            Уставный капитал (€)
          </label>
          <input
            type="number"
            step="0.01"
            value={capitalAmount}
            onChange={(e) => setCapitalAmount(Number(e.target.value))}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Минимум для ООД: 1.02 € · обычно 1 000–10 000 €
          </p>
        </div>

        {/* Debtors */}
        <div>
          <label className="mb-1 block text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}>
            Дебиторска задолженост — клиенти (€)
          </label>
          <input
            type="number"
            step="0.01"
            value={debtorsBalance}
            onChange={(e) => setDebtorsBalance(Number(e.target.value))}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Клиенты которым выставлена фактура но оплата ещё не поступила
          </p>
        </div>

        {/* Creditors */}
        <div>
          <label className="mb-1 block text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}>
            Кредиторска задолженост — доставчици (€)
          </label>
          <input
            type="number"
            step="0.01"
            value={creditorsBalance}
            onChange={(e) => setCreditorsBalance(Number(e.target.value))}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Поставщики которым мы должны но ещё не заплатили
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pb-4">
        <div className="rounded-xl p-3"
          style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
          <p className="text-xs" style={{ color: 'var(--accent-text)' }}>
            💡 Эти данные нельзя получить автоматически — они хранятся в банке и у контрагентов.
            Обновляйте в конце каждого месяца перед формированием баланса.
            Остаток на счёте: берите из банковской выписки.
            Задолженности: из актов сверки или реестра фактур.
          </p>
        </div>
      </div>
    </div>
  )
}
