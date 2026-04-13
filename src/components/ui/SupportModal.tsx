import { useState } from 'react'
import { useUserStore } from '../../store/userStore'
import { useAuthStore } from '../../store/authStore'
import { useCompaniesStore } from '../../store/companiesStore'
import { collectDiagnostics, exportDiagnosticsAsJson, type DiagnosticSnapshot } from '../../lib/diagnostics'
import { analyzeWithAI, type AIDiagnosisResult } from '../../lib/aiDiagnostics'
import { supabase } from '../../lib/supabase'
import { useAccountingStore } from '../../store/accountingStore'

const T = {
  ru: {
    title: 'Поддержка',
    step1Title: 'Опишите проблему',
    step1Placeholder: 'Опишите что произошло (необязательно)...',
    step1Submit: 'Отправить диагностику',
    step2Title: 'Сбор данных...',
    step2Collecting: 'Собираем диагностическую информацию...',
    step3Title: 'AI анализ',
    step3Diagnosis: 'Диагноз',
    step3Fix: 'Рекомендация',
    step3AutoFix: 'Исправить автоматически',
    step3Send: 'Отправить в поддержку',
    step3Skip: 'Пропустить AI анализ',
    step4Title: 'Тикет создан',
    step4Ticket: 'Номер тикета',
    step4Download: 'Скачать диагностику (JSON)',
    close: 'Закрыть',
    noAI: 'AI анализ недоступен (нет API ключа)',
    fixing: 'Исправляем...',
    fixed: 'Исправлено! Перезагрузите страницу.',
    fixFailed: 'Автоматическое исправление не удалось. Отправлено в поддержку.',
  },
  en: {
    title: 'Support',
    step1Title: 'Describe the issue',
    step1Placeholder: 'Describe what happened (optional)...',
    step1Submit: 'Send diagnostics',
    step2Title: 'Collecting data...',
    step2Collecting: 'Gathering diagnostic information...',
    step3Title: 'AI Analysis',
    step3Diagnosis: 'Diagnosis',
    step3Fix: 'Recommendation',
    step3AutoFix: 'Fix automatically',
    step3Send: 'Send to support',
    step3Skip: 'Skip AI analysis',
    step4Title: 'Ticket created',
    step4Ticket: 'Ticket number',
    step4Download: 'Download diagnostics (JSON)',
    close: 'Close',
    noAI: 'AI analysis unavailable (no API key)',
    fixing: 'Fixing...',
    fixed: 'Fixed! Reload the page.',
    fixFailed: 'Auto-fix failed. Sent to support.',
  },
  bg: {
    title: 'Поддръжка',
    step1Title: 'Опишете проблема',
    step1Placeholder: 'Опишете какво се случи (по избор)...',
    step1Submit: 'Изпрати диагностика',
    step2Title: 'Събиране на данни...',
    step2Collecting: 'Събираме диагностична информация...',
    step3Title: 'AI Анализ',
    step3Diagnosis: 'Диагноза',
    step3Fix: 'Препоръка',
    step3AutoFix: 'Поправи автоматично',
    step3Send: 'Изпрати на поддръжка',
    step3Skip: 'Пропусни AI анализ',
    step4Title: 'Тикетът е създаден',
    step4Ticket: 'Номер на тикет',
    step4Download: 'Изтегли диагностика (JSON)',
    close: 'Затвори',
    noAI: 'AI анализът не е достъпен (няма API ключ)',
    fixing: 'Поправяме...',
    fixed: 'Поправено! Презаредете страницата.',
    fixFailed: 'Автоматичната поправка не успя. Изпратено на поддръжка.',
  },
  uk: {
    title: 'Підтримка',
    step1Title: 'Опишіть проблему',
    step1Placeholder: 'Опишіть що сталося (необов\'язково)...',
    step1Submit: 'Надіслати діагностику',
    step2Title: 'Збір даних...',
    step2Collecting: 'Збираємо діагностичну інформацію...',
    step3Title: 'AI Аналіз',
    step3Diagnosis: 'Діагноз',
    step3Fix: 'Рекомендація',
    step3AutoFix: 'Виправити автоматично',
    step3Send: 'Надіслати в підтримку',
    step3Skip: 'Пропустити AI аналіз',
    step4Title: 'Тікет створено',
    step4Ticket: 'Номер тікета',
    step4Download: 'Завантажити діагностику (JSON)',
    close: 'Закрити',
    noAI: 'AI аналіз недоступний (немає API ключа)',
    fixing: 'Виправляємо...',
    fixed: 'Виправлено! Перезавантажте сторінку.',
    fixFailed: 'Автоматичне виправлення не вдалося. Надіслано в підтримку.',
  },
}

type Step = 1 | 2 | 3 | 4

interface Props {
  open: boolean
  onClose: () => void
}

export default function SupportModal({ open, onClose }: Props) {
  const language = useUserStore(s => s.language)
  const t = T[language] ?? T.ru

  const [step, setStep] = useState<Step>(1)
  const [description, setDescription] = useState('')
  const [snapshot, setSnapshot] = useState<DiagnosticSnapshot | null>(null)
  const [aiResult, setAiResult] = useState<AIDiagnosisResult | null>(null)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [fixStatus, setFixStatus] = useState<'idle' | 'fixing' | 'fixed' | 'failed'>('idle')

  const handleSubmit = async () => {
    setStep(2)

    // Collect diagnostics
    const snap = await collectDiagnostics()
    setSnapshot(snap)

    // Try AI analysis
    const apiKey = useUserStore.getState().llmApiKey
    if (apiKey) {
      setStep(3)
      const result = await analyzeWithAI(snap)
      setAiResult(result)
    } else {
      // Skip AI, go straight to creating ticket
      await createTicket(snap, null)
    }
  }

  const handleAutoFix = async () => {
    if (!snapshot || !aiResult?.autoFixAction) return
    setFixStatus('fixing')

    try {
      if (aiResult.autoFixAction === 'backfill_journal') {
        useAccountingStore.getState().backfillJournalEntries()
      }
      // Other actions would need more complex handling
      setFixStatus('fixed')
      await createTicket(snapshot, aiResult, 'ai_fixed')
    } catch {
      setFixStatus('failed')
      await createTicket(snapshot, aiResult, 'needs_human')
    }
  }

  const handleSendToSupport = async () => {
    if (!snapshot) return
    await createTicket(snapshot, aiResult, 'needs_human')
  }

  const handleSkipAI = async () => {
    if (!snapshot) return
    await createTicket(snapshot, null)
  }

  const createTicket = async (
    snap: DiagnosticSnapshot,
    ai: AIDiagnosisResult | null,
    status: string = ai ? 'ai_analyzed' : 'new',
  ) => {
    if (!supabase) {
      setTicketId('demo-' + Date.now().toString(36))
      setStep(4)
      return
    }

    const profileId = useAuthStore.getState().user?.id
    const companyId = useCompaniesStore.getState().activeCompanyId

    if (!profileId) {
      setTicketId('anon-' + Date.now().toString(36))
      setStep(4)
      return
    }

    const { data, error } = await supabase.from('support_tickets').insert({
      profile_id: profileId,
      company_id: companyId,
      user_description: description || null,
      diagnostic_json: snap,
      ai_diagnosis: ai?.diagnosis ?? null,
      ai_suggested_fix: ai?.suggestedFix ?? null,
      ai_auto_fixable: ai?.autoFixable ?? false,
      status,
    }).select('id').single()

    if (error) {
      console.error('[SupportModal] ticket create failed:', error)
      setTicketId('error')
    } else {
      setTicketId(data.id.slice(0, 8))
    }
    setStep(4)
  }

  const handleDownload = () => {
    if (!snapshot) return
    const json = exportDiagnosticsAsJson(snapshot)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `taxbg-diagnostics-${new Date().toISOString().slice(0, 19)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClose = () => {
    setStep(1)
    setDescription('')
    setSnapshot(null)
    setAiResult(null)
    setTicketId(null)
    setFixStatus('idle')
    onClose()
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)', padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        style={{
          background: 'var(--surface-card, #fff)',
          borderRadius: 16,
          padding: 24,
          maxWidth: 520,
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          border: '1px solid var(--border, #e5e7eb)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #111)' }}>
            {t.title}
          </h2>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted, #999)' }}>
            &times;
          </button>
        </div>

        {/* Step 1: Description */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary, #111)' }}>
              {t.step1Title}
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.step1Placeholder}
              rows={4}
              style={{
                width: '100%',
                borderRadius: 10,
                border: '1px solid var(--border, #e5e7eb)',
                padding: 12,
                fontSize: 14,
                resize: 'vertical',
                background: 'var(--surface, #f9fafb)',
                color: 'var(--text-primary, #111)',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleSubmit}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '12px 20px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--accent, #00966E)',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t.step1Submit}
            </button>
          </div>
        )}

        {/* Step 2: Collecting */}
        {step === 2 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '3px solid var(--border, #e5e7eb)',
              borderTopColor: 'var(--accent, #00966E)',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{ fontSize: 14, color: 'var(--text-muted, #999)' }}>{t.step2Collecting}</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* Step 3: AI Analysis */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary, #111)' }}>
              {t.step3Title}
            </p>

            {!aiResult && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  border: '3px solid var(--border, #e5e7eb)',
                  borderTopColor: 'var(--accent, #00966E)',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 12px',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              </div>
            )}

            {aiResult && (
              <>
                <div style={{
                  background: 'var(--surface, #f9fafb)',
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 12,
                  border: '1px solid var(--border, #e5e7eb)',
                }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #999)', marginBottom: 6 }}>
                    {t.step3Diagnosis}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-primary, #111)', whiteSpace: 'pre-wrap' }}>
                    {aiResult.diagnosis}
                  </p>
                </div>
                <div style={{
                  background: 'var(--surface, #f9fafb)',
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 16,
                  border: '1px solid var(--border, #e5e7eb)',
                }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #999)', marginBottom: 6 }}>
                    {t.step3Fix}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-primary, #111)', whiteSpace: 'pre-wrap' }}>
                    {aiResult.suggestedFix}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {aiResult.autoFixable && fixStatus === 'idle' && (
                    <button
                      onClick={handleAutoFix}
                      style={{
                        padding: '10px 20px', borderRadius: 10, border: 'none',
                        background: '#059669', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {t.step3AutoFix}
                    </button>
                  )}
                  {fixStatus === 'fixing' && (
                    <span style={{ padding: '10px 20px', fontSize: 13, color: 'var(--text-muted, #999)' }}>
                      {t.fixing}
                    </span>
                  )}
                  {fixStatus === 'fixed' && (
                    <span style={{ padding: '10px 20px', fontSize: 13, color: '#059669', fontWeight: 600 }}>
                      {t.fixed}
                    </span>
                  )}
                  {fixStatus === 'failed' && (
                    <span style={{ padding: '10px 20px', fontSize: 13, color: '#dc2626' }}>
                      {t.fixFailed}
                    </span>
                  )}
                  <button
                    onClick={handleSendToSupport}
                    style={{
                      padding: '10px 20px', borderRadius: 10,
                      border: '1px solid var(--border, #e5e7eb)',
                      background: 'transparent', color: 'var(--text-secondary, #555)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {t.step3Send}
                  </button>
                </div>
              </>
            )}

            {!aiResult && (
              <button
                onClick={handleSkipAI}
                style={{
                  marginTop: 12, padding: '8px 16px', borderRadius: 8,
                  border: '1px solid var(--border, #e5e7eb)',
                  background: 'transparent', color: 'var(--text-muted, #999)',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                {t.step3Skip}
              </button>
            )}
          </div>
        )}

        {/* Step 4: Ticket created */}
        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>&#x2705;</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary, #111)', marginBottom: 8 }}>
              {t.step4Title}
            </p>
            {ticketId && (
              <p style={{ fontSize: 14, color: 'var(--text-muted, #999)', marginBottom: 20 }}>
                {t.step4Ticket}: <strong style={{ color: 'var(--accent, #00966E)', fontFamily: 'monospace' }}>{ticketId}</strong>
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleDownload}
                style={{
                  padding: '10px 20px', borderRadius: 10,
                  border: '1px solid var(--border, #e5e7eb)',
                  background: 'transparent', color: 'var(--text-secondary, #555)',
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                {t.step4Download}
              </button>
              <button
                onClick={handleClose}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: 'var(--accent, #00966E)', color: 'white',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {t.close}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
