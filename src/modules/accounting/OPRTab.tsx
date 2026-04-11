import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { useJournalStore } from '../../store/journalStore'
import { useAccountingStore } from '../../store/accountingStore'
import { useUserStore } from '../../store/userStore'
import { buildOPR, oprToCsv } from '../../lib/financialReports'
import HelpButton from '../../components/ui/HelpButton'
import { BgTermLabel } from '../../lib/bgTerms'
import { useExportWithWarning } from '../../hooks/useExportWithWarning'
import ExportWarningModal from '../../components/ui/ExportWarningModal'

export default function OPRTab() {
  const { entries } = useJournalStore()
  const transactions = useAccountingStore((s) => s.transactions)
  const { companyName } = useUserStore()

  const currentYear = new Date().getFullYear()
  const [from, setFrom] = useState(`${currentYear}-01-01`)
  const [to,   setTo]   = useState(format(new Date(), 'yyyy-MM-dd'))
  const [advancePaid, setAdvancePaid] = useState(0)

  const report = useMemo(() =>
    buildOPR(entries, transactions, from, to, companyName, advancePaid),
    [entries, transactions, from, to, companyName, advancePaid]
  )

  const { exportWithWarning, confirm, closeModal, pending, isOpen } = useExportWithWarning()

  const downloadCsv = () => {
    const csv  = oprToCsv(report)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `OPR_${companyName}_${from}_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExport = () => {
    exportWithWarning({
      documentName: `ОПР · ${companyName || 'Company'} · ${from} — ${to}`,
      retentionClass: 'accounting_10y',
      legalBasis: 'ЗСч чл. 47',
      onConfirm: downloadCsv,
    })
  }

  return (
    <div className="space-y-5 p-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            <BgTermLabel termKey="opr" />
          </h2>
          <HelpButton
            topic="ЗСч чл. 40 ОПР отчет за приходите разходите финансов резултат"
            title="ОПР"
            pageContext="accounting-opr"
          />
        </div>
        <div className="flex gap-2 flex-wrap items-end">
          <div>
            <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>От</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm outline-none"
              style={{ border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
          </div>
          <div>
            <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>До</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm outline-none"
              style={{ border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
          </div>
          <button onClick={handleExport}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--accent)' }}>
            Скачать CSV
          </button>
        </div>
      </div>

      {/* Advance paid field */}
      <div className="rounded-xl p-4 shadow-sm"
        style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
        <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Платени авансови вноски за периода (€)
        </label>
        <input type="number" step="0.01" value={advancePaid}
          onChange={(e) => setAdvancePaid(Number(e.target.value))}
          placeholder="0.00"
          className="w-48 rounded-xl px-3 py-2 text-sm outline-none"
          style={{ border: '1.5px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Авансови вноски КНП — Q1 (15 апр), Q2 (15 июл), Q3 (15 окт)
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { key: 'revenue',  label: 'Приходи',           termKey: null as string | null,  value: report.totalRevenue,    color: 'var(--accent)'  },
          { key: 'expenses', label: 'Разходи',           termKey: null as string | null,  value: report.totalExpenses,   color: 'var(--danger)'  },
          { key: 'result',   label: 'Финансов резултат', termKey: null as string | null,  value: report.financialResult, color: report.financialResult >= 0 ? 'var(--accent)' : 'var(--danger)' },
          { key: 'net',      label: 'Чиста печалба',     termKey: 'chista_pechalba',      value: report.netProfit,       color: report.netProfit >= 0 ? 'var(--accent)' : 'var(--danger)' },
        ].map((item) => (
          <div key={item.key} className="rounded-xl p-4 shadow-sm"
            style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
            <div className="text-xl font-bold" style={{ color: item.color }}>
              {item.value.toFixed(2)} €
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {item.termKey ? <BgTermLabel termKey={item.termKey} /> : item.label}
            </div>
          </div>
        ))}
      </div>

      {/* OPR table */}
      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center"
          style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Нет проводок для построения ОПР.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Добавьте транзакции в разделе Доходи и Разходи — проводки создадутся автоматически.
          </p>
        </div>
      ) : (
        <div className="rounded-xl shadow-sm overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
            <span className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}>
              {companyName || 'Компания'} · {report.period}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              ЗСч чл. 40 · НСФОМСП
            </span>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {report.lines.map((line) => (
              <div key={line.code}
                className="flex items-center justify-between py-2.5"
                style={{
                  backgroundColor:
                    line.isTotal    ? 'var(--accent-light)' :
                    line.isSubtotal ? 'var(--surface)'      :
                    'var(--surface-card)',
                  paddingLeft:  line.indent ? 16 + line.indent * 16 : 16,
                  paddingRight: 16,
                }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono w-8 shrink-0"
                    style={{ color: 'var(--text-muted)' }}>
                    {line.code}
                  </span>
                  <span className={`text-sm ${line.isTotal || line.isSubtotal ? 'font-semibold' : ''}`}
                    style={{ color: 'var(--text-primary)' }}>
                    {line.label_ru}
                  </span>
                </div>
                <span className={`text-sm shrink-0 ${line.isTotal || line.isSubtotal ? 'font-bold' : 'font-medium'}`}
                  style={{
                    color: line.amount < 0 ? 'var(--danger)' :
                           line.isTotal || line.isSubtotal ? 'var(--accent)' :
                           'var(--text-secondary)',
                  }}>
                  {line.amount.toFixed(2)} €
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-xl p-3"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          ОПР построен автоматически из журнала проводок.
          Для официальной подачи в БРРА рекомендуется проверка с лицензированным счетоводителем.
          Форма соответствует НСФОМСП (малки и средни предприятия).
        </p>
      </div>

      {pending && (
        <ExportWarningModal
          isOpen={isOpen}
          onClose={closeModal}
          onConfirm={confirm}
          documentName={pending.documentName}
          retentionClass={pending.retentionClass}
          retainUntil={pending.retainUntil}
          legalBasis={pending.legalBasis}
        />
      )}
    </div>
  )
}
