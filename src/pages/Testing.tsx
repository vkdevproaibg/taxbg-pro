import TestRunnerTab from '../modules/testing/TestRunnerTab'

export default function Testing() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-card)' }}>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          🧪 Тестирование
        </h1>
      </div>
      <div className="flex-1 overflow-auto">
        <TestRunnerTab />
      </div>
    </div>
  )
}
