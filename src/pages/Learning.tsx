import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LessonsTab    from '../modules/learning/LessonsTab'
import TestRunnerTab from '../modules/testing/TestRunnerTab'
import { useLearningStore } from '../store/learningStore'
import { ALL_LESSONS } from '../constants/lessons'

type LearningTab = 'lessons' | 'testing'

export default function Learning() {
  const [tab, setTab] = useState<LearningTab>('lessons')
  const { getProgress } = useLearningStore()
  const navigate = useNavigate()
  const progress = getProgress()

  return (
    <div className="flex flex-col h-full">

      {/* Practical tours banner */}
      <div
        className="mx-6 mt-4 rounded-xl p-4 flex items-center
                   justify-between cursor-pointer"
        style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}
        onClick={() => navigate('/tours')}>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>
            🎯 Практические туры — учимся на живых страницах
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--accent-text)' }}>
            Пройдите интерактивные туры по ключевым сценариям работы
          </p>
        </div>
        <span style={{ color: 'var(--accent)' }}>→</span>
      </div>

      {/* Tab navigation */}
      <div className="border-b px-6 pt-4"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-card)' }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Обучение и тестирование
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-32 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--border)' }}>
              <div className="h-2 rounded-full"
                style={{ width: `${progress.pct}%`, backgroundColor: 'var(--accent)' }} />
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {progress.completed}/{ALL_LESSONS.length} уроков
            </span>
          </div>
        </div>

        <div className="flex gap-1">
          {([
            { id: 'lessons', label: '🎓 Учебный центр' },
            { id: 'testing', label: '🧪 Тестировщик'  },
          ] as { id: LearningTab; label: string }[]).map((t) => (
            <button key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
              style={{
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                backgroundColor: 'transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {tab === 'lessons' && <LessonsTab />}
        {tab === 'testing' && <TestRunnerTab />}
      </div>
    </div>
  )
}
