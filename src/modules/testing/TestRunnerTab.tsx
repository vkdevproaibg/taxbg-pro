import { useState } from 'react'
import { TEST_SCENARIOS } from './testScenarios'
import { runTestScenario } from './testEngine'
import type { TestResult, Assertion } from './assertionEngine'
import type { TestProgress } from './testEngine'

function AssertionRow({ assertion }: { assertion: Assertion }) {
  const STATUS = {
    pass:    { icon: '✅', color: 'var(--accent)',  bg: 'var(--accent-light)' },
    fail:    { icon: '❌', color: 'var(--danger)',  bg: 'var(--danger-light)' },
    warning: { icon: '⚠️', color: '#f59e0b',        bg: '#fffbeb'             },
  }
  const s = STATUS[assertion.status]

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b last:border-0"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-card)' }}>
      <span className="text-base shrink-0 mt-0.5">{s.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {assertion.title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {assertion.description}
        </p>
        {(assertion.expected || assertion.actual) && (
          <div className="flex gap-4 mt-1">
            {assertion.expected && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Ожидалось: <strong>{assertion.expected}</strong>
              </span>
            )}
            {assertion.actual && (
              <span className="text-xs" style={{ color: s.color }}>
                Получено: <strong>{assertion.actual}</strong>
              </span>
            )}
          </div>
        )}
        {assertion.id === 'balance-match' && assertion.status === 'fail' && (
          <div className="mt-2 rounded-lg p-3 text-xs"
            style={{ backgroundColor: '#fffbeb', border: '1px solid #f59e0b' }}>
            <p className="font-semibold mb-1" style={{ color: '#92400e' }}>
              Почему баланс не сходится?
            </p>
            <p style={{ color: '#92400e' }}>
              Баланс = Активы (банк + дебиторы + ОС) vs Пассивы (капитал + прибыль + обязательства).
              Разница означает что одна из сторон не учтена в проводках.
            </p>
            <p className="mt-1" style={{ color: '#92400e' }}>
              Что проверить: 1) Все ли доходные транзакции имеют проводку Дт 501 / Кт 703?
              2) Капитал компании внесён через проводку Дт 501 / Кт 102?
              3) Открыть строку "Диагностика баланса" в отчёте выше.
            </p>
          </div>
        )}
      </div>
      <span className="rounded-full px-2 py-0.5 text-xs shrink-0 font-medium"
        style={{ backgroundColor: s.bg, color: s.color }}>
        {assertion.severity}
      </span>
    </div>
  )
}

export default function TestRunnerTab() {
  const [running,    setRunning]    = useState(false)
  const [progress,   setProgress]   = useState<TestProgress | null>(null)
  const [result,     setResult]     = useState<TestResult | null>(null)
  const [activeScen, setActiveScen] = useState<string>('month')

  const scenario = TEST_SCENARIOS.find(s => s.id === activeScen)!

  const handleRun = async () => {
    setRunning(true)
    setResult(null)
    try {
      const res = await runTestScenario(scenario, setProgress)
      setResult(res)
    } finally {
      setRunning(false)
      setProgress(null)
    }
  }

  return (
    <div className="space-y-5 p-6">

      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          AI Тестировщик
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          E2E тест без LLM — проверяет всю систему синтетическими данными
        </p>
      </div>

      {/* Warning */}
      <div className="rounded-xl p-3"
        style={{ backgroundColor: '#fffbeb', border: '1px solid #f59e0b' }}>
        <p className="text-xs" style={{ color: '#92400e' }}>
          ⚠️ Тест создаёт и затем удаляет временные данные.
          Ваши реальные данные не затрагиваются.
          Не закрывайте вкладку во время теста.
        </p>
      </div>

      {/* Scenario selector */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TEST_SCENARIOS.map((s) => (
          <button key={s.id}
            onClick={() => { setActiveScen(s.id); setResult(null) }}
            className="rounded-xl p-4 text-left transition-all"
            style={{
              backgroundColor: activeScen === s.id ? 'var(--accent-light)' : 'var(--surface-card)',
              border: activeScen === s.id ? '2px solid var(--accent)' : '1px solid var(--border)',
            }}>
            <div className="text-2xl mb-2">{s.icon}</div>
            <p className="font-semibold text-sm"
              style={{ color: activeScen === s.id ? 'var(--accent-text)' : 'var(--text-primary)' }}>
              {s.name}
            </p>
            <p className="text-xs mt-1"
              style={{ color: activeScen === s.id ? 'var(--accent-text)' : 'var(--text-muted)' }}>
              {s.durationLabel}
            </p>
            <p className="text-xs mt-0.5"
              style={{ color: activeScen === s.id ? 'var(--accent-text)' : 'var(--text-muted)' }}>
              {s.description}
            </p>
          </button>
        ))}
      </div>

      {/* Scenario details */}
      <div className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--text-muted)' }}>
          Что будет создано:
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Сотрудников', value: scenario.employees.length          },
            { label: 'Транзакций',  value: `~${scenario.transactions.length}` },
            { label: 'Проверок',    value: '10'                               },
            { label: 'Компания',    value: scenario.company.name              },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                {item.value}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={running}
        className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40"
        style={{ backgroundColor: 'var(--accent)' }}>
        {running ? '⏳ Тест выполняется...' : `▶ Запустить: ${scenario.name}`}
      </button>

      {/* Progress */}
      {running && progress && (
        <div className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {progress.step}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {progress.current} / {progress.total}
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--border)' }}>
            <div className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(progress.current / progress.total) * 100}%`,
                backgroundColor: 'var(--accent)',
              }} />
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-xl overflow-hidden shadow-sm"
            style={{
              border: result.failCount === 0
                ? '1.5px solid var(--accent)'
                : '1.5px solid var(--danger)',
            }}>
            <div className="px-4 py-3 flex items-center justify-between"
              style={{
                backgroundColor: result.failCount === 0
                  ? 'var(--accent-light)'
                  : 'var(--danger-light)',
              }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {result.failCount === 0 ? '✅' : '❌'}
                </span>
                <span className="font-semibold text-sm"
                  style={{
                    color: result.failCount === 0 ? 'var(--accent-text)' : 'var(--danger-text)',
                  }}>
                  {result.failCount === 0
                    ? 'Все проверки пройдены!'
                    : `${result.failCount} ошибок обнаружено`}
                </span>
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {result.duration} мс
              </span>
            </div>

            <div className="grid grid-cols-3 divide-x"
              style={{ borderColor: 'var(--border)' }}>
              {[
                { label: '✅ Пройдено', value: result.passCount, color: 'var(--accent)' },
                { label: '❌ Ошибок',   value: result.failCount, color: 'var(--danger)' },
                { label: '⚠️ Warnings', value: result.warnCount, color: '#f59e0b'       },
              ].map((item) => (
                <div key={item.label} className="py-3 text-center"
                  style={{ backgroundColor: 'var(--surface-card)' }}>
                  <p className="text-2xl font-bold" style={{ color: item.color }}>
                    {item.value}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Assertions list */}
          <div className="rounded-xl shadow-sm overflow-hidden"
            style={{ border: '1px solid var(--border)' }}>
            <div className="px-4 py-3 border-b"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}>
                Детальный отчёт
              </p>
            </div>
            {result.assertions.map((a) => (
              <AssertionRow key={a.id} assertion={a} />
            ))}
          </div>

          {/* Re-run button */}
          <button onClick={handleRun}
            className="w-full rounded-xl py-2.5 text-sm font-medium"
            style={{
              border: '1.5px solid var(--border)',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--surface)',
            }}>
            🔄 Запустить снова
          </button>
        </div>
      )}
    </div>
  )
}
