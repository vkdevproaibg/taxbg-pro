import { useEntryAuditStore } from '../../store/entryAuditStore'

interface Question {
  id: string
  block: string
  question: string
  hint?: string
  type: 'yes_no' | 'yes_no_unknown' | 'year' | 'month' | 'amount'
  showIf?: { id: string; value: string }
}

const QUESTIONS: Question[] = [
  // Company
  { id: 'foundedYear', block: 'Компания',
    question: 'С какого года работает компания?',
    hint: 'Год регистрации в БРРА',
    type: 'year' },

  // GFO
  { id: 'gfoAllYears', block: 'ГФО в БРРА',
    question: 'Публиковали ли ГФО (финансовый отчёт) в БРРА за все годы?',
    hint: 'Все ООД обязаны публиковать ежегодно',
    type: 'yes_no_unknown' },

  // DDS
  { id: 'isVatRegistered', block: 'ДДС',
    question: 'Зарегистрирована ли компания по ДДС?',
    type: 'yes_no' },
  { id: 'ddsAllMonths', block: 'ДДС',
    question: 'Подавались ли ДДС декларации за все месяцы?',
    hint: 'Ежемесячно до 14-го числа',
    type: 'yes_no_unknown',
    showIf: { id: 'isVatRegistered', value: 'yes' } },
  { id: 'ddsLastPeriod', block: 'ДДС',
    question: 'Последний закрытый ДДС период:',
    type: 'month',
    showIf: { id: 'ddsAllMonths', value: 'no' } },
  { id: 'ddsPendingAmount', block: 'ДДС',
    question: 'Есть ли неуплаченный ДДС? Введите сумму (0 если нет):',
    type: 'amount',
    showIf: { id: 'isVatRegistered', value: 'yes' } },

  // Employees
  { id: 'hasEmployees', block: 'Сотрудники',
    question: 'Есть ли официально трудоустроенные сотрудники?',
    type: 'yes_no' },
  { id: 'obrazec1AllMonths', block: 'Сотрудники',
    question: 'Подавался ли Образец 1 за все месяцы?',
    hint: 'До 25-го числа каждого месяца',
    type: 'yes_no_unknown',
    showIf: { id: 'hasEmployees', value: 'yes' } },
  { id: 'obrazec1LastPeriod', block: 'Сотрудники',
    question: 'Последний закрытый период Образец 1:',
    type: 'month',
    showIf: { id: 'obrazec1AllMonths', value: 'no' } },
  { id: 'osigDebt', block: 'Сотрудники',
    question: 'Есть ли задолженность по осигуровкам?',
    type: 'yes_no_unknown',
    showIf: { id: 'hasEmployees', value: 'yes' } },
  { id: 'osigDebtAmount', block: 'Сотрудники',
    question: 'Сумма задолженности по осигуровкам (€):',
    type: 'amount',
    showIf: { id: 'osigDebt', value: 'yes' } },

  // ZKPO
  { id: 'zkpoAllYears', block: 'ЗКПО',
    question: 'Подавалась ли годовая декларация ЗКПО за все годы?',
    hint: 'Ежегодно до 30 июня',
    type: 'yes_no_unknown' },
  { id: 'zkpoLastYear', block: 'ЗКПО',
    question: 'Последний год за который подана ЗКПО:',
    type: 'year',
    showIf: { id: 'zkpoAllYears', value: 'no' } },
  { id: 'knpDebt', block: 'ЗКПО',
    question: 'Есть ли неуплаченный корпоративный налог? Сумма (0 если нет):',
    type: 'amount' },

  // NSI
  { id: 'nsiAllYears', block: 'НСИ',
    question: 'Подавался ли годовой отчёт в НСИ за все годы?',
    hint: 'Срок подачи: 1 января — 30 июня',
    type: 'yes_no_unknown' },

  // Assets
  { id: 'hasAssets', block: 'Активы',
    question: 'Есть ли основные средства на балансе? (компьютеры, авто и т.п.)',
    type: 'yes_no' },
  { id: 'amortizationDone', block: 'Активы',
    question: 'Велась ли амортизация этих активов?',
    type: 'yes_no_unknown',
    showIf: { id: 'hasAssets', value: 'yes' } },

  // Dividends
  { id: 'dividendsPaid', block: 'Дивиденды',
    question: 'Выплачивались ли дивиденды собственнику?',
    type: 'yes_no' },
  { id: 'dividendsProtocol', block: 'Дивиденды',
    question: 'Оформлялись ли решения собственника (протоколы) при каждой выплате?',
    type: 'yes_no_unknown',
    showIf: { id: 'dividendsPaid', value: 'yes' } },
]

export default function DiagnosticStep({ onNext }: { onNext: () => void }) {
  const { diagnosticAnswers, setAnswer } = useEntryAuditStore()

  const visibleQuestions = QUESTIONS.filter(q => {
    if (!q.showIf) return true
    return diagnosticAnswers[q.showIf.id] === q.showIf.value
  })

  const answeredCount = visibleQuestions.filter(
    q => diagnosticAnswers[q.id] !== undefined
  ).length
  const allAnswered = answeredCount === visibleQuestions.length

  const inputStyle = {
    border: '1.5px solid var(--border)',
    backgroundColor: 'var(--surface)',
    color: 'var(--text-primary)',
    borderRadius: 12,
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
  }

  const blocks = [...new Set(visibleQuestions.map(q => q.block))]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Диагностика
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Ответьте на вопросы — система выявит незакрытые обязательства
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--border)' }}>
            <div className="h-1.5 rounded-full transition-all"
              style={{
                width: `${visibleQuestions.length > 0
                  ? (answeredCount / visibleQuestions.length) * 100 : 0}%`,
                backgroundColor: 'var(--accent)',
              }} />
          </div>
          <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
            {answeredCount}/{visibleQuestions.length}
          </span>
        </div>
      </div>

      {blocks.map((block) => (
        <div key={block}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-muted)' }}>
            {block}
          </h3>
          <div className="space-y-3">
            {visibleQuestions
              .filter(q => q.block === block)
              .map((q) => (
                <div key={q.id} className="rounded-xl p-4"
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--border)',
                  }}>
                  <p className="text-sm font-medium mb-1"
                    style={{ color: 'var(--text-primary)' }}>
                    {q.question}
                  </p>
                  {q.hint && (
                    <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                      {q.hint}
                    </p>
                  )}

                  {/* yes_no */}
                  {q.type === 'yes_no' && (
                    <div className="flex gap-2">
                      {[
                        { value: 'yes', label: 'Да'  },
                        { value: 'no',  label: 'Нет' },
                      ].map((opt) => (
                        <button key={opt.value}
                          onClick={() => setAnswer(q.id, opt.value)}
                          className="flex-1 rounded-xl py-2 text-sm font-medium transition-colors"
                          style={{
                            backgroundColor: diagnosticAnswers[q.id] === opt.value
                              ? 'var(--accent)' : 'var(--surface)',
                            color: diagnosticAnswers[q.id] === opt.value
                              ? '#fff' : 'var(--text-secondary)',
                            border: diagnosticAnswers[q.id] === opt.value
                              ? '1.5px solid var(--accent)'
                              : '1.5px solid var(--border)',
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* yes_no_unknown */}
                  {q.type === 'yes_no_unknown' && (
                    <div className="flex gap-2">
                      {[
                        { value: 'yes',     label: 'Да'      },
                        { value: 'no',      label: 'Нет'     },
                        { value: 'unknown', label: 'Не знаю' },
                      ].map((opt) => (
                        <button key={opt.value}
                          onClick={() => setAnswer(q.id, opt.value)}
                          className="flex-1 rounded-xl py-2 text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: diagnosticAnswers[q.id] === opt.value
                              ? opt.value === 'yes'     ? 'var(--accent)'
                                : opt.value === 'no'   ? 'var(--danger)'
                                : '#f59e0b'
                              : 'var(--surface)',
                            color: diagnosticAnswers[q.id] === opt.value
                              ? '#fff' : 'var(--text-secondary)',
                            border: diagnosticAnswers[q.id] === opt.value
                              ? '1.5px solid ' + (
                                  opt.value === 'yes'   ? 'var(--accent)'
                                  : opt.value === 'no' ? 'var(--danger)'
                                  : '#f59e0b'
                                )
                              : '1.5px solid var(--border)',
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* year */}
                  {q.type === 'year' && (
                    <select
                      value={diagnosticAnswers[q.id] ?? ''}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      style={{ ...inputStyle, width: '100%' }}>
                      <option value="">Выберите год...</option>
                      {Array.from(
                        { length: 15 },
                        (_, i) => new Date().getFullYear() - i
                      ).map((y) => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                  )}

                  {/* month */}
                  {q.type === 'month' && (
                    <input
                      type="month"
                      value={diagnosticAnswers[q.id] ?? ''}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      style={{ ...inputStyle, width: '100%' }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
                  )}

                  {/* amount */}
                  {q.type === 'amount' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={diagnosticAnswers[q.id] ?? ''}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'} />
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>€</span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}

      <button
        onClick={onNext}
        disabled={!allAnswered}
        className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40"
        style={{ backgroundColor: 'var(--accent)' }}>
        Анализировать →
      </button>
    </div>
  )
}
