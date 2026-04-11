import { useState } from 'react'
import { useLearningStore } from '../../store/learningStore'
import { LESSON_BLOCKS, ALL_LESSONS } from '../../constants/lessons'
import type { Lesson } from '../../constants/lessons'
import LessonViewer from './LessonViewer'
import { usePaywall } from '../../hooks/usePaywall'
import PaywallModal from '../../components/ui/PaywallModal'

const DIFF_META = {
  beginner:     { label: 'Начальный',   color: '#10b981' },
  intermediate: { label: 'Средний',     color: '#f59e0b' },
  advanced:     { label: 'Продвинутый', color: '#ef4444' },
}

function LessonCard({
  lesson,
  completed,
  isLocked,
  onStart,
}: {
  lesson: Lesson
  completed: boolean
  isLocked: boolean
  onStart: () => void
}) {
  const diff = DIFF_META[lesson.difficulty]

  return (
    <button
      onClick={onStart}
      className="w-full text-left rounded-xl p-4 transition-all hover:opacity-90"
      style={{
        backgroundColor: isLocked
          ? 'var(--surface)'
          : completed ? 'var(--accent-light)' : 'var(--surface-card)',
        border: isLocked
          ? '1px solid var(--border)'
          : completed ? '1.5px solid var(--accent)' : '1px solid var(--border)',
        opacity: isLocked ? 0.7 : 1,
      }}>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{isLocked ? '🔒' : lesson.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm"
              style={{ color: completed ? 'var(--accent-text)' : 'var(--text-primary)' }}>
              {lesson.title}
            </p>
            {completed && !isLocked && (
              <span className="text-xs" style={{ color: 'var(--accent)' }}>✓</span>
            )}
            {isLocked && (
              <span className="rounded-full px-2 py-0.5 text-xs"
                style={{ backgroundColor: 'var(--border)', color: 'var(--text-muted)' }}>
                Pro
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5 truncate"
            style={{ color: completed ? 'var(--accent-text)' : 'var(--text-muted)' }}>
            {lesson.subtitle}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="rounded-full px-2 py-0.5 text-xs"
              style={{ backgroundColor: diff.color + '20', color: diff.color }}>
              {diff.label}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              ~{lesson.durationMin} мин · {lesson.steps.length} шага
            </span>
          </div>
        </div>
        <span className="text-lg shrink-0" style={{ color: 'var(--text-muted)' }}>›</span>
      </div>
    </button>
  )
}

export default function LessonsTab() {
  const { isCompleted, getProgress } = useLearningStore()
  const { canAccessLesson } = usePaywall()
  const [activeLesson,  setActiveLesson]  = useState<Lesson | null>(null)
  const [filterBlock,   setFilterBlock]   = useState<number | 'all'>('all')
  const [showPaywall,   setShowPaywall]   = useState(false)

  const progress       = getProgress()
  const completedCount = ALL_LESSONS.filter(l => isCompleted(l.id)).length

  if (activeLesson) {
    const currentLessonIdx = ALL_LESSONS.findIndex(
      l => l.id === activeLesson.id
    )
    const nextLesson = ALL_LESSONS[currentLessonIdx + 1] ?? null

    return (
      <LessonViewer
        lesson={activeLesson}
        onClose={() => setActiveLesson(null)}
        onNext={nextLesson
          ? () => setActiveLesson(nextLesson)
          : undefined}
      />
    )
  }

  return (
    <div className="space-y-6 p-6">

      {/* Header + progress */}
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Учебный центр
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Уроки по болгарскому налогообложению и бухгалтерии
        </p>

        <div className="rounded-xl p-4"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Прогресс обучения
            </span>
            <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
              {completedCount} / {ALL_LESSONS.length} уроков
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--border)' }}>
            <div className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress.pct}%`, backgroundColor: 'var(--accent)' }} />
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            {progress.pct}% пройдено
            {progress.pct === 100 && ' · 🎓 Отличная работа!'}
          </p>
        </div>
      </div>

      {/* Block filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterBlock('all')}
          className="rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            backgroundColor: filterBlock === 'all' ? 'var(--accent)' : 'var(--surface-card)',
            color: filterBlock === 'all' ? '#fff' : 'var(--text-secondary)',
            border: filterBlock === 'all' ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
          }}>
          Все блоки
        </button>
        {LESSON_BLOCKS.map((block) => (
          <button key={block.id}
            onClick={() => setFilterBlock(block.id)}
            className="rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: filterBlock === block.id ? 'var(--accent)' : 'var(--surface-card)',
              color: filterBlock === block.id ? '#fff' : 'var(--text-secondary)',
              border: filterBlock === block.id
                ? '1.5px solid var(--accent)'
                : '1.5px solid var(--border)',
            }}>
            {block.icon} {block.title}
          </button>
        ))}
      </div>

      {showPaywall && (
        <PaywallModal reason="lesson_locked" onClose={() => setShowPaywall(false)} />
      )}

      {/* Blocks and lessons */}
      <div className="space-y-6">
        {LESSON_BLOCKS
          .filter((b) => filterBlock === 'all' || b.id === filterBlock)
          .map((block) => {
            const blockCompleted = block.lessons.filter(l => isCompleted(l.id)).length
            return (
              <div key={block.id}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-2"
                      style={{ color: 'var(--text-primary)' }}>
                      <span>{block.icon}</span>
                      {block.title}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {block.description}
                    </p>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {blockCompleted}/{block.lessons.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {block.lessons.map((lesson) => {
                    const globalIdx = ALL_LESSONS.findIndex(l => l.id === lesson.id)
                    const isLocked  = !canAccessLesson(globalIdx)
                    return (
                      <LessonCard
                        key={lesson.id}
                        lesson={lesson}
                        completed={isCompleted(lesson.id)}
                        isLocked={isLocked}
                        onStart={() => {
                          if (isLocked) { setShowPaywall(true); return }
                          setActiveLesson(lesson)
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
