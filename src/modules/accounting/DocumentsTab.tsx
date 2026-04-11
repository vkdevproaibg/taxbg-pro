import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useUserStore } from '../../store/userStore'
import { useAccountingStore } from '../../store/accountingStore'
import { useJournalStore } from '../../store/journalStore'
import { useEmployeesStore } from '../../store/employeesStore'
import { useIntegrationsStore } from '../../store/integrationsStore'
import { buildOPR } from '../../lib/financialReports'
import { calculateObrazec1, obrazec1ToCsv } from '../../lib/obrazec1'
import { generateDDSXml } from '../../lib/xmlGenerator'

type DocStatus = 'ready' | 'action' | 'pending' | 'not_applicable'
type Period = 'month' | 'quarter' | 'year'

interface Document {
  id: string
  title: string
  authority: string
  deadline: string
  status: DocStatus
  statusLabel: string
  description: string
  actions: {
    label: string
    type: 'download' | 'link' | 'generate'
    handler: () => void
  }[]
  warning?: string
}

const STATUS_META: Record<DocStatus, {
  color: string
  bg: string
  border: string
  icon: string
}> = {
  ready:          { color: 'var(--accent-text)',  bg: 'var(--accent-light)', border: 'var(--accent)', icon: '🟢' },
  action:         { color: '#92400e',             bg: '#fffbeb',             border: '#f59e0b',       icon: '🟡' },
  pending:        { color: 'var(--text-muted)',   bg: 'var(--surface)',      border: 'var(--border)', icon: '⚪' },
  not_applicable: { color: 'var(--text-muted)',   bg: 'var(--surface)',      border: 'var(--border)', icon: '—'  },
}

export default function DocumentsTab() {
  const { legalForm, companyName, eik, hasVat, hasEmployees } = useUserStore()
  const transactions  = useAccountingStore((s) => s.transactions)
  const { entries }   = useJournalStore()
  const { employees } = useEmployeesStore()
  const integrations  = useIntegrationsStore()

  const [period, setPeriod] = useState<Period>('month')

  const now          = new Date()
  const currentYear  = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Period ranges
  const ranges = {
    month: {
      from: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
      to:   format(new Date(currentYear, currentMonth, 0), 'yyyy-MM-dd'),
      label: format(now, 'LLLL yyyy'),
    },
    quarter: {
      from: `${currentYear}-${String(Math.floor((currentMonth - 1) / 3) * 3 + 1).padStart(2, '0')}-01`,
      to:   format(new Date(currentYear, Math.ceil(currentMonth / 3) * 3, 0), 'yyyy-MM-dd'),
      label: `Q${Math.ceil(currentMonth / 3)} ${currentYear}`,
    },
    year: {
      from: `${currentYear}-01-01`,
      to:   `${currentYear}-12-31`,
      label: String(currentYear),
    },
  }

  const range = ranges[period]

  // DDS data
  const ddsReady = useMemo(() => {
    if (!hasVat) return false
    return transactions.some(t =>
      t.date >= range.from && t.date <= range.to &&
      ['vat_out', 'vat_in'].includes(t.type)
    )
  }, [transactions, range, hasVat])

  const vatPayable = useMemo(() => {
    const vatOut = transactions
      .filter(t => t.date >= range.from && t.date <= range.to && t.type === 'vat_out')
      .reduce((s, t) => s + (t.vatAmount ?? 0), 0)
    const vatIn = transactions
      .filter(t => t.date >= range.from && t.date <= range.to && t.type === 'vat_in')
      .reduce((s, t) => s + (t.vatAmount ?? 0), 0)
    return Math.max(vatOut - vatIn, 0)
  }, [transactions, range])

  // Образец 1 data
  const activeEmployees = employees.filter(e => e.active)

  // OPR/ZKPO data
  const oprReport = useMemo(() =>
    buildOPR(entries, transactions, range.from, range.to, companyName),
    [entries, transactions, range, companyName]
  )

  // Download helpers
  const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const downloadXml = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/xml;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  // Build documents list
  const documents: Document[] = []

  // ── DDS ──────────────────────────────────────────────────────
  if (hasVat) {
    const vatOut20 = transactions
      .filter(t => t.date >= range.from && t.date <= range.to && t.type === 'vat_out' && t.vatRate === 0.20)
      .reduce((s, t) => s + (t.vatAmount ?? 0), 0)
    const vatIn20 = transactions
      .filter(t => t.date >= range.from && t.date <= range.to && t.type === 'vat_in' && t.vatRate === 0.20)
      .reduce((s, t) => s + (t.vatAmount ?? 0), 0)
    const salesBase20 = transactions
      .filter(t => t.date >= range.from && t.date <= range.to && t.type === 'vat_out' && t.vatRate === 0.20)
      .reduce((s, t) => s + t.amount, 0)
    const vatRefund = Math.max(vatIn20 - vatOut20, 0)

    documents.push({
      id: 'dds',
      title: 'Справка-декларация по ДДС',
      authority: 'НАП',
      deadline: 'до 14-го числа следующего месяца',
      status: ddsReady ? 'ready' : 'action',
      statusLabel: ddsReady ? 'Готова к подаче' : 'Нет данных ДДС',
      description: `ДДС за внасяне: ${vatPayable.toFixed(2)} €`,
      warning: vatPayable > 0 ? `Платить до 14-го: ${vatPayable.toFixed(2)} €` : undefined,
      actions: [
        {
          label: 'Скачать XML',
          type: 'generate',
          handler: () => {
            const xml = generateDDSXml({
              companyName, eik,
              vatNumber: eik,
              period: range.label,
              salesBase20, salesBase9: 0, salesBase0: 0,
              vatOut20, vatOut9: 0,
              purchasesBase20: 0, purchasesBase9: 0,
              vatIn20, vatIn9: 0,
              vatPayable,
              vatRefund,
            })
            downloadXml(xml, `DDS_${range.label}.xml`)
          },
        },
        {
          label: 'Портал НАП →',
          type: 'link',
          handler: () => window.open('https://e-services.nap.bg', '_blank'),
        },
      ],
    })
  }

  // ── ОБРАЗЕЦ 1 ──────────────────────────────────────────────
  if (hasEmployees) {
    const summary = calculateObrazec1(
      activeEmployees,
      range.from.slice(0, 7),
      companyName,
      eik
    )
    documents.push({
      id: 'obrazec1',
      title: 'Образец 1 — осигуровки за служители',
      authority: 'НАП',
      deadline: 'до 25-го числа следующего месяца',
      status: activeEmployees.length > 0 ? 'ready' : 'action',
      statusLabel: activeEmployees.length > 0
        ? `${activeEmployees.length} служители готово`
        : 'Нет активных сотрудников',
      description: `Общ разход: ${summary.totalCost.toFixed(2)} €`,
      actions: [
        {
          label: 'Скачать CSV',
          type: 'download',
          handler: () => downloadCsv(
            obrazec1ToCsv(summary),
            `Obrazec1_${range.from.slice(0, 7)}.csv`
          ),
        },
        {
          label: 'Портал НАП →',
          type: 'link',
          handler: () => window.open('https://inetdec.nra.bg', '_blank'),
        },
      ],
    })
  }

  // ── ОПР ────────────────────────────────────────────────────
  documents.push({
    id: 'opr',
    title: 'Отчёт за приходите и разходите (ОПР)',
    authority: 'БРРА',
    deadline: period === 'year' ? 'до 30 юни' : 'годовой отчёт',
    status: entries.length > 0 ? 'ready' : 'action',
    statusLabel: entries.length > 0 ? 'Данные есть' : 'Нет проводок',
    description: `Резултат: ${oprReport.financialResult.toFixed(2)} € · Данък: ${oprReport.corporateTax.toFixed(2)} €`,
    actions: [
      {
        label: 'Открыть ОПР',
        type: 'link',
        handler: () => {},
      },
    ],
  })

  // ── ОСИГУРОВКИ (платёж) ─────────────────────────────────────
  documents.push({
    id: 'osig-payment',
    title: 'Уплата осигуровок',
    authority: 'НАП',
    deadline: 'до 25-го числа',
    status: 'action',
    statusLabel: 'Платить онлайн',
    description: 'Уплата через epay.bg или в банке с кодом УИН',
    actions: [
      {
        label: 'epay.bg →',
        type: 'link',
        handler: () => window.open('https://epay.bg', '_blank'),
      },
      {
        label: 'Инструкция НАП →',
        type: 'link',
        handler: () => window.open('https://nap.bg/page?id=379', '_blank'),
      },
    ],
  })

  // ── НСИ (annual only) ───────────────────────────────────────
  if (period === 'year') {
    documents.push({
      id: 'nsi',
      title: 'Годишен отчёт НСИ',
      authority: 'НСИ',
      deadline: 'до 30 юни',
      status: 'action',
      statusLabel: 'nsi.bg: КЕП или ПИК от НАП',
      description: 'Статистически отчёт. Самый часто забываемый — штраф 500–2 000 €',
      warning: 'Подаётся онлайн на nsi.bg: КЕП (все) или ПИК от НАП (ЕТ и физлица).',
      actions: [
        {
          label: 'nsi.bg →',
          type: 'link',
          handler: () => window.open('https://nsi.bg', '_blank'),
        },
      ],
    })
  }

  // ── ZKPO (annual only) ──────────────────────────────────────
  if (period === 'year' && legalForm === 'ood') {
    documents.push({
      id: 'zkpo',
      title: 'Годишна декларация ЗКПО',
      authority: 'НАП',
      deadline: 'до 30 юни',
      status: entries.length > 0 ? 'ready' : 'action',
      statusLabel: entries.length > 0 ? 'Данные готовы' : 'Нет проводок',
      description: `КНП: ${oprReport.corporateTax.toFixed(2)} € · Печалба: ${oprReport.netProfit.toFixed(2)} €`,
      actions: [
        {
          label: 'Портал НАП →',
          type: 'link',
          handler: () => window.open('https://e-services.nap.bg', '_blank'),
        },
      ],
    })
  }

  return (
    <div className="space-y-5 p-6">

      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Центр документов
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Все обязательства за период · статус подготовки и подачи
        </p>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 rounded-xl p-1"
        style={{ backgroundColor: 'var(--surface)' }}>
        {([
          { id: 'month',   label: `Месяц (${format(now, 'MMM yyyy')})` },
          { id: 'quarter', label: `Квартал Q${Math.ceil(currentMonth / 3)}` },
          { id: 'year',    label: `Год ${currentYear}` },
        ] as { id: Period; label: string }[]).map((p) => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className="flex-1 rounded-lg py-2 text-sm transition-colors"
            style={{
              backgroundColor: period === p.id ? 'var(--surface-card)' : 'transparent',
              color:      period === p.id ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: period === p.id ? 600 : 400,
              boxShadow:  period === p.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Integrations hint */}
      {!integrations.napApi.enabled && !integrations.email.enabled && (
        <div className="rounded-xl p-3 flex items-center gap-3"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span>💡</span>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Подключите интеграции в{' '}
            <a href="/settings" style={{ color: 'var(--accent)' }} className="underline">
              Настройки → Интеграции
            </a>{' '}
            для отправки документов одной кнопкой
          </p>
        </div>
      )}

      {/* Documents list */}
      <div className="space-y-3">
        {documents.map((doc) => {
          const meta = STATUS_META[doc.status]
          return (
            <div key={doc.id}
              className="rounded-xl shadow-sm overflow-hidden"
              style={{ border: `1.5px solid ${meta.border}` }}>

              {/* Status bar */}
              <div className="px-4 py-2.5 flex items-center justify-between flex-wrap gap-2"
                style={{ backgroundColor: meta.bg }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm">{meta.icon}</span>
                  <span className="text-sm font-semibold" style={{ color: meta.color }}>
                    {doc.title}
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-xs"
                    style={{ backgroundColor: meta.border + '20', color: meta.color }}>
                    {doc.statusLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium" style={{ color: meta.color }}>
                    {doc.authority}
                  </span>
                  <span className="text-xs" style={{ color: meta.color }}>
                    {doc.deadline}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-3"
                style={{ backgroundColor: 'var(--surface-card)' }}>
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {doc.description}
                  </p>
                  {doc.warning && (
                    <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--danger)' }}>
                      ⚠ {doc.warning}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {doc.actions.map((action, i) => (
                    <button key={i}
                      onClick={action.handler}
                      className="rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: i === 0 ? 'var(--accent)' : 'var(--surface)',
                        color:  i === 0 ? '#fff' : 'var(--text-secondary)',
                        border: i === 0
                          ? '1.5px solid var(--accent)'
                          : '1.5px solid var(--border)',
                      }}>
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {[
          { icon: '🟢', label: 'Готово к подаче' },
          { icon: '🟡', label: 'Требует действия' },
          { icon: '⚪', label: 'Не актуально'     },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="text-sm">{item.icon}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
