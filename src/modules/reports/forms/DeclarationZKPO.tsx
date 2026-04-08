import { useState } from 'react'
import type { ZKPOFormData } from '../types'
import { generateZKPOXml, downloadXml } from '../../../lib/xmlGenerator'
import { generateZKPOPdf } from '../../../lib/pdfGenerator'
import { ZKPO_SCHEMA } from '../../../constants/nap-schemas'
import HelpButton from '../../../components/ui/HelpButton'

interface Props {
  data: ZKPOFormData
}

function Row({
  label,
  value,
  editable,
  onChange,
}: {
  label: string
  value: number
  editable?: boolean
  onChange?: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-2.5">
      <span className="text-sm text-slate-600">{label}</span>
      {editable && onChange ? (
        <input
          type="number"
          step="0.01"
          value={value.toFixed(2)}
          onChange={e => onChange(Number(e.target.value))}
          className="w-36 rounded border border-slate-200 bg-white px-2 py-1 text-right text-sm focus:border-violet-400 focus:outline-none"
        />
      ) : (
        <span className={`font-medium ${value < 0 ? 'text-red-500' : 'text-slate-800'}`}>{value.toFixed(2)} €</span>
      )}
    </div>
  )
}

export default function DeclarationZKPO({ data }: Props) {
  const [form, setForm] = useState<ZKPOFormData>(data)
  const set = (patch: Partial<ZKPOFormData>) => setForm(f => ({ ...f, ...patch }))

  const taxableProfit = Math.max(form.accountingProfit + form.nonDeductibleExpenses, 0)
  const corporateTax = taxableProfit * 0.1
  const taxDue = Math.max(corporateTax - form.advancePaid, 0)

  const copyToClipboard = () => {
    const text = [
      `ГОДИШНА ДЕКЛАРАЦИЯ по ЗКПО`,
      `Година: ${form.year}  Краен срок: 30 април ${form.year + 1}`,
      `Фирма: ${form.companyName}  ЕИК: ${form.eik}`,
      ``,
      `ФИНАНСОВ РЕЗУЛТАТ`,
      `  Общо приходи:             ${form.totalRevenue.toFixed(2)} €`,
      `  Общо разходи:             ${form.totalExpenses.toFixed(2)} €`,
      `  Счетоводна печалба:       ${form.accountingProfit.toFixed(2)} €`,
      `  Непризнати разходи:       ${form.nonDeductibleExpenses.toFixed(2)} €`,
      ``,
      `ДАНЪК`,
      `  Данъчна печалба:          ${taxableProfit.toFixed(2)} €`,
      `  Корпоративен данък (10%): ${corporateTax.toFixed(2)} €`,
      `  Платени авансови вноски:  ${form.advancePaid.toFixed(2)} €`,
      `  ДАНЪК ЗА ДОВНАСЯНЕ:       ${taxDue.toFixed(2)} €`,
    ].join('\n')
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-5 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Годишна декларация по ЗКПО</h2>
            <HelpButton topic="ЗКПО чл. 92 годишна декларация срок 30 юни" title="Декларация ЗКПО" pageContext="reports" size="md" />
          </div>
          <p className="text-sm text-slate-400">
            Годишна · срок 30 април · валута EUR ·{' '}
            <span className="rounded bg-slate-100 px-1 font-mono text-xs">
              схема {ZKPO_SCHEMA.version}
            </span>
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">ЗКПО</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ['Фирма', form.companyName, 'companyName'],
            ['ЕИК', form.eik, 'eik'],
          ] as [string, string, keyof ZKPOFormData][]
        ).map(([label, value, key]) => (
          <div key={key}>
            <label className="mb-1 block text-xs text-slate-400">{label}</label>
            <input
              value={value as string}
              onChange={e => set({ [key]: e.target.value } as Partial<ZKPOFormData>)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-xs text-slate-400">Данъчна година</label>
          <input
            type="number"
            value={form.year}
            onChange={e => set({ year: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Финансов резултат</h3>
        <div className="space-y-2">
          <Row label="Общо приходи" editable onChange={v => set({ totalRevenue: v })} value={form.totalRevenue} />
          <Row label="Общо разходи" editable onChange={v => set({ totalExpenses: v })} value={form.totalExpenses} />
          <Row label="Счетоводна печалба / загуба" value={form.accountingProfit} />
          <Row
            label="Непризнати разходи (ЗКПО)"
            editable
            onChange={v => set({ nonDeductibleExpenses: v })}
            value={form.nonDeductibleExpenses}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Данъчна основа и данък</h3>
        <div className="space-y-2">
          <Row label="Данъчна печалба" value={taxableProfit} />
          <Row label="Корпоративен данък (10%)" value={corporateTax} />
          <Row
            label="Платени авансови вноски"
            editable
            onChange={v => set({ advancePaid: v })}
            value={form.advancePaid}
          />
        </div>
      </div>

      <div className={`rounded-xl p-4 ${taxDue > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
        <div className="flex justify-between">
          <span className={`font-medium ${taxDue > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {taxDue > 0 ? 'Данък за довнасяне' : 'Надвнесен данък'}
          </span>
          <span className={`font-bold ${taxDue > 0 ? 'text-red-700' : 'text-green-700'}`}>{taxDue.toFixed(2)} €</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() =>
            downloadXml(generateZKPOXml({ ...form, taxableProfit, corporateTax, taxDue }), `ZKPO_${form.year}.xml`)
          }
          className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          XML за e-services.nap.bg
        </button>
        <button
          onClick={() => generateZKPOPdf({ ...form, taxableProfit, corporateTax, taxDue })}
          className="rounded-lg border border-violet-200 px-5 py-2 text-sm text-violet-600 hover:bg-violet-50"
        >
          PDF чернова
        </button>
        <button
          onClick={copyToClipboard}
          className="rounded-lg border border-slate-200 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Копирай текст
        </button>
      </div>
    </div>
  )
}
