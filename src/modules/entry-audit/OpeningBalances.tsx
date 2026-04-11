import { useState } from 'react'
import { useJournalStore } from '../../store/journalStore'
import { useEntryAuditStore } from '../../store/entryAuditStore'

interface Asset {
  id: string
  name: string
  purchaseDate: string
  purchasePrice: number
  residualValue: number
  type: 'computer' | 'vehicle' | 'furniture' | 'other'
}

export default function OpeningBalances({ onComplete }: { onComplete: () => void }) {
  const {
    setBankBalance, setDebtorsBalance,
    setCreditorsBalance, setCapitalAmount,
  } = useJournalStore()
  const { entryDate } = useEntryAuditStore()

  const [bankBal,          setBankBal]          = useState(0)
  const [debtors,          setDebtors]          = useState(0)
  const [creditors,        setCreditors]        = useState(0)
  const [capital,          setCapital]          = useState(102)
  const [vatPayable,       setVatPayable]       = useState(0)
  const [salaries,         setSalaries]         = useState(0)
  const [retainedEarnings, setRetainedEarnings] = useState(0)
  const [assets,           setAssets]           = useState<Asset[]>([])
  const [showAssetForm,    setShowAssetForm]    = useState(false)
  const [newAsset,         setNewAsset]         = useState<Partial<Asset>>({
    type: 'computer',
    purchaseDate: entryDate,
  })

  const totalAssets  = bankBal + debtors + assets.reduce((s, a) => s + a.residualValue, 0)
  const totalLiab    = creditors + vatPayable + salaries
  const totalPassive = capital + retainedEarnings + totalLiab
  const difference   = Math.abs(totalAssets - totalPassive)
  const isBalanced   = difference < 1

  const inputStyle = {
    border: '1.5px solid var(--border)',
    backgroundColor: 'var(--surface)',
    color: 'var(--text-primary)',
    borderRadius: 12,
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
  }

  const handleSave = () => {
    setBankBalance(bankBal, entryDate)
    setDebtorsBalance(debtors)
    setCreditorsBalance(creditors)
    setCapitalAmount(capital)
    onComplete()
  }

  const addAsset = () => {
    if (!newAsset.name || !newAsset.purchasePrice) return
    setAssets(prev => [...prev, {
      id:            crypto.randomUUID(),
      name:          newAsset.name!,
      purchaseDate:  newAsset.purchaseDate ?? entryDate,
      purchasePrice: newAsset.purchasePrice!,
      residualValue: newAsset.residualValue ?? newAsset.purchasePrice!,
      type:          (newAsset.type ?? 'other') as Asset['type'],
    }])
    setNewAsset({ type: 'computer', purchaseDate: entryDate })
    setShowAssetForm(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Начальные остатки
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Введите состояние компании на {entryDate}
        </p>
      </div>

      {/* Balance check */}
      <div className="rounded-xl p-4"
        style={{
          backgroundColor: isBalanced ? 'var(--accent-light)' : 'var(--surface-card)',
          border: `1.5px solid ${isBalanced ? 'var(--accent)' : 'var(--border)'}`,
        }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-medium"
            style={{ color: isBalanced ? 'var(--accent-text)' : 'var(--text-primary)' }}>
            {isBalanced ? '✅ Баланс сходится' : '⚖️ Проверка баланса'}
          </span>
          <div className="flex gap-4 text-sm">
            <span style={{ color: 'var(--accent)' }}>
              Активи: {totalAssets.toFixed(0)} €
            </span>
            <span style={{ color: 'var(--danger)' }}>
              Пасиви: {totalPassive.toFixed(0)} €
            </span>
            {!isBalanced && difference > 0 && (
              <span style={{ color: '#f59e0b' }}>
                Разлика: {difference.toFixed(0)} €
              </span>
            )}
          </div>
        </div>
        {!isBalanced && difference > 1 && (
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Разница будет автоматически отнесена на нераспределённую прибыль
          </p>
        )}
      </div>

      {/* АКТИВИ */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}>
          Активи
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Остаток на банковском счёте',     hint: 'Из выписки банка на дату входа', value: bankBal, set: setBankBal  },
            { label: 'Дебиторска задолженост (клиенти)', hint: 'Клиенты которые должны вам',     value: debtors, set: setDebtors  },
          ].map(({ label, hint, value, set }) => (
            <div key={label} className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
              <label className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-primary)' }}>{label}</label>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{hint}</p>
              <div className="flex items-center gap-2">
                <input type="number" step="0.01" min="0"
                  value={value} onChange={(e) => set(Number(e.target.value))}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
                <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>€</span>
              </div>
            </div>
          ))}

          {/* Assets */}
          <div className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Основни средства
              </label>
              <button onClick={() => setShowAssetForm(true)}
                className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                + Добавить
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Компьютеры, авто, мебель — остаточная стоимость
            </p>

            {assets.length > 0 && (
              <div className="space-y-2 mb-3">
                {assets.map((asset) => (
                  <div key={asset.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {asset.name}
                      </span>
                      <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                        куплен {asset.purchaseDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
                        {asset.residualValue.toFixed(0)} €
                      </span>
                      <button onClick={() => setAssets(prev => prev.filter(a => a.id !== asset.id))}
                        style={{ color: 'var(--text-muted)' }}>
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showAssetForm && (
              <div className="space-y-2 p-3 rounded-xl"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <input placeholder="Название (MacBook Pro 14)"
                  value={newAsset.name ?? ''}
                  onChange={(e) => setNewAsset(p => ({ ...p, name: e.target.value }))}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Цена покупки €"
                    value={newAsset.purchasePrice ?? ''}
                    onChange={(e) => setNewAsset(p => ({ ...p, purchasePrice: Number(e.target.value) }))}
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
                  <input type="number" placeholder="Остаточная стоимость €"
                    value={newAsset.residualValue ?? ''}
                    onChange={(e) => setNewAsset(p => ({ ...p, residualValue: Number(e.target.value) }))}
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
                </div>
                <input type="date"
                  value={newAsset.purchaseDate ?? entryDate}
                  onChange={(e) => setNewAsset(p => ({ ...p, purchaseDate: e.target.value }))}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
                <div className="flex gap-2">
                  <button onClick={addAsset}
                    disabled={!newAsset.name || !newAsset.purchasePrice}
                    className="flex-1 rounded-xl py-1.5 text-xs font-medium text-white disabled:opacity-40"
                    style={{ backgroundColor: 'var(--accent)' }}>
                    Добавить
                  </button>
                  <button onClick={() => setShowAssetForm(false)}
                    className="rounded-xl px-3 py-1.5 text-xs"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ПАСИВИ */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}>
          Пасиви
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Уставный капитал',                       hint: 'Минимум 1.02 € для ЕООД',              value: capital,          set: setCapital          },
            { label: 'Нераспределённая прибыль прошлых лет',   hint: 'Из предыдущих ЗКПО',                   value: retainedEarnings, set: setRetainedEarnings },
            { label: 'Кредиторска задолженост (доставчици)',    hint: 'Поставщики которым вы должны',         value: creditors,        set: setCreditors        },
            { label: 'ДДС за внасяне',                         hint: 'Из последней ДДС декларации',          value: vatPayable,       set: setVatPayable       },
            { label: 'Задължения към персонала',                hint: 'Начисленные но не выплаченные зарплаты', value: salaries,       set: setSalaries         },
          ].map(({ label, hint, value, set }) => (
            <div key={label} className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
              <label className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-primary)' }}>{label}</label>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{hint}</p>
              <div className="flex items-center gap-2">
                <input type="number" step="0.01" min="0"
                  value={value} onChange={(e) => set(Number(e.target.value))}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
                <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>€</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-3"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          💡 Данные можно изменить позже в разделе Бухгалтерия → Баланс.
          Если баланс не сходится — разница будет отнесена на нераспределённую прибыль.
        </p>
      </div>

      <button onClick={handleSave}
        className="w-full rounded-xl py-3 text-sm font-semibold text-white"
        style={{ backgroundColor: 'var(--accent)' }}>
        Сохранить и начать работу 🌹
      </button>
    </div>
  )
}
