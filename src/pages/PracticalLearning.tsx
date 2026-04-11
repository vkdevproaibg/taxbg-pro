import { useNavigate } from 'react-router-dom'
import { ALL_TOURS } from '../constants/tours'
import { useTourStore } from '../store/tourStore'

export default function PracticalLearning() {
  const { startTour, completedTours } = useTourStore()
  const navigate = useNavigate()

  const handleStart = (tour: typeof ALL_TOURS[0]) => {
    startTour(tour, true)
    const firstNav = tour.steps.find((s) => s.navigateTo)?.navigateTo
    if (firstNav) navigate(firstNav)
    else navigate('/')
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className="border-b px-6 pt-4 pb-4"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-card)' }}>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          🎯 Практикум
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Учимся работать с системой на реальных страницах.
          Данные туров изолированы от ваших рабочих данных.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Recommended sequence note */}
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'var(--accent-light)',
              border: '1px solid var(--accent)',
            }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-text)' }}>
              💡 Рекомендуем пройти туры по порядку
            </p>
            <p className="text-xs" style={{ color: 'var(--accent-text)' }}>
              Каждый тур строится на предыдущем.
              Начните с "Первый месяц компании".
            </p>
          </div>

          {ALL_TOURS.map((tour, idx) => {
            const done     = completedTours.includes(tour.id)
            const prevDone = idx === 0 || completedTours.includes(ALL_TOURS[idx - 1].id)

            return (
              <div
                key={tour.id}
                className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${done ? 'var(--accent)' : 'var(--border)'}` }}>
                <div
                  className="flex items-start gap-4 p-4"
                  style={{ backgroundColor: done ? 'var(--accent-light)' : 'var(--surface-card)' }}>

                  {/* Step number + connector */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center
                                  justify-center text-sm font-bold"
                      style={{
                        backgroundColor: done ? 'var(--accent)' : 'var(--border)',
                        color: done ? 'white' : 'var(--text-muted)',
                      }}>
                      {done ? '✓' : idx + 1}
                    </div>
                    {idx < ALL_TOURS.length - 1 && (
                      <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{tour.icon}</span>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: done ? 'var(--accent-text)' : 'var(--text-primary)' }}>
                            {tour.title}
                          </p>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {tour.subtitle}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            ⏱ ~{tour.durationMin} мин
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {tour.steps.length} шагов
                          </span>
                          {done && (
                            <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                              ✓ Пройден
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleStart(tour)}
                        disabled={!prevDone && !done}
                        className="rounded-xl px-4 py-2 text-xs font-semibold shrink-0
                                   disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: done
                            ? 'transparent'
                            : !prevDone
                              ? 'var(--border)'
                              : 'var(--accent)',
                          color: done
                            ? 'var(--accent)'
                            : !prevDone
                              ? 'var(--text-muted)'
                              : 'white',
                          border: done ? '1.5px solid var(--accent)' : 'none',
                        }}>
                        {done ? 'Повторить' : !prevDone ? 'Заблокировано' : 'Начать →'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
