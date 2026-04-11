import { useNavigate } from 'react-router-dom'
import { useLearningStore } from '../../store/learningStore'
import type { Lesson } from '../../constants/lessons'

interface Props {
  lesson: Lesson
  onClose: () => void
  onNext?: () => void
}

const DIFF_META = {
  beginner:     { label: 'Начальный',   color: 'var(--accent)' },
  intermediate: { label: 'Средний',     color: '#f59e0b'       },
  advanced:     { label: 'Продвинутый', color: 'var(--danger)' },
}

export default function LessonViewer({ lesson, onClose, onNext }: Props) {
  const { markComplete, isCompleted } = useLearningStore()
  const navigate = useNavigate()
  const completed = isCompleted(lesson.id)
  const diff = DIFF_META[lesson.difficulty]

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">

      {/* Back */}
      <button onClick={onClose}
        className="text-sm" style={{ color: 'var(--text-muted)' }}>
        ← Все уроки
      </button>

      {/* Lesson header */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: diff.color + '20', color: diff.color }}>
            {diff.label}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            ~{lesson.durationMin} мин · {lesson.steps.length} {lesson.steps.length === 1 ? 'шаг' : 'шага'}
          </span>
          {completed && (
            <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              ✓ Пройден
            </span>
          )}
        </div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {lesson.icon} {lesson.title}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {lesson.subtitle}
        </p>
      </div>

      {/* All steps */}
      {lesson.steps.map((step, idx) => (
        <div key={idx} className="space-y-3">
          <div className="flex items-center gap-2">
            {lesson.steps.length > 1 && (
              <span className="w-6 h-6 rounded-full flex items-center justify-center
                               text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: 'var(--accent)' }}>
                {idx + 1}
              </span>
            )}
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {step.title}
            </h3>
          </div>

          <div className="text-sm leading-relaxed whitespace-pre-line"
            style={{ color: 'var(--text-secondary)' }}>
            {step.content}
          </div>

          {step.tip && (
            <div className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-text)' }}>
                💡 Совет
              </p>
              <p className="text-sm" style={{ color: 'var(--accent-text)' }}>{step.tip}</p>
            </div>
          )}

          {step.warning && (
            <div className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--danger-light)', border: '1px solid var(--danger)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--danger-text)' }}>
                ⚠️ Важно
              </p>
              <p className="text-sm" style={{ color: 'var(--danger-text)' }}>{step.warning}</p>
            </div>
          )}

          {step.example && (
            <div className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                📌 Пример
              </p>
              <p className="text-sm whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
                {step.example}
              </p>
            </div>
          )}

          {step.action && (
            <button
              onClick={() => { navigate(step.action!.path); onClose() }}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5
                         text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--accent)' }}>
              {step.action.label} →
            </button>
          )}

          {idx < lesson.steps.length - 1 && (
            <div className="border-b pt-3" style={{ borderColor: 'var(--border)' }} />
          )}
        </div>
      ))}

      {/* Legal basis */}
      {lesson.legalBasis && (
        <div className="rounded-xl p-3"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Правовая основа: {lesson.legalBasis}
          </p>
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t"
        style={{ borderColor: 'var(--border)' }}>
        {!completed && (
          <button
            onClick={() => markComplete(lesson.id)}
            className="rounded-xl px-6 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--accent)' }}>
            ✓ Урок пройден
          </button>
        )}
        {onNext && (
          <button
            onClick={() => { markComplete(lesson.id); onNext() }}
            className="rounded-xl px-4 py-2 text-sm"
            style={{ border: '1.5px solid var(--border)', color: 'var(--text-secondary)' }}>
            Следующий урок →
          </button>
        )}
        <button
          onClick={onClose}
          className="rounded-xl px-4 py-2 text-sm ml-auto"
          style={{ border: '1.5px solid var(--border)', color: 'var(--text-muted)' }}>
          ← Все уроки
        </button>
      </div>
    </div>
  )
}
