import { useState } from 'react'
import { useEntryAuditStore } from '../../store/entryAuditStore'
import { analyzeAnswers } from './entryAuditEngine'
import DiagnosticStep  from './DiagnosticStep'
import AuditReportStep from './AuditReportStep'
import ClosurePlanStep from './ClosurePlanStep'
import OpeningBalances from './OpeningBalances'

type AuditPhase = 'diagnostic' | 'report' | 'plan' | 'balances'

const PHASE_LABELS: Record<AuditPhase, string> = {
  diagnostic: 'Диагностика',
  report:     'Результаты',
  plan:       'План закрытия',
  balances:   'Начальные остатки',
}

interface Props {
  onComplete: () => void
}

export default function EntryAuditWizard({ onComplete }: Props) {
  const [phase, setPhase]               = useState<AuditPhase>('diagnostic')
  const { diagnosticAnswers, setIssues } = useEntryAuditStore()

  const phases: AuditPhase[] = ['diagnostic', 'report', 'plan', 'balances']
  const phaseIndex = phases.indexOf(phase)

  const handleDiagnosticNext = () => {
    const issues = analyzeAnswers(diagnosticAnswers)
    setIssues(issues)
    setPhase('report')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--surface)' }}>
      <div className="mx-auto max-w-2xl px-4 py-8">

        {/* Phase stepper */}
        <div className="flex items-center justify-between mb-8">
          {phases.map((p, i) => (
            <div key={p} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: i <= phaseIndex ? 'var(--accent)' : 'var(--surface-card)',
                    color: i <= phaseIndex ? '#fff' : 'var(--text-muted)',
                    border: i <= phaseIndex ? 'none' : '1.5px solid var(--border)',
                  }}>
                  {i < phaseIndex ? '✓' : i + 1}
                </div>
                <span className="text-xs mt-1 hidden sm:block"
                  style={{ color: i === phaseIndex ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {PHASE_LABELS[p]}
                </span>
              </div>
              {i < phases.length - 1 && (
                <div className="w-12 sm:w-24 h-0.5 mx-2"
                  style={{ backgroundColor: i < phaseIndex ? 'var(--accent)' : 'var(--border)' }} />
              )}
            </div>
          ))}
        </div>

        {/* Phase content */}
        {phase === 'diagnostic' && <DiagnosticStep onNext={handleDiagnosticNext} />}
        {phase === 'report'     && <AuditReportStep onNext={() => setPhase('plan')} />}
        {phase === 'plan'       && <ClosurePlanStep onNext={() => setPhase('balances')} />}
        {phase === 'balances'   && <OpeningBalances onComplete={onComplete} />}
      </div>
    </div>
  )
}
