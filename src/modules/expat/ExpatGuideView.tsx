import { useState } from 'react'
import { useUserStore } from '../../store/userStore'
import { llmChat } from '../../lib/llm'
import type {
  ExpatGuide,
  ExpatChecklistItem,
} from '../../constants/expat-guides'

// ── AI Research via llmChat (user's model from Settings) ──────

async function researchTopic(
  topic: string,
  guideTitle: string,
  language: string,
  userContext: string,
  apiKey?: string,
  model?: string
): Promise<string> {
  const langInstr =
    language === 'ru' ? 'Отвечай на русском языке.' :
    language === 'uk' ? 'Відповідай українською мовою.' :
    language === 'bg' ? 'Отговори на български език.'  :
    'Answer in English.'

  const systemPrompt = `Ты — практический консультант для
русско- и украиноязычных иностранцев в Болгарии (2025–2026).

Давай честные практические советы.
Чётко разграничивай закон и реальную практику.
Предупреждай о типичных ловушках и расхождениях.
${langInstr}

Структура ответа (без markdown):

Реальная ситуация:
[что происходит на практике прямо сейчас]

Практические советы:
· [совет]
· [совет]
· [совет]

Типичные ошибки:
· [ошибка]
· [ошибка]

Где искать актуальный опыт:
· [сообщество или ресурс]`

  const userMessage = `Тема: "${topic}"
Раздел: ${guideTitle}
${userContext}

Дай честный практический совет для иностранца
в Болгарии. Что реально происходит в 2025–2026,
чем отличается от закона, как избежать проблем?`

  const response = await llmChat(
    [{ role: 'user', content: userMessage }],
    {
      model,
      systemPrompt,
      maxTokens: 800,
      temperature: 0.4,
      apiKey,
    }
  )

  return response.content
}

// ── Checklist Item ────────────────────────────────────────────

function ChecklistItem({ item }: { item: ExpatChecklistItem }) {
  const [checked, setChecked] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const hasTheoryPractice = item.theoryNote || item.practiceNote

  return (
    <div
      className="border-b last:border-0"
      style={{ borderColor: 'var(--border)' }}>

      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:opacity-80"
        style={{
          backgroundColor: checked
            ? 'var(--accent-light)'
            : 'var(--surface-card)',
        }}
        onClick={() => setChecked(c => !c)}>

        {/* Checkbox */}
        <div
          className="w-5 h-5 rounded shrink-0 mt-0.5 flex items-center justify-center"
          style={{
            border: checked
              ? 'none'
              : '1.5px solid var(--border-strong)',
            backgroundColor: checked ? 'var(--accent)' : 'transparent',
          }}>
          {checked && <span className="text-white text-xs">✓</span>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={`text-sm font-medium ${checked ? 'line-through' : ''}`}
              style={{
                color: checked
                  ? 'var(--text-muted)'
                  : 'var(--text-primary)',
              }}>
              {item.title}
            </p>
            {item.isCritical && !checked && (
              <span
                className="rounded-full px-1.5 py-0.5 text-xs"
                style={{
                  backgroundColor: 'var(--danger-light)',
                  color: 'var(--danger)',
                }}>
                Важно
              </span>
            )}
            {hasTheoryPractice && !checked && (
              <span
                className="rounded-full px-1.5 py-0.5 text-xs"
                style={{
                  backgroundColor: '#fffbeb',
                  color: '#92400e',
                }}>
                ≠ практика
              </span>
            )}
          </div>

          {!checked && (
            <>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {item.description}
              </p>

              <div className="flex gap-3 mt-1.5 flex-wrap">
                {item.authority && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    📍 {item.authority}
                  </span>
                )}
                {item.deadline && (
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--danger)' }}>
                    ⏰ {item.deadline}
                  </span>
                )}
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline"
                    style={{ color: 'var(--accent)' }}
                    onClick={e => e.stopPropagation()}>
                    Открыть →
                  </a>
                )}
                {hasTheoryPractice && (
                  <button
                    className="text-xs underline"
                    style={{ color: '#92400e' }}
                    onClick={e => {
                      e.stopPropagation()
                      setExpanded(x => !x)
                    }}>
                    {expanded ? 'Скрыть ↑' : 'Теория vs практика ↓'}
                  </button>
                )}
              </div>

              {/* Theory vs Practice */}
              {expanded && hasTheoryPractice && (
                <div
                  className="mt-2 rounded-xl overflow-hidden"
                  onClick={e => e.stopPropagation()}>
                  {item.theoryNote && (
                    <div
                      className="px-3 py-2 border-b"
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                      }}>
                      <p
                        className="text-xs font-semibold mb-0.5"
                        style={{ color: 'var(--text-muted)' }}>
                        📋 По закону
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {item.theoryNote}
                      </p>
                    </div>
                  )}
                  {item.practiceNote && (
                    <div
                      className="px-3 py-2"
                      style={{ backgroundColor: '#fffbeb' }}>
                      <p
                        className="text-xs font-semibold mb-0.5"
                        style={{ color: '#92400e' }}>
                        🔄 На практике
                      </p>
                      <p className="text-xs" style={{ color: '#92400e' }}>
                        {item.practiceNote}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {item.warning && (
                <p
                  className="text-xs mt-1 font-medium"
                  style={{ color: 'var(--danger)' }}>
                  ⚠ {item.warning}
                </p>
              )}
              {item.tip && (
                <p className="text-xs mt-1" style={{ color: 'var(--accent-text)' }}>
                  💡 {item.tip}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── AI Research Panel ─────────────────────────────────────────

function AIResearchPanel({
  guideTitle,
  guideSummary,
}: {
  guideTitle: string
  guideSummary: string
}) {
  const { language, llmApiKey, llmModel } = useUserStore()
  const [question,  setQuestion]  = useState('')
  const [answer,    setAnswer]    = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [searched,  setSearched]  = useState(false)

  const QUICK_QUESTIONS = [
    'Какова реальная практика прямо сейчас?',
    'Типичные ошибки которые совершают иностранцы',
    'Что изменилось за последний год?',
    'Советы от русскоязычного сообщества в Болгарии',
  ]

  const handleSearch = async (q?: string) => {
    const query = q ?? question.trim()
    if (!query) return

    setLoading(true)
    setError('')
    setAnswer('')
    setSearched(true)

    try {
      const result = await researchTopic(
        query,
        guideTitle,
        language,
        `Раздел: ${guideTitle}. ${guideSummary}`,
        llmApiKey || undefined,
        llmModel || undefined,
      )
      setAnswer(result)
    } catch {
      setError(
        'Не удалось получить ответ. ' +
        'Проверьте API ключ в Настройках → AI модел.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1.5px solid var(--accent)' }}>

      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ backgroundColor: 'var(--accent-light)' }}>
        <span className="text-lg">🔍</span>
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: 'var(--accent-text)' }}>
            AI Актуальное исследование
          </p>
          <p className="text-xs" style={{ color: 'var(--accent-text)' }}>
            Использует вашу модель из Настроек → AI модел. Качество зависит от выбранной модели.
          </p>
        </div>
      </div>

      <div
        className="p-4 space-y-3"
        style={{ backgroundColor: 'var(--surface-card)' }}>

        {/* Quick questions */}
        <div className="flex gap-2 flex-wrap">
          {QUICK_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => {
                setQuestion(q)
                handleSearch(q)
              }}
              disabled={loading}
              className="rounded-xl px-3 py-1.5 text-xs transition-colors
                disabled:opacity-40"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}>
              {q}
            </button>
          ))}
        </div>

        {/* Custom question */}
        <div className="flex gap-2">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Задайте свой вопрос о реальной практике..."
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
            style={{
              border: '1.5px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            disabled={loading}
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading || !question.trim()}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white
              disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent)' }}>
            {loading ? '⏳' : '🔍'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-2 py-2">
            {[95, 85, 90, 70].map((w, i) => (
              <div
                key={i}
                className="h-3 rounded animate-pulse"
                style={{
                  width: `${w}%`,
                  backgroundColor: 'var(--border)',
                }}
              />
            ))}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              🔍 Ищу актуальную информацию...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="rounded-xl p-3"
            style={{
              backgroundColor: 'var(--danger-light)',
              border: '1px solid var(--danger)',
            }}>
            <p className="text-xs" style={{ color: 'var(--danger-text)' }}>
              {error}
            </p>
          </div>
        )}

        {/* Answer */}
        {answer && !loading && (
          <div className="space-y-2">
            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
              }}>
              <p
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: 'var(--text-secondary)' }}>
                {answer}
              </p>
            </div>
            <p className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>
              На основе AI · не является юридической консультацией
            </p>
          </div>
        )}

        {/* Empty state */}
        {!searched && !loading && (
          <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
            Выберите быстрый вопрос или напишите свой
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main Guide View ───────────────────────────────────────────

interface Props {
  guide: ExpatGuide
}

export default function ExpatGuideView({ guide }: Props) {
  const { language } = useUserStore()
  const [docsExpanded,      setDocsExpanded]      = useState(false)
  const [linksExpanded,     setLinksExpanded]      = useState(false)
  const [communityExpanded, setCommunityExpanded]  = useState(false)

  const nationalNote =
    language === 'ru' ? guide.forRussians :
    language === 'uk' ? guide.forUkrainians :
    null

  return (
    <div className="space-y-5 p-6 max-w-2xl mx-auto">

      {/* Title */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{guide.icon}</span>
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}>
            {guide.title}
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {guide.subtitle}
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      {guide.disclaimer && (
        <div
          className="rounded-xl p-3 flex items-start gap-2"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
          }}>
          <span className="text-sm shrink-0">ℹ️</span>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {guide.disclaimer}
          </p>
        </div>
      )}

      {/* Summary */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
        }}>
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}>
          {guide.summary}
        </p>
        {guide.practiceNote && (
          <div
            className="mt-3 pt-3 border-t"
            style={{ borderColor: 'var(--border)' }}>
            <p
              className="text-xs font-semibold mb-1"
              style={{ color: '#92400e' }}>
              🔄 Реальная практика
            </p>
            <p className="text-xs" style={{ color: '#92400e' }}>
              {guide.practiceNote}
            </p>
          </div>
        )}
      </div>

      {/* National note */}
      {nationalNote && (
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{
            backgroundColor: 'var(--accent-light)',
            border: '1px solid var(--accent)',
          }}>
          <span className="text-lg shrink-0">
            {language === 'ru' ? '🇷🇺' : '🇺🇦'}
          </span>
          <p className="text-sm" style={{ color: 'var(--accent-text)' }}>
            {nationalNote}
          </p>
        </div>
      )}

      {/* Warnings */}
      {guide.warnings.length > 0 && (
        <div className="space-y-2">
          {guide.warnings.map((w, i) => (
            <div
              key={i}
              className="rounded-xl p-3 flex items-start gap-2"
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #f59e0b',
              }}>
              <span className="text-sm shrink-0">⚠️</span>
              <p className="text-xs" style={{ color: '#92400e' }}>{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      {guide.tips.length > 0 && (
        <div
          className="rounded-xl p-4 space-y-1.5"
          style={{
            backgroundColor: 'var(--accent-light)',
            border: '1px solid var(--accent)',
          }}>
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--accent-text)' }}>
            💡 Советы из практики
          </p>
          {guide.tips.map((tip, i) => (
            <p key={i} className="text-xs" style={{ color: 'var(--accent-text)' }}>
              · {tip}
            </p>
          ))}
        </div>
      )}

      {/* ── AI Research Panel ── */}
      <AIResearchPanel
        guideTitle={guide.title}
        guideSummary={guide.summary}
      />

      {/* Checklist */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}>
            Пошаговый чеклист
          </h3>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {guide.checklist.length} шагов
          </span>
        </div>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          {guide.checklist.map(item => (
            <ChecklistItem key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* Documents — collapsible */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}>
        <button
          onClick={() => setDocsExpanded(e => !e)}
          className="w-full flex items-center justify-between px-4 py-3"
          style={{ backgroundColor: 'var(--surface)' }}>
          <div className="flex items-center gap-2">
            <span>📋</span>
            <span className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}>
              Необходимые документы
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-xs"
              style={{
                backgroundColor: 'var(--accent-light)',
                color: 'var(--accent)',
              }}>
              {guide.documents.filter(d => d.required).length} обязательных
            </span>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {docsExpanded ? '▲' : '▼'}
          </span>
        </button>

        {docsExpanded && (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {guide.documents.map((doc, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-2.5"
                style={{ backgroundColor: 'var(--surface-card)' }}>
                <span className="text-sm shrink-0 mt-0.5">
                  {doc.required ? '✅' : '⬜'}
                </span>
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {doc.name}
                  </p>
                  {doc.notes && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {doc.notes}
                    </p>
                  )}
                </div>
                <span
                  className="ml-auto text-xs shrink-0"
                  style={{
                    color: doc.required
                      ? 'var(--danger)'
                      : 'var(--text-muted)',
                  }}>
                  {doc.required ? 'Обязательно' : 'Желательно'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Community links */}
      {guide.communityLinks && guide.communityLinks.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          <button
            onClick={() => setCommunityExpanded(e => !e)}
            className="w-full flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: 'var(--surface)' }}>
            <div className="flex items-center gap-2">
              <span>👥</span>
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}>
                Сообщества и форумы
              </span>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {communityExpanded ? '▲' : '▼'}
            </span>
          </button>

          {communityExpanded && (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {guide.communityLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between px-4 py-2.5
                    hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: 'var(--surface-card)' }}>
                  <span className="text-sm" style={{ color: 'var(--accent)' }}>
                    {link.label}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    →
                  </span>
                </a>
              ))}
              <div
                className="px-4 py-2"
                style={{ backgroundColor: 'var(--surface)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  💡 В этих группах — актуальный опыт людей
                  которые прошли этот путь недавно
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Official links */}
      {guide.links.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          <button
            onClick={() => setLinksExpanded(e => !e)}
            className="w-full flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: 'var(--surface)' }}>
            <div className="flex items-center gap-2">
              <span>🔗</span>
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}>
                Официальные ссылки
              </span>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {linksExpanded ? '▲' : '▼'}
            </span>
          </button>

          {linksExpanded && (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {guide.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between px-4 py-2.5
                    hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: 'var(--surface-card)' }}>
                  <span className="text-sm" style={{ color: 'var(--accent)' }}>
                    {link.label}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    →
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
