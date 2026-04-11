import { useMemo, useState } from 'react'
import { useAccountingStore } from '../../store/accountingStore'
import { useJournalStore } from '../../store/journalStore'
import { useUserStore } from '../../store/userStore'
import { buildOPR } from '../../lib/financialReports'
import { TAX_RATES_2026 } from '../../constants/tax-rates-2026'
import HelpButton from '../../components/ui/HelpButton'

type ReportType = 'dds' | 'zkpo' | 'zddfl' | 'nsi' | 'obrazec6'

const REPORT_TYPES: {
  id: ReportType
  label: string
  authority: string
  deadline: string
  forms: string[]
  description: string
}[] = [
  {
    id: 'dds',
    label: 'Справка-декларация по ДДС',
    authority: 'НАП',
    deadline: 'До 14-го числа следующего месяца',
    forms: ['ood', 'et'],
    description: 'Ежемесячна декларация по ЗДДС. Дневник покупок и продаж.',
  },
  {
    id: 'zkpo',
    label: 'Годишна декларация ЗКПО',
    authority: 'НАП',
    deadline: 'До 30 юни',
    forms: ['ood'],
    description: 'Годовая корпоративная декларация. КНП 10% от данъчната печалба.',
  },
  {
    id: 'zddfl',
    label: 'Годишна декларация ЗДДФЛ',
    authority: 'НАП',
    deadline: 'До 30 април',
    forms: ['et', 'self'],
    description: 'Годовая декларация о доходах физических лиц и ЕТ.',
  },
  {
    id: 'obrazec6',
    label: 'Декларация Образец 6',
    authority: 'НАП',
    deadline: 'До 30 април',
    forms: ['self', 'et'],
    description: 'Годовая декларация по осигуровкам для самоосигуряващ.',
  },
  {
    id: 'nsi',
    label: 'Годишен отчёт НСИ',
    authority: 'НСИ',
    deadline: 'До 30 юни',
    forms: ['ood', 'et'],
    description: 'Статистически отчёт за дейността на предприятието.',
  },
]

export default function ReportsNAPTab() {
  const { legalForm, companyName, eik, hasVat } = useUserStore()
  const transactions = useAccountingStore((s) => s.transactions)
  const { entries } = useJournalStore()
  const [selected, setSelected] = useState<ReportType>('dds')

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const prevMonthStr = currentMonth === 1
    ? `${currentYear - 1}-12`
    : `${currentYear}-${String(currentMonth - 1).padStart(2, '0')}`

  const [period, setPeriod] = useState(prevMonthStr)

  const visibleReports = REPORT_TYPES.filter(r =>
    r.forms.includes(legalForm)
  )

  // Calculate DDS data for selected period
  const ddsData = useMemo(() => {
    const [year, month] = period.split('-').map(Number)
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

    const periodTx = transactions.filter(t => t.date >= from && t.date <= to)

    const vatOut20 = periodTx.filter(t => t.type === 'vat_out' && t.vatRate === 0.20)
      .reduce((s, t) => s + (t.vatAmount ?? 0), 0)
    const vatOut9  = periodTx.filter(t => t.type === 'vat_out' && t.vatRate === 0.09)
      .reduce((s, t) => s + (t.vatAmount ?? 0), 0)
    const salesBase20 = periodTx.filter(t => t.type === 'vat_out' && t.vatRate === 0.20)
      .reduce((s, t) => s + t.amount, 0)
    const salesBase9  = periodTx.filter(t => t.type === 'vat_out' && t.vatRate === 0.09)
      .reduce((s, t) => s + t.amount, 0)
    const salesBase0  = periodTx.filter(t => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)

    const vatIn20 = periodTx.filter(t => t.type === 'vat_in' && t.vatRate === 0.20)
      .reduce((s, t) => s + (t.vatAmount ?? 0), 0)
    const vatIn9  = periodTx.filter(t => t.type === 'vat_in' && t.vatRate === 0.09)
      .reduce((s, t) => s + (t.vatAmount ?? 0), 0)
    const purchasesBase20 = periodTx.filter(t => t.type === 'vat_in' && t.vatRate === 0.20)
      .reduce((s, t) => s + t.amount, 0)
    const purchasesBase9  = periodTx.filter(t => t.type === 'vat_in' && t.vatRate === 0.09)
      .reduce((s, t) => s + t.amount, 0)

    const vatPayable = Math.max((vatOut20 + vatOut9) - (vatIn20 + vatIn9), 0)
    const vatRefund  = Math.max(-((vatOut20 + vatOut9) - (vatIn20 + vatIn9)), 0)

    return {
      from, to, period,
      salesBase20, salesBase9, salesBase0,
      vatOut20, vatOut9,
      purchasesBase20, purchasesBase9,
      vatIn20, vatIn9,
      vatPayable, vatRefund,
    }
  }, [transactions, period])

  // Calculate ZKPO data
  const zkpoData = useMemo(() => {
    const from   = `${currentYear}-01-01`
    const to     = `${currentYear}-12-31`
    const report = buildOPR(entries, transactions, from, to, companyName)
    return {
      year:             currentYear,
      totalRevenue:     report.totalRevenue,
      totalExpenses:    report.totalExpenses,
      accountingProfit: report.financialResult,
      taxableProfit:    report.taxableProfit,
      corporateTax:     report.corporateTax,
      netProfit:        report.netProfit,
    }
  }, [entries, transactions, companyName, currentYear])

  // Calculate Образец 6 (self-employed annual insurance)
  const obrazec6Data = useMemo(() => {
    const r = TAX_RATES_2026
    const annualIncome = transactions
      .filter(t => ['income', 'appstore', 'googleplay', 'stripe'].includes(t.type))
      .reduce((s, t) => s + t.amount, 0)
    const monthlyBase  = Math.min(Math.max(annualIncome / 12, r.minOsig.value), r.maxOsig.value)
    const osigRate     = r.selfEmployed.doo.value + r.selfEmployed.upf.value + r.selfEmployed.zo.value
    const annualOsig   = monthlyBase * osigRate * 12
    const ddfl10       = Math.max(annualIncome - annualOsig - annualIncome * 0.25, 0) * 0.10
    return { annualIncome, monthlyBase, annualOsig, ddfl10 }
  }, [transactions])

  const selectedReport = visibleReports.find(r => r.id === selected)

  return (
    <div className="space-y-5 p-6">

      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Справки за НАП и НСИ
        </h2>
        <HelpButton
          topic="НАП декларации ЗДДС ЗКПО ЗДДФЛ НСИ отчетност"
          title="Справки НАП/НСИ"
          pageContext="accounting-reports"
        />
      </div>

      {/* Report selector */}
      <div className="flex gap-2 flex-wrap">
        {visibleReports.map((r) => (
          <button key={r.id}
            onClick={() => setSelected(r.id)}
            className="rounded-xl px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: selected === r.id ? 'var(--accent)' : 'var(--surface-card)',
              color:  selected === r.id ? '#fff' : 'var(--text-secondary)',
              border: selected === r.id
                ? '1.5px solid var(--accent)'
                : '1.5px solid var(--border)',
            }}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Report info banner */}
      {selectedReport && (
        <div className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--accent-text)' }}>
                {selectedReport.label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--accent-text)' }}>
                {selectedReport.description}
              </p>
            </div>
            <div className="text-right">
              <span className="rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                {selectedReport.authority}
              </span>
              <p className="text-xs mt-1" style={{ color: 'var(--accent-text)' }}>
                {selectedReport.deadline}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── DDS ─────────────────────────────────────────────── */}
      {selected === 'dds' && hasVat && (
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div>
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>
                Период (YYYY-MM)
              </label>
              <input type="month" value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="rounded-xl px-3 py-2 text-sm outline-none"
                style={{ border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
            </div>
          </div>

          <div className="rounded-xl shadow-sm overflow-hidden"
            style={{ border: '1px solid var(--border)' }}>
            <div className="px-4 py-3 border-b"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}>
                Справка-декларация по ЗДДС · {period} · {companyName}
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Sales */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  РАЗДЕЛ А — ПРОДАЖБИ
                </p>
                {[
                  { label: '20% ставка',       base: ddsData.salesBase20, vat: ddsData.vatOut20 },
                  { label: '9% ставка',         base: ddsData.salesBase9,  vat: ddsData.vatOut9  },
                  { label: '0% / освободени',   base: ddsData.salesBase0,  vat: null             },
                ].map((row) => (
                  <div key={row.label}
                    className="flex items-center justify-between py-2 border-b"
                    style={{ borderColor: 'var(--border)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {row.label}
                    </span>
                    <div className="flex gap-6 text-sm">
                      <span style={{ color: 'var(--text-muted)' }}>
                        База: {row.base.toFixed(2)} €
                      </span>
                      {row.vat !== null && (
                        <span style={{ color: 'var(--text-primary)' }}>
                          ДДС: {row.vat.toFixed(2)} €
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Purchases */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  РАЗДЕЛ Б — ПОКУПКИ (данъчен кредит)
                </p>
                {[
                  { label: '20% ставка', base: ddsData.purchasesBase20, vat: ddsData.vatIn20 },
                  { label: '9% ставка',  base: ddsData.purchasesBase9,  vat: ddsData.vatIn9  },
                ].map((row) => (
                  <div key={row.label}
                    className="flex items-center justify-between py-2 border-b"
                    style={{ borderColor: 'var(--border)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {row.label}
                    </span>
                    <div className="flex gap-6 text-sm">
                      <span style={{ color: 'var(--text-muted)' }}>
                        База: {row.base.toFixed(2)} €
                      </span>
                      <span style={{ color: 'var(--text-primary)' }}>
                        ДДС: {row.vat.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Result */}
              <div className="rounded-xl p-4"
                style={{
                  backgroundColor: ddsData.vatPayable > 0 ? 'var(--danger-light)' : 'var(--accent-light)',
                  border: `1.5px solid ${ddsData.vatPayable > 0 ? 'var(--danger)' : 'var(--accent)'}`,
                }}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm"
                    style={{ color: ddsData.vatPayable > 0 ? 'var(--danger-text)' : 'var(--accent-text)' }}>
                    {ddsData.vatPayable > 0 ? 'ДДС ЗА ВНАСЯНЕ' : 'ДДС ЗА ВЪЗСТАНОВЯВАНЕ'}
                  </span>
                  <span className="text-xl font-bold"
                    style={{ color: ddsData.vatPayable > 0 ? 'var(--danger)' : 'var(--accent)' }}>
                    {(ddsData.vatPayable || ddsData.vatRefund).toFixed(2)} €
                  </span>
                </div>
                <p className="text-xs mt-1"
                  style={{ color: ddsData.vatPayable > 0 ? 'var(--danger-text)' : 'var(--accent-text)' }}>
                  Срок: до 14-го числа следующего месяца · УИН платца: {eik}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {selected === 'dds' && !hasVat && (
        <div className="rounded-xl border border-dashed py-8 text-center"
          style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Вы не зарегистрированы по ДДС.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            При обороте более 51 130 €/год регистрация обязательна.
          </p>
        </div>
      )}

      {/* ── ZKPO ─────────────────────────────────────────────── */}
      {selected === 'zkpo' && (
        <div className="rounded-xl shadow-sm overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          <div className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}>
              Годишна декларация ЗКПО · {zkpoData.year} · {companyName}
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {[
              { label: 'Общо приходи',              value: zkpoData.totalRevenue     },
              { label: 'Общо разходи',              value: zkpoData.totalExpenses    },
              { label: 'Счетоводна печалба/загуба', value: zkpoData.accountingProfit },
              { label: 'Данъчна печалба',           value: zkpoData.taxableProfit    },
              { label: 'Корпоративен данък (10%)',  value: zkpoData.corporateTax     },
              { label: 'Чиста печалба',             value: zkpoData.netProfit        },
            ].map((row) => (
              <div key={row.label}
                className="flex items-center justify-between px-4 py-3"
                style={{ backgroundColor: 'var(--surface-card)' }}>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {row.label}
                </span>
                <span className="text-sm font-semibold"
                  style={{ color: row.value < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {row.value.toFixed(2)} €
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3"
            style={{ backgroundColor: 'var(--danger-light)', borderTop: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--danger-text)' }}>
              Срок подачи: до 30 юни {zkpoData.year + 1} ·
              Скидка 1% при подаче до 31 март онлайн (до 1 000 €)
            </p>
          </div>
        </div>
      )}

      {/* ── ОБРАЗЕЦ 6 ─────────────────────────────────────────── */}
      {selected === 'obrazec6' && (
        <div className="rounded-xl shadow-sm overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          <div className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}>
              Образец 6 — Осигуровки самоосигуряващ · {currentYear}
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {[
              { label: 'Годишен доход',             value: obrazec6Data.annualIncome },
              { label: 'Месечна осигурителна база',  value: obrazec6Data.monthlyBase  },
              { label: 'Осигуровки годишно',         value: obrazec6Data.annualOsig   },
              { label: 'ДДФЛ 10%',                  value: obrazec6Data.ddfl10       },
            ].map((row) => (
              <div key={row.label}
                className="flex items-center justify-between px-4 py-3"
                style={{ backgroundColor: 'var(--surface-card)' }}>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {row.label}
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {row.value.toFixed(2)} €
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NSI ─────────────────────────────────────────────── */}
      {selected === 'nsi' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--danger-light)', border: '1.5px solid var(--danger)' }}>
            <p className="font-semibold text-sm" style={{ color: 'var(--danger-text)' }}>
              ⚠ НСИ подаётся онлайн на nsi.bg: КЕП или ПИК от НАП
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--danger-text)' }}>
              Срок: 1 янв — 30 юни · Штраф за пропуск: 500–2 000 €
            </p>
          </div>

          <div className="rounded-xl p-4 space-y-3"
            style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Данные для НСИ (Форма 1-предприятие)
            </p>
            {[
              {
                label: 'Приходи от продажби',
                value: transactions
                  .filter(t => ['income', 'vat_out', 'appstore', 'googleplay', 'stripe'].includes(t.type))
                  .reduce((s, t) => s + t.amount, 0),
                text: null,
              },
              {
                label: 'Разходи за персонал',
                value: transactions
                  .filter(t => t.type === 'salary')
                  .reduce((s, t) => s + t.amount, 0),
                text: null,
              },
              {
                label: 'Брой заети лица',
                value: null,
                text: 'Введите вручную на nsi.bg',
              },
            ].map((row) => (
              <div key={row.label}
                className="flex items-center justify-between py-2 border-b"
                style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {row.label}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {row.value !== null ? `${row.value.toFixed(2)} €` : row.text}
                </span>
              </div>
            ))}
            <a href="https://nsi.bg" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white mt-2"
              style={{ backgroundColor: 'var(--accent)' }}>
              Перейти на nsi.bg →
            </a>
          </div>
        </div>
      )}

      {/* ── ZDDFL ─────────────────────────────────────────────── */}
      {selected === 'zddfl' && (
        <div className="rounded-xl p-4 space-y-3"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Годишна декларация ЗДДФЛ · {currentYear}
          </p>
          {(() => {
            const gross = transactions
              .filter(t => ['income', 'appstore', 'googleplay', 'stripe'].includes(t.type))
              .reduce((s, t) => s + t.amount, 0)
            return [
              { label: 'Брутен доход',           value: gross          },
              { label: 'Нормативни разходи 25%', value: gross * 0.25   },
            ].map((row) => (
              <div key={row.label}
                className="flex items-center justify-between py-2 border-b"
                style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {row.label}
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {row.value.toFixed(2)} €
                </span>
              </div>
            ))
          })()}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Срок: до 30 април · Скидка 5% при подаче до 31 март онлайн
          </p>
        </div>
      )}
    </div>
  )
}
