import { useState, type ReactNode } from 'react'
import type { ZKPOFormData } from '../types'
import { generateZKPOXml, downloadXml } from '../../../lib/xmlGenerator'
import { generateZKPOPdf } from '../../../lib/pdfGenerator'
import { ZKPO_SCHEMA } from '../../../constants/nap-schemas'
import HelpButton from '../../../components/ui/HelpButton'
import { BgTermLabel } from '../../../lib/bgTerms'
import { useUserStore } from '../../../store/userStore'

interface Props {
  data: ZKPOFormData
}

function Row({
  label,
  value,
  editable,
  onChange,
}: {
  label: ReactNode
  value: number
  editable?: boolean
  onChange?: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-2.5">
      <div className="text-sm text-slate-600 flex-1 min-w-0">{label}</div>
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
  const rawTaxDue = corporateTax - form.advancePaid
  const taxDue = Math.max(rawTaxDue, 0)
  const overpaid = rawTaxDue < 0 ? Math.abs(rawTaxDue) : 0

  const copyToClipboard = () => {
    const text = [
      `ГОДИШНА ДЕКЛАРАЦИЯ по ЗКПО`,
      `Година: ${form.year}  Краен срок: 30 юни ${form.year + 1}`,
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
            Годишна · срок 30 юни · валута EUR ·{' '}
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
          <Row label={<BgTermLabel termKey="danychna_pechalba" />} value={taxableProfit} />
          <Row
            label={
              <span className="flex items-baseline gap-1">
                <BgTermLabel termKey="korporativen_danyk" />
                <span className="text-xs text-slate-400">(10%)</span>
              </span>
            }
            value={corporateTax}
          />
          <Row
            label="Платени авансови вноски"
            editable
            onChange={v => set({ advancePaid: v })}
            value={form.advancePaid}
          />
        </div>
      </div>

      {taxDue > 0 ? (
        <div className="rounded-xl bg-red-50 p-4">
          <div className="flex justify-between gap-3">
            <BgTermLabel termKey="danyk_za_dovnasyane" className="font-medium text-red-700" />
            <span className="font-bold text-red-700 shrink-0">{taxDue.toFixed(2)} €</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-green-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <BgTermLabel termKey="nadvnesen_danyk" className="font-medium text-green-700" />
            <span className="font-bold text-green-700 shrink-0">{overpaid.toFixed(2)} €</span>
          </div>
          {overpaid > 0 && <NapOverpaymentNote />}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() =>
            downloadXml(generateZKPOXml({ ...form, taxableProfit, corporateTax, taxDue, overpaid }), `ZKPO_${form.year}.xml`)
          }
          className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          XML за e-services.nap.bg
        </button>
        <button
          onClick={() => generateZKPOPdf({ ...form, taxableProfit, corporateTax, taxDue, overpaid })}
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

function NapOverpaymentNote() {
  const language = useUserStore(s => s.language)
  const notes: Record<'ru' | 'uk' | 'en' | 'bg', string> = {
    ru: `Авансовые платежи превысили итоговый налог.\n\nДва варианта по болгарскому закону:\n1. Вернуть деньги из НАП — отметьте "ред 20" в декларации (ЗКПО чл. 92). НАП вернёт в течение 30 дней.\n2. Зачесть в счёт будущих налогов автоматически (ДОПК чл. 169 ал. 4).\n\nСрок подачи заявления на возврат: 5 лет (ДОПК чл. 129 ал. 1).`,
    uk: `Авансові платежі перевищили підсумковий податок.\n\nДва варіанти за болгарським законом:\n1. Повернути гроші з НАП — відмітьте "ред 20" у декларації (ЗКПО чл. 92). НАП поверне протягом 30 днів.\n2. Зарахувати в рахунок майбутніх податків автоматично (ДОПК чл. 169 ал. 4).\n\nТермін подачі заяви на повернення: 5 років (ДОПК чл. 129 ал. 1).`,
    en: `Advance payments exceeded the final tax.\n\nTwo options under Bulgarian law:\n1. Request a refund from NAP — tick "line 20" on the declaration (ЗКПО art. 92). NAP will refund within 30 days.\n2. Offset against future tax obligations automatically (ДОПК art. 169 para. 4).\n\nDeadline to request refund: 5 years (ДОПК art. 129 para. 1).`,
    bg: `Авансовите вноски надвишават годишния данък.\n\nМожете да:\n1. Поискате възстановяване от НАП — отбележете "ред 20" (ЗКПО чл. 92).\n2. Оставите за прихващане на бъдещи задължения (ДОПК чл. 169 ал. 4).\n\nДавност: 5 години (ДОПК чл. 129 ал. 1).`,
  }
  return (
    <p className="text-xs leading-relaxed whitespace-pre-line mt-2 text-green-700">
      {notes[language]}
    </p>
  )
}
