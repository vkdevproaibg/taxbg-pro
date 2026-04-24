import { useState } from 'react'
import { UNIT_TEST_SCENARIOS } from './testScenarios'

export default function UnitTestTab() {
  const [results, setResults] = useState<
    Record<string, { passed: boolean; details: string }>
  >({})
  const [running, setRunning] = useState<string | null>(null)

  const runAll = () => {
    const next: Record<string, { passed: boolean; details: string }> = {}
    for (const s of UNIT_TEST_SCENARIOS) {
      setRunning(s.id)
      try {
        next[s.id] = s.run()
      } catch (e: unknown) {
        next[s.id] = { passed: false, details: String(e) }
      }
    }
    setRunning(null)
    setResults(next)
  }

  const runOne = (id: string) => {
    const s = UNIT_TEST_SCENARIOS.find(x => x.id === id)
    if (!s) return
    setRunning(id)
    try {
      const r = s.run()
      setResults(prev => ({ ...prev, [id]: r }))
    } catch (e: unknown) {
      setResults(prev => ({ ...prev, [id]: { passed: false, details: String(e) } }))
    }
    setRunning(null)
  }

  const done = Object.keys(results).length
  const passed = Object.values(results).filter(r => r?.passed).length

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Unit Tests
          </h2>
          {done > 0 && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {passed}/{done} passed
            </p>
          )}
        </div>
        <button
          onClick={runAll}
          disabled={running !== null}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
        >
          {running ? 'Running...' : 'Run All'}
        </button>
      </div>

      <div className="space-y-3">
        {UNIT_TEST_SCENARIOS.map(s => {
          const r = results[s.id]
          return (
            <div
              key={s.id}
              className="rounded-xl border p-4"
              style={{
                borderColor: r === undefined
                  ? 'var(--border)'
                  : r.passed ? 'var(--accent)' : 'var(--danger)',
                backgroundColor: r === undefined
                  ? 'var(--surface-card)'
                  : r.passed ? 'var(--accent-light)' : 'var(--danger-light)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>
                    {r === undefined ? '⬜' : r.passed ? '✅' : '❌'}
                  </span>
                  <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    {s.name}
                  </span>
                </div>
                <button
                  onClick={() => runOne(s.id)}
                  disabled={running !== null}
                  className="text-xs px-3 py-1 rounded"
                  style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}
                >
                  Run
                </button>
              </div>
              {r && (
                <pre
                  className="mt-2 text-xs whitespace-pre-wrap font-mono"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {r.details}
                </pre>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
