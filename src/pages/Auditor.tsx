import { useMemo, useEffect, useState } from 'react'
import { useUserStore } from '../store/userStore'
import { useAccountingStore } from '../store/accountingStore'
import { useEmployeesStore } from '../store/employeesStore'
import { useCompaniesStore } from '../store/companiesStore'
import { useLegislationStore } from '../store/legislationStore'
import { buildAuditReport } from '../lib/riskEngine'
import type { Risk, RiskLevel } from '../lib/riskEngine'
import {
  loadPushConfig, savePushConfig, requestPushPermission,
  isPushSupported, getPushPermission,
  checkAndSendNotifications,
} from '../lib/pushNotifications'
import HelpButton from '../components/ui/HelpButton'
import { useT } from '../lib/useT'
import { useDataReadiness } from '../lib/dataReadiness'
import EmptyState from '../components/ui/EmptyState'

const LEVEL_META: Record<RiskLevel, { label: string; color: string; bg: string; dot: string }> = {
  critical: { label: 'Критично', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  high: { label: 'Высокий', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
  medium: { label: 'Средний', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
  low: { label: 'Низкий', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-400' },
  info: { label: 'Инфо', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', dot: 'bg-slate-300' },
}

function RiskCard({ risk }: { risk: Risk }) {
  const t = useT()
  const meta = LEVEL_META[risk.level]
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${meta.bg}`}>
      <div className="flex items-start gap-2 flex-wrap">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold border ${meta.bg} ${meta.color}`}>
          {meta.label}
        </span>
        {risk.legalBasis && (
          <span className="text-xs text-slate-400">{risk.legalBasis}</span>
        )}
        {risk.daysUntil !== undefined && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            risk.daysUntil < 0
              ? 'bg-red-100 text-red-700'
              : risk.daysUntil <= 3
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {risk.daysUntil < 0
              ? `Просрочено ${Math.abs(risk.daysUntil)} дн.`
              : risk.daysUntil === 0
              ? 'Сегодня!'
              : `Через ${risk.daysUntil} дн.`}
          </span>
        )}
        {risk.penaltyAmount && (
          <span className="text-xs font-medium text-red-600">
            штраф: {risk.penaltyAmount}
          </span>
        )}
        <div className="ml-auto">
          <HelpButton
            topic={`${risk.legalBasis ?? risk.title} риск аудит`}
            title={risk.title}
            pageContext="auditor"
          />
        </div>
      </div>

      <p className="font-medium text-slate-800">{risk.title}</p>
      <p className="text-sm text-slate-600 leading-relaxed">{risk.description}</p>

      <div className="rounded-lg bg-white/60 border border-white px-3 py-2">
        <p className="text-xs font-medium text-slate-500 mb-0.5">{t('auditor_recommendation')}:</p>
        <p className="text-sm text-slate-700">{risk.suggestedAction}</p>
      </div>
    </div>
  )
}

function HealthGauge({ score }: { score: number }) {
  const t = useT()
  const color =
    score >= 80 ? 'text-green-600' :
    score >= 60 ? 'text-amber-500' :
    score >= 40 ? 'text-orange-500' : 'text-red-600'

  const label =
    score >= 80 ? 'Хорошо' :
    score >= 60 ? 'Внимание' :
    score >= 40 ? 'Риски' : 'Критично'

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm text-center">
      <div className={`text-5xl font-bold ${color}`}>{score}</div>
      <div className={`text-sm font-medium mt-1 ${color}`}>{label}</div>
      <div className="text-xs text-slate-400 mt-1">{t('auditor_health')} · макс. 100</div>
    </div>
  )
}

export default function Auditor() {
  const t = useT()
  const readiness = useDataReadiness()
  const { legalForm, companyName, taxPeriod, hasVat, hasEmployees, eik } = useUserStore()
  const transactions = useAccountingStore((s) => s.transactions)
  const employees = useEmployeesStore((s) => s.employees)
  const activeCompanyId = useCompaniesStore((s) => s.activeCompanyId)
  const pendingCorrectionsCount = useLegislationStore((s) =>
    activeCompanyId ? s.getPendingCorrectionsCount(activeCompanyId) : 0,
  )

  const [pushConfig, setPushConfig] = useState(loadPushConfig)
  const [pushPermission, setPushPermission] = useState(getPushPermission)
  const [filterLevel, setFilterLevel] = useState<RiskLevel | 'all'>('all')

  const report = useMemo(() =>
    buildAuditReport({
      legalForm,
      companyName,
      taxPeriod,
      hasVat,
      hasEmployees,
      transactions,
      employees,
      eik,
      pendingCorrectionsCount,
    }),
  [legalForm, companyName, taxPeriod, hasVat, hasEmployees, transactions, employees, eik, pendingCorrectionsCount])

  // Send push notifications when report is ready
  useEffect(() => {
    checkAndSendNotifications(report.risks, pushConfig)
  }, [report, pushConfig])

  const handleEnablePush = async () => {
    const granted = await requestPushPermission()
    setPushPermission(granted ? 'granted' : 'denied')
    if (granted) {
      const newConfig = { ...pushConfig, enabled: true }
      setPushConfig(newConfig)
      savePushConfig(newConfig)
    }
  }

  if (!readiness.isReady) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          {t('page_auditor')}
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Болгарский налоговый адвокат · анализ рисков в реальном времени
        </p>
        <EmptyState
          icon="🛡️"
          title="Данные ещё не введены"
          subtitle="Аудитор анализирует реальные данные вашей компании. Для работы нужно заполнить профиль и добавить первые транзакции."
          missingSteps={readiness.missingSteps}
        />
      </div>
    )
  }

  const filtered = filterLevel === 'all'
    ? report.risks
    : report.risks.filter((r) => r.level === filterLevel)

  const counts = {
    critical: report.risks.filter((r) => r.level === 'critical').length,
    high: report.risks.filter((r) => r.level === 'high').length,
    medium: report.risks.filter((r) => r.level === 'medium').length,
    low: report.risks.filter((r) => r.level === 'low').length,
  }

  return (
    <div className="space-y-5 p-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('page_auditor')}</h1>
          <p className="mt-1 text-sm text-slate-400">
            Болгарский налоговый адвокат · анализ рисков в реальном времени
          </p>
        </div>
        <div className="text-xs text-slate-400">
          Обновлено: {new Date(report.generatedAt).toLocaleTimeString('ru-RU')}
        </div>
      </div>

      {/* Health score + summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HealthGauge score={report.healthScore} />
        {([
          { label: t('auditor_critical'), value: counts.critical, color: 'text-red-600' },
          { label: t('auditor_high'),     value: counts.high,           color: 'text-orange-500' },
          { label: t('auditor_total'),    value: report.totalCount,     color: 'text-slate-700' },
        ] as { label: string; value: number; color: string }[]).map((item) => (
          <div key={item.label}
            className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm text-center">
            <div className={`text-3xl font-bold ${item.color}`}>{item.value}</div>
            <div className="text-xs text-slate-400 mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Push notifications setup */}
      {isPushSupported() && (
        <div className={`rounded-xl border p-4 ${
          pushPermission === 'granted' && pushConfig.enabled
            ? 'border-green-100 bg-green-50'
            : 'border-slate-100 bg-white'
        }`}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-medium text-slate-700">
                🔔 {t('auditor_push_title')}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {pushPermission === 'granted' && pushConfig.enabled
                  ? `Включены · уведомления за ${pushConfig.daysBeforeDeadline.join(', ')} дн.`
                  : pushPermission === 'denied'
                  ? 'Заблокированы браузером — разрешите в настройках браузера'
                  : 'Получайте напоминания за 7, 3 и 1 день до дедлайна'}
              </p>
            </div>
            {pushPermission !== 'denied' && !(pushPermission === 'granted' && pushConfig.enabled) && (
              <button onClick={handleEnablePush}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
                {t('auditor_enable_push')}
              </button>
            )}
            {pushPermission === 'granted' && pushConfig.enabled && (
              <button
                onClick={() => {
                  const newConfig = { ...pushConfig, enabled: false }
                  setPushConfig(newConfig)
                  savePushConfig(newConfig)
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                Отключить
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter by level */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterLevel('all')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
            filterLevel === 'all'
              ? 'bg-slate-800 text-white border-slate-800'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}>
          Все ({report.totalCount})
        </button>
        {(Object.entries(LEVEL_META) as [RiskLevel, typeof LEVEL_META[RiskLevel]][])
          .filter(([level]) => counts[level as keyof typeof counts] > 0)
          .map(([level, meta]) => (
            <button key={level}
              onClick={() => setFilterLevel(level === filterLevel ? 'all' : level)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                filterLevel === level
                  ? `${meta.bg} ${meta.color}`
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}>
              {meta.label} ({counts[level as keyof typeof counts]})
            </button>
          ))
        }
      </div>

      {/* Risk list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-green-200 bg-green-50 p-8 text-center">
          <div className="text-3xl mb-2">✅</div>
          <p className="font-medium text-green-700">{t('auditor_no_risks')}</p>
          <p className="text-sm text-green-600 mt-1">
            {filterLevel === 'all'
              ? 'Все обязательства выполнены, данные в порядке'
              : `Нет рисков уровня "${LEVEL_META[filterLevel].label}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((risk) => (
            <RiskCard key={risk.id} risk={risk} />
          ))}
        </div>
      )}

      {/* Footer disclaimer */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-400">
        Аудит выполнен на основе данных введенных в приложение. Для юридически значимых решений
        рекомендуется консультация с лицензированным болгарским счетоводителем или адвокатом.
        Актуальность данных: законодательство Болгарии 2026 год.
      </div>
    </div>
  )
}
