import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useJournalStore } from '../../store/journalStore'
import { useUserStore } from '../../store/userStore'
import { buildBalanceSheet, balanceToCsv } from '../../lib/financialReports'
import ManualBalanceFields from './ManualBalanceFields'
import HelpButton from '../../components/ui/HelpButton'
import { BgTermLabel } from '../../lib/bgTerms'

export default function BalanceTab() {
  const entries = useJournalStore((s) => s.entries)
  const { companyName } = useUserStore()
  const [showAdvanced, setShowAdvanced] = useState(false)

  const upToDate = format(new Date(), 'yyyy-MM-dd')

  const sheet = useMemo(
    () => buildBalanceSheet(entries, upToDate, companyName),
    [entries, upToDate, companyName]
  )

  const handleExport = () => {
    const csv  = balanceToCsv(sheet)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `Balance_${companyName}_${upToDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 p-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            <BgTermLabel termKey="balans" />
            <span className="ml-2 text-sm font-normal" style={{ color: 'var(--text-muted)' }}>
              към {upToDate}
            </span>
          </h2>
          <HelpButton
            topic="ЗСч чл. 40 баланс активи пасиви собствен капитал"
            title="Баланс"
            pageContext="accounting-balance"
          />
        </div>
        <button onClick={handleExport}
          className="rounded-xl px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--accent)' }}>
          Скачать CSV
        </button>
      </div>

      {/* Balance check banner */}
      <div className="rounded-xl p-4 flex items-center gap-3"
        style={{
          backgroundColor: sheet.isBalanced ? 'var(--accent-light)' : 'var(--danger-light)',
          border: `1.5px solid ${sheet.isBalanced ? 'var(--accent)' : 'var(--danger)'}`,
        }}>
        <span className="text-2xl">{sheet.isBalanced ? '✅' : '❌'}</span>
        <div>
          <p className="font-semibold text-sm"
            style={{ color: sheet.isBalanced ? 'var(--accent-text)' : 'var(--danger-text)' }}>
            {sheet.isBalanced
              ? `Баланс сходится: ${sheet.totalAssets.toFixed(2)} € = ${sheet.totalPassive.toFixed(2)} €`
              : `Баланс НЕ сходится! Разница: ${sheet.difference.toFixed(2)} €`}
          </p>
          {!sheet.isBalanced && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--danger-text)' }}>
              Проверьте правильность введённых данных и полноту проводок
            </p>
          )}
        </div>
      </div>

      {/* Balance table */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* АКТИВИ */}
        <div className="rounded-xl shadow-sm overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          <div className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--accent-light)' }}>
            <BgTermLabel termKey="aktivy" className="text-sm font-bold uppercase" />
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {[
              { label: 'Дълготрайни активи (нето)', value: sheet.fixedAssets,  indent: false },
              { label: 'Вземания от клиенти',        value: sheet.debtors,      indent: true  },
              { label: 'Парични средства в банка',   value: sheet.bankBalance,  indent: true  },
            ].map((row) => (
              <div key={row.label}
                className="flex items-center justify-between py-2.5"
                style={{
                  backgroundColor: 'var(--surface-card)',
                  paddingLeft:  row.indent ? 32 : 16,
                  paddingRight: 16,
                }}>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {row.label}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {row.value.toFixed(2)} €
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ backgroundColor: 'var(--accent-light)' }}>
              <span className="text-sm font-bold" style={{ color: 'var(--accent-text)' }}>
                ОБЩО АКТИВИ
              </span>
              <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                {sheet.totalAssets.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>

        {/* ПАСИВИ */}
        <div className="rounded-xl shadow-sm overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          <div className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--danger-light)' }}>
            <BgTermLabel termKey="pasivi" className="text-sm font-bold uppercase" />
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {[
              { label: 'Собствен капитал',            value: sheet.capital        },
              { label: 'Текуща печалба (нето)',        value: sheet.currentProfit  },
              { label: 'Задължения към доставчици',    value: sheet.creditors      },
              { label: 'ДДС за внасяне',               value: sheet.vatPayable     },
              { label: 'Задължения към персонал',      value: sheet.salaryPayable  },
              { label: 'Данъчни задължения',           value: sheet.taxPayable     },
            ].filter((r) => r.value !== 0).map((row) => (
              <div key={row.label}
                className="flex items-center justify-between px-8 py-2.5"
                style={{ backgroundColor: 'var(--surface-card)' }}>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {row.label}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {row.value.toFixed(2)} €
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ backgroundColor: 'var(--danger-light)' }}>
              <span className="text-sm font-bold" style={{ color: 'var(--danger-text)' }}>
                ОБЩО ПАСИВИ
              </span>
              <span className="text-sm font-bold" style={{ color: 'var(--danger)' }}>
                {sheet.totalPassive.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced reconciliation (collapsed by default) */}
      <div>
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          {showAdvanced ? '▲' : '▼'} Сверка с банком (расширенный режим для бухгалтера)
        </button>
        {showAdvanced && (
          <div className="mt-3">
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Здесь можно сверить автоматически рассчитанные значения с банковской выпиской
              и актами сверки. Для обычной работы этого не требуется.
            </p>
            <ManualBalanceFields />
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl p-3"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Баланс построен автоматически из журнала проводок.
          Все значения вычисляются из двойных записей.
          Для официальной подачи в БРРА необходима проверка
          лицензированным счетоводителем.
        </p>
      </div>
    </div>
  )
}
