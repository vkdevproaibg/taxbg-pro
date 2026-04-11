import { useState } from 'react'
import type { DDSFormData } from '../types'
import { generateDDSXml, downloadXml } from '../../../lib/xmlGenerator'
import { generateDDSPdf } from '../../../lib/pdfGenerator'
import { DDS_SCHEMA } from '../../../constants/nap-schemas'
import HelpButton from '../../../components/ui/HelpButton'
import { BgTermLabel } from '../../../lib/bgTerms'

interface Props {
  data: DDSFormData
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-2.5">
      <span className="text-sm text-slate-600">{label}</span>
      <input
        type="number"
        step="0.01"
        value={value.toFixed(2)}
        onChange={e => onChange(Number(e.target.value))}
        className="w-36 rounded border border-slate-200 bg-white px-2 py-1 text-right text-sm focus:border-violet-400 focus:outline-none"
      />
    </div>
  )
}

export default function DeclarationDDS({ data }: Props) {
  const [form, setForm] = useState<DDSFormData>(data)
  const set = (patch: Partial<DDSFormData>) => setForm(f => ({ ...f, ...patch }))

  const vatResult = form.vatOut20 + form.vatOut9 - (form.vatIn20 + form.vatIn9)
  const vatPayable = Math.max(vatResult, 0)
  const vatRefund = Math.max(-vatResult, 0)

  const copyToClipboard = () => {
    const text = [
      `СПРАВКА-ДЕКЛАРАЦИЯ по ЗДДС`,
      `Период: ${form.period}`,
      `Фирма: ${form.companyName}  ЕИК: ${form.eik}  ДДС №: ${form.vatNumber}`,
      ``,
      `РАЗДЕЛ А — ПРОДАЖБИ`,
      `  20%: база ${form.salesBase20.toFixed(2)} € | ДДС ${form.vatOut20.toFixed(2)} €`,
      `   9%: база ${form.salesBase9.toFixed(2)} €  | ДДС ${form.vatOut9.toFixed(2)} €`,
      `   0%: база ${form.salesBase0.toFixed(2)} €`,
      ``,
      `РАЗДЕЛ Б — ПОКУПКИ`,
      `  20%: база ${form.purchasesBase20.toFixed(2)} € | ДДС ${form.vatIn20.toFixed(2)} €`,
      `   9%: база ${form.purchasesBase9.toFixed(2)} €  | ДДС ${form.vatIn9.toFixed(2)} €`,
      ``,
      vatPayable > 0
        ? `РЕЗУЛТАТ: ДДС за внасяне ${vatPayable.toFixed(2)} €`
        : vatRefund > 0
          ? `РЕЗУЛТАТ: ДДС за възстановяване ${vatRefund.toFixed(2)} €`
          : `РЕЗУЛТАТ: нулев`,
    ].join('\n')
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-5 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              <BgTermLabel termKey="spravka_deklaraciya" />
            </h2>
            <HelpButton topic="ЗДДС чл. 125 декларация ДДС срок 14" title="Декларация по ДДС" pageContext="reports" size="md" />
          </div>
          <p className="text-sm text-slate-400">
            Месечна · срок до 14-то число ·{' '}
            <span className="rounded bg-slate-100 px-1 font-mono text-xs">
              схема {DDS_SCHEMA.version}
            </span>
          </p>
        </div>
        <span
          className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-600"
          title="ДДС — НДС / VAT"
        >
          ДДС
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ['Фирма', form.companyName, 'companyName'],
            ['ЕИК', form.eik, 'eik'],
            ['ДДС номер', form.vatNumber, 'vatNumber'],
            ['Период (YYYY-MM)', form.period, 'period'],
          ] as [string, string, keyof DDSFormData][]
        ).map(([label, value, key]) => (
          <div key={key}>
            <label className="mb-1 block text-xs text-slate-400">{label}</label>
            <input
              value={value as string}
              onChange={e => set({ [key]: e.target.value } as Partial<DDSFormData>)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
            />
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Раздел А — Продажби</h3>
        <div className="mb-2">
          <BgTermLabel termKey="nacislen_dds" className="text-xs" />
        </div>
        <div className="space-y-2">
          <Field label="20% — данъчна основа" value={form.salesBase20} onChange={v => set({ salesBase20: v })} />
          <Field label="20% — ДДС" value={form.vatOut20} onChange={v => set({ vatOut20: v })} />
          <Field label="9% — данъчна основа" value={form.salesBase9} onChange={v => set({ salesBase9: v })} />
          <Field label="9% — ДДС" value={form.vatOut9} onChange={v => set({ vatOut9: v })} />
          <Field
            label="0% / освободени — основа"
            value={form.salesBase0}
            onChange={v => set({ salesBase0: v })}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Раздел Б — Покупки</h3>
        <div className="mb-2">
          <BgTermLabel termKey="danachen_kredit" className="text-xs" />
        </div>
        <div className="space-y-2">
          <Field
            label="20% — данъчна основа"
            value={form.purchasesBase20}
            onChange={v => set({ purchasesBase20: v })}
          />
          <Field label="20% — ДДС за приспадане" value={form.vatIn20} onChange={v => set({ vatIn20: v })} />
          <Field
            label="9% — данъчна основа"
            value={form.purchasesBase9}
            onChange={v => set({ purchasesBase9: v })}
          />
          <Field label="9% — ДДС за приспадане" value={form.vatIn9} onChange={v => set({ vatIn9: v })} />
        </div>
      </div>

      <div
        className={`rounded-xl p-4 ${vatPayable > 0 ? 'bg-red-50' : vatRefund > 0 ? 'bg-green-50' : 'bg-slate-50'}`}
      >
        {vatPayable > 0 && (
          <div className="flex justify-between">
            <span className="font-medium text-red-700">ДДС за внасяне</span>
            <span className="font-bold text-red-700">{vatPayable.toFixed(2)} €</span>
          </div>
        )}
        {vatRefund > 0 && (
          <div className="flex justify-between">
            <span className="font-medium text-green-700">ДДС за възстановяване</span>
            <span className="font-bold text-green-700">{vatRefund.toFixed(2)} €</span>
          </div>
        )}
        {vatPayable === 0 && vatRefund === 0 && <p className="text-center text-sm text-slate-400">Нулев резултат</p>}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => downloadXml(generateDDSXml({ ...form, vatPayable, vatRefund }), `DDS_${form.period}.xml`)}
          className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          XML за e-services.nap.bg
        </button>
        <button
          onClick={() => generateDDSPdf({ ...form, vatPayable, vatRefund })}
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
