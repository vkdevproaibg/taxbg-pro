import { useState } from 'react'
import { format } from 'date-fns'
import { useAccountingStore } from '../../store/accountingStore'
import type { TransactionType } from '../../store/accountingStore'
import HelpButton from '../../components/ui/HelpButton'

const TYPES: { value: TransactionType; label: string; hint: string; hasVat: boolean }[] = [
  { value: 'income',     label: 'Приход (B2B)',       hint: 'Плащане от фирма-клиент, без ДДС',        hasVat: false },
  { value: 'vat_out',    label: 'Продажба с ДДС',     hint: 'Фактура с начислен ДДС 20%/9%',           hasVat: true  },
  { value: 'expense',    label: 'Разход',              hint: 'Плащане към доставчик без ДДС',           hasVat: false },
  { value: 'vat_in',     label: 'Покупка с ДДС',      hint: 'Фактура с данъчен кредит',                hasVat: true  },
  { value: 'appstore',   label: 'App Store плащане',   hint: 'Нетна сума от Apple (без комисия и ДДС)', hasVat: false },
  { value: 'googleplay', label: 'Google Play плащане', hint: 'Нетна сума от Google (без комисия и ДДС)',hasVat: false },
  { value: 'stripe',     label: 'Stripe / PSP',        hint: 'Нетна сума от payment processor',         hasVat: false },
  { value: 'salary',     label: 'Заплата',             hint: 'Изплатена нетна заплата на служител',     hasVat: false },
  { value: 'dividend',   label: 'Дивидент',            hint: 'Изплатен дивидент на собственик (7%)',    hasVat: false },
  { value: 'refund',     label: 'Refund / отписка',    hint: 'Върнато плащане — намалява приходите',    hasVat: false },
  { value: 'asset_purchase',  label: 'Покупка ОС (авто/оборудване)', hint: 'Основно средство — не е разход, а актив на баланса',         hasVat: false },
  { value: 'depreciation',    label: 'Амортизация на ОС',            hint: 'Годишна амортизация: 25% за МПС по ЗКПО',                    hasVat: false },
  { value: 'vehicle_tax',     label: 'Данък МПС (общината)',         hint: 'Муниципален данък — плаща се в общината, не в НАП',          hasVat: false },
  { value: 'vehicle_expense', label: 'Разход МПС (гориво/застр.)',   hint: 'Гориво, застраховка, сервиз — 50% при смесена употреба',     hasVat: false },
]

const VAT_RATES: { value: 0.20 | 0.09 | 0; label: string }[] = [
  { value: 0.20, label: '20%' },
  { value: 0.09, label: '9%'  },
  { value: 0,    label: '0%'  },
]

export default function AddTransaction() {
  const add = useAccountingStore((s) => s.addTransaction)

  const [date, setDate]           = useState(format(new Date(), 'yyyy-MM-dd'))
  const [type, setType]           = useState<TransactionType>('income')
  const [description, setDesc]    = useState('')
  const [amount, setAmount]       = useState('')
  const [vatRate, setVatRate]     = useState<0.20 | 0.09 | 0>(0.20)
  const [counterparty, setCp]     = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [assetName, setAssetName]       = useState('')
  const [municipality, setMunicipality] = useState('')
  const [deductiblePct, setDeductiblePct] = useState<number>(0.5)

  const typeMeta = TYPES.find((t) => t.value === type)!
  const showVat  = typeMeta.hasVat
  const showVehicle = ['asset_purchase', 'depreciation', 'vehicle_tax', 'vehicle_expense'].includes(type)
  const showDeductible = type === 'vehicle_expense'

  const handleAdd = () => {
    if (!description.trim() || !amount) return
    const amt = Number(amount)
    add({
      date,
      description: description.trim(),
      amount: amt,
      type,
      vatRate:       showVat ? vatRate : undefined,
      vatAmount:     showVat ? Number((amt * vatRate).toFixed(2)) : undefined,
      counterparty:  counterparty.trim()  || undefined,
      invoiceNumber: invoiceNo.trim()     || undefined,
      assetName:         assetName.trim()      || undefined,
      municipality:      municipality.trim()   || undefined,
      deductiblePercent: showDeductible ? deductiblePct : undefined,
    })
    setDesc(''); setAmount(''); setCp(''); setInvoiceNo('')
    setAssetName(''); setMunicipality('')
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-medium text-slate-700">Ръчно добавяне</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

        <div>
          <label className="mb-1 block text-xs text-slate-400">Дата</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
        </div>

        <div className="col-span-2">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-400">Тип</label>
            <HelpButton topic="типове транзакции бухгалтерия ДДС осигуровки" pageContext="accounting" />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value as TransactionType)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none">
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">{typeMeta.hint}</p>
        </div>

        {showVat && (
          <div>
            <label className="mb-1 block text-xs text-slate-400">ДДС ставка</label>
            <select value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value) as 0.20 | 0.09 | 0)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none">
              {VAT_RATES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="col-span-2">
          <label className="mb-1 block text-xs text-slate-400">Описание</label>
          <input value={description} onChange={(e) => setDesc(e.target.value)}
            placeholder="Фактура №001, хостинг, заплата Иванов..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">
            Сума (€{showVat ? ', без ДДС' : ''})
          </label>
          <input type="number" step="0.01" min="0" value={amount}
            onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
          {showVat && amount && (
            <p className="mt-1 text-xs text-slate-400">
              ДДС: {(Number(amount) * vatRate).toFixed(2)} € · Общо: {(Number(amount) * (1 + vatRate)).toFixed(2)} €
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">№ фактура</label>
          <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)}
            placeholder="001"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
        </div>

        {showVehicle && (
          <div className="col-span-2 sm:col-span-3">
            <label className="mb-1 block text-xs text-slate-400">Наименование на ОС / МПС</label>
            <input value={assetName} onChange={(e) => setAssetName(e.target.value)}
              placeholder="Toyota Yaris 2023, MacBook Pro 16..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
          </div>
        )}

        {type === 'vehicle_tax' && (
          <div>
            <label className="mb-1 block text-xs text-slate-400">Община</label>
            <input value={municipality} onChange={(e) => setMunicipality(e.target.value)}
              placeholder="София, Пловдив, Варна..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
          </div>
        )}

        {showDeductible && (
          <div>
            <label className="mb-1 block text-xs text-slate-400">% признат разход</label>
            <select value={deductiblePct} onChange={(e) => setDeductiblePct(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none">
              <option value={0.5}>50% — смесена употреба (служебна + лична)</option>
              <option value={1.0}>100% — само служебна употреба</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">
              ЗКПО чл. 204 — ако автомобилът се ползва и лично, само 50% от разходите са признати
            </p>
          </div>
        )}

        <div className="col-span-2 sm:col-span-3">
          <label className="mb-1 block text-xs text-slate-400">Контрагент</label>
          <input value={counterparty} onChange={(e) => setCp(e.target.value)}
            placeholder="Acme Ltd, Google LLC, Apple Inc..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
        </div>
      </div>

      <button onClick={handleAdd}
        disabled={!description.trim() || !amount}
        className="mt-4 rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40">
        Добави
      </button>
    </div>
  )
}
