import { useMemo, useState } from 'react'
import { useUserStore } from '../store/userStore'
import { useAuthStore } from '../store/authStore'
import { useAccountingStore } from '../store/accountingStore'
import { useEmployeesStore } from '../store/employeesStore'
import { useJournalStore } from '../store/journalStore'
import {
  generateExplanatoryNote,
  generateExplanatoryNotePdf,
  getApplicableTemplates,
  type GeneratedNote,
} from '../lib/auditDocGenerator'
import { useExportWithWarning } from '../hooks/useExportWithWarning'
import ExportWarningModal from '../components/ui/ExportWarningModal'
import { generateAuditAnswer } from '../lib/auditLLM'
import type { AuditTemplate, AuditLang } from '../constants/audit-templates'
import { trackEvent } from '../lib/analytics'

type Category = AuditTemplate['category']

const T = {
  ru: {
    pageTitle: 'Помощь при проверке НАП / НОИ',
    pageSubtitle:
      'Готовые документы для ответа на типовые вопросы налогового инспектора. Текст на болгарском — для инспектора, перевод — для вас.',
    catAll: 'Все',
    catVat: 'ДДС',
    catOsig: 'Осигуровки',
    catZkpo: 'ЗКПО',
    catLabor: 'Трудовое',
    catAccounting: 'Бухгалтерия',
    empty: 'Нет применимых шаблонов для этих настроек компании',
    generate: 'Сгенерировать документ',
    statusReady: 'Данные заполнены',
    statusMissing: 'Требуется ручное заполнение',
    inspectorHeader: 'Для инспектора (BG)',
    userHeader: 'Для вас',
    copyBg: 'Копировать болгарский',
    copyBoth: 'Копировать оба',
    copied: 'Скопировано',
    close: 'Закрыть',
    warningMissing:
      'В тексте есть поля, отмеченные ___ — заполните их вручную перед передачей документа.',
    customTitle: 'Нестандартный вопрос инспектора',
    customDesc:
      'Если среди готовых шаблонов нет подходящего — введите вопрос своими словами и система подготовит ответ на основе данных вашей компании.',
    customPlaceholder: 'Например: почему у вас расходы по аренде выше средних для сектора?',
    prepareAnswer: 'Подготовить ответ',
    preparing: 'Готовим ответ...',
    noApiKey:
      'Настройте LLM ключ в Настройки, чтобы использовать эту функцию.',
    llmWarning:
      'Этот ответ сгенерирован ИИ на основе данных системы. Проверьте перед использованием.',
    llmFailed: 'Не удалось подготовить ответ. Попробуйте ещё раз.',
    downloadPdf: 'Скачать PDF',
  },
  en: {
    pageTitle: 'Tax Audit Help (NRA / NOI)',
    pageSubtitle:
      'Ready-made explanatory notes for typical inspector questions. The Bulgarian text is for the inspector; the translation is for you.',
    catAll: 'All',
    catVat: 'VAT',
    catOsig: 'Social insurance',
    catZkpo: 'Corporate tax',
    catLabor: 'Labour',
    catAccounting: 'Accounting',
    empty: 'No applicable templates for the current company profile',
    generate: 'Generate document',
    statusReady: 'Data complete',
    statusMissing: 'Manual fill required',
    inspectorHeader: 'For the inspector (BG)',
    userHeader: 'For you',
    copyBg: 'Copy Bulgarian',
    copyBoth: 'Copy both',
    copied: 'Copied',
    close: 'Close',
    warningMissing:
      'The text contains ___ placeholders — fill them in manually before handing the document over.',
    customTitle: 'Custom inspector question',
    customDesc:
      "If none of the ready templates fit, type the inspector's question and the system will draft an answer using your company's data.",
    customPlaceholder:
      'E.g. why are your rental expenses higher than the sector average?',
    prepareAnswer: 'Prepare answer',
    preparing: 'Preparing answer...',
    noApiKey:
      'Configure your LLM API key in Settings to use this feature.',
    llmWarning:
      'This answer was AI-generated from your system data. Please review before use.',
    llmFailed: 'Failed to prepare an answer. Please try again.',
    downloadPdf: 'Download PDF',
  },
  bg: {
    pageTitle: 'Помощ при ревизия (НАП / НОИ)',
    pageSubtitle:
      'Готови обяснителни записки за типични въпроси на данъчен инспектор. Българският текст е за инспектора; преводът — за вас.',
    catAll: 'Всички',
    catVat: 'ДДС',
    catOsig: 'Осигуровки',
    catZkpo: 'ЗКПО',
    catLabor: 'Трудово право',
    catAccounting: 'Счетоводство',
    empty: 'Няма приложими шаблони за настоящия профил на компанията',
    generate: 'Генерирай документ',
    statusReady: 'Данните са налични',
    statusMissing: 'Необходимо ръчно попълване',
    inspectorHeader: 'За инспектора (BG)',
    userHeader: 'За вас',
    copyBg: 'Копирай български',
    copyBoth: 'Копирай двата',
    copied: 'Копирано',
    close: 'Затвори',
    warningMissing:
      'Текстът съдържа полета, маркирани с ___ — попълнете ги ръчно преди предаване на документа.',
    customTitle: 'Друг въпрос на инспектора',
    customDesc:
      'Ако сред готовите шаблони няма подходящ — въведете въпроса и системата ще подготви отговор на базата на данните за вашата компания.',
    customPlaceholder:
      'Например: защо разходите за наем са над средното за сектора?',
    prepareAnswer: 'Подготви отговор',
    preparing: 'Подготвяме отговор...',
    noApiKey:
      'Настройте LLM ключ в Настройки за да използвате тази функция.',
    llmWarning:
      'Този отговор е генериран от ИИ на база данни от системата. Проверете го преди употреба.',
    llmFailed: 'Неуспешно подготвяне на отговор. Опитайте отново.',
    downloadPdf: 'Изтегли PDF',
  },
  uk: {
    pageTitle: 'Допомога при перевірці НАП / НОІ',
    pageSubtitle:
      'Готові пояснювальні записки для типових питань податкового інспектора. Болгарський текст — для інспектора, переклад — для вас.',
    catAll: 'Усі',
    catVat: 'ДДВ',
    catOsig: 'Соц. внески',
    catZkpo: 'ЗКПО',
    catLabor: 'Трудове',
    catAccounting: 'Облік',
    empty: 'Немає застосовних шаблонів для поточного профілю компанії',
    generate: 'Згенерувати документ',
    statusReady: 'Дані повні',
    statusMissing: 'Потрібно ручне заповнення',
    inspectorHeader: 'Для інспектора (BG)',
    userHeader: 'Для вас',
    copyBg: 'Скопіювати болгарський',
    copyBoth: 'Скопіювати обидва',
    copied: 'Скопійовано',
    close: 'Закрити',
    warningMissing:
      'У тексті є поля, позначені ___ — заповніть їх вручну перед передачею документа.',
    customTitle: 'Нестандартне питання інспектора',
    customDesc:
      'Якщо серед готових шаблонів немає відповідного — введіть питання своїми словами, і система підготує відповідь на основі даних вашої компанії.',
    customPlaceholder:
      'Наприклад: чому витрати на оренду вищі за середні для сектору?',
    prepareAnswer: 'Підготувати відповідь',
    preparing: 'Готуємо відповідь...',
    noApiKey:
      'Налаштуйте LLM ключ у Налаштуваннях, щоб використовувати цю функцію.',
    llmWarning:
      'Цю відповідь згенеровано ШІ на основі даних системи. Перевірте перед використанням.',
    llmFailed: 'Не вдалося підготувати відповідь. Спробуйте ще раз.',
    downloadPdf: 'Завантажити PDF',
  },
}

const CATEGORIES: Array<{ id: Category | 'all'; labelKey: keyof (typeof T)['ru'] }> = [
  { id: 'all',        labelKey: 'catAll' },
  { id: 'vat',        labelKey: 'catVat' },
  { id: 'osig',       labelKey: 'catOsig' },
  { id: 'zkpo',       labelKey: 'catZkpo' },
  { id: 'labor',      labelKey: 'catLabor' },
  { id: 'accounting', labelKey: 'catAccounting' },
]

export default function AuditHelp() {
  const language = (useUserStore(s => s.language) || 'ru') as AuditLang
  const labels = T[language] ?? T.ru

  const { companyName, eik, legalForm, hasVat, hasEmployees } = useUserStore()
  const profile = useAuthStore(s => s.profile)
  const transactions = useAccountingStore(s => s.transactions)
  const employees = useEmployeesStore(s => s.employees)
  const journalEntries = useJournalStore(s => s.entries)
  const llmApiKey = useUserStore(s => s.llmApiKey)

  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all')
  const [generated, setGenerated] = useState<GeneratedNote | null>(null)
  const [copiedTag, setCopiedTag] = useState<string | null>(null)

  const applicableTemplates = useMemo(
    () => getApplicableTemplates({ legalForm, hasVat, hasEmployees }),
    [legalForm, hasVat, hasEmployees],
  )

  const filteredTemplates = useMemo(
    () =>
      selectedCategory === 'all'
        ? applicableTemplates
        : applicableTemplates.filter(t => t.category === selectedCategory),
    [applicableTemplates, selectedCategory],
  )

  const ownerName = profile?.full_name ?? ''

  const { exportWithWarning, confirm: confirmExport, closeModal: closeExportModal, pending: pendingExport, isOpen: isExportModalOpen } = useExportWithWarning()

  const handleDownloadPdf = (templateId: string) => {
    exportWithWarning({
      documentName: `explanatory_note_${templateId}.pdf`,
      retentionClass: 'accounting_10y',
      legalBasis: 'Закон за счетоводството, чл. 12',
      onConfirm: async () => {
        const pdfBytes = await generateExplanatoryNotePdf(
          templateId,
          {
            companyName,
            eik,
            ownerName,
            legalForm,
            hasVat,
            hasEmployees,
            transactions,
            employees,
            journalEntries,
          },
          language,
        )
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `explanatory_note_${templateId}.pdf`
        a.click()
        URL.revokeObjectURL(url)
        trackEvent('document_exported', { format: 'pdf' })
      },
    })
  }

  const handleGenerate = (templateId: string) => {
    const note = generateExplanatoryNote(
      templateId,
      {
        companyName,
        eik,
        ownerName,
        legalForm,
        hasVat,
        hasEmployees,
        transactions,
        employees,
        journalEntries,
      },
      language,
    )
    if (note) {
      setGenerated(note)
      trackEvent('audit_template_used', { templateId })
    }
  }

  const copy = async (text: string, tag: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedTag(tag)
      setTimeout(() => setCopiedTag(null), 1500)
    } catch {
      // Ignore — some sandboxes block clipboard.
    }
  }

  // ── Custom LLM question state ──
  const [customQuestion, setCustomQuestion] = useState('')
  const [llmLoading, setLlmLoading] = useState(false)
  const [llmResult, setLlmResult] = useState<{ bg: string; userLang: string } | null>(null)
  const [llmError, setLlmError] = useState<string | null>(null)

  const handlePrepareAnswer = async () => {
    setLlmError(null)
    setLlmResult(null)
    if (!llmApiKey) {
      setLlmError(labels.noApiKey)
      return
    }
    if (!customQuestion.trim()) return

    setLlmLoading(true)
    const answer = await generateAuditAnswer({
      question: customQuestion.trim(),
      companyName,
      eik,
      legalForm,
      hasVat,
      hasEmployees,
      transactions,
      employees,
      userLanguage: language,
      apiKey: llmApiKey,
    })
    setLlmLoading(false)
    if (!answer) {
      setLlmError(labels.llmFailed)
      return
    }
    setLlmResult(answer)
  }

  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {labels.pageTitle}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {labels.pageSubtitle}
        </p>
      </header>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedCategory === cat.id
                ? 'bg-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {labels[cat.labelKey]}
          </button>
        ))}
      </div>

      {/* Templates list */}
      {filteredTemplates.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {labels.empty}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {filteredTemplates.map(tpl => {
          const note = generateExplanatoryNote(
            tpl.id,
            {
              companyName,
              eik,
              ownerName,
              legalForm,
              hasVat,
              hasEmployees,
              transactions,
              employees,
              journalEntries,
            },
            language,
          )
          const ready = note && !note.hasMissing

          return (
            <div
              key={tpl.id}
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {tpl.question[language]}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {tpl.hint[language]}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs"
                  style={{
                    backgroundColor: ready ? '#dcfce7' : '#fef3c7',
                    color: ready ? '#15803d' : '#b45309',
                  }}
                >
                  <span className="text-sm leading-none">●</span>
                  {ready ? labels.statusReady : labels.statusMissing}
                </span>
                <button
                  onClick={() => handleGenerate(tpl.id)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium"
                  style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                >
                  {labels.generate}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Custom LLM question section ── */}
      <section
        className="rounded-xl p-5 space-y-3"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
        }}
      >
        <div>
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {labels.customTitle}
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {labels.customDesc}
          </p>
        </div>

        <textarea
          value={customQuestion}
          onChange={e => setCustomQuestion(e.target.value)}
          rows={3}
          placeholder={labels.customPlaceholder}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
          style={{ borderColor: 'var(--border)' }}
        />

        {llmError && (
          <div
            className="rounded-lg px-3 py-2 text-xs"
            style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
          >
            {llmError}
          </div>
        )}

        <div className="flex items-center justify-end">
          <button
            onClick={handlePrepareAnswer}
            disabled={llmLoading || !customQuestion.trim()}
            className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            {llmLoading ? labels.preparing : labels.prepareAnswer}
          </button>
        </div>

        {llmResult && (
          <div className="space-y-3">
            <div
              className="rounded-lg px-3 py-2 text-xs"
              style={{ backgroundColor: '#fef3c7', color: '#b45309' }}
            >
              ⚠ {labels.llmWarning}
            </div>
            <BilingualView
              bg={llmResult.bg}
              userLang={llmResult.userLang}
              labels={labels}
              onCopy={copy}
              copiedTag={copiedTag}
              tagPrefix="llm"
            />
          </div>
        )}
      </section>

      {/* Modal — template output */}
      {generated && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
          onClick={() => setGenerated(null)}
        >
          <div
            className="w-full max-w-4xl rounded-xl p-5 max-h-[92vh] overflow-auto space-y-3"
            style={{
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h3
                className="text-base font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {generated.templateUsed}
              </h3>
              <button
                onClick={() => setGenerated(null)}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                {labels.close}
              </button>
            </div>

            {generated.hasMissing && (
              <div
                className="rounded-lg px-3 py-2 text-xs"
                style={{ backgroundColor: '#fef3c7', color: '#b45309' }}
              >
                ⚠ {labels.warningMissing}
              </div>
            )}

            <BilingualView
              bg={generated.bg}
              userLang={generated.userLang}
              labels={labels}
              onCopy={copy}
              copiedTag={copiedTag}
              tagPrefix="tpl"
            />

            <button
              onClick={() => handleDownloadPdf(generated.templateUsed)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              {labels.downloadPdf}
            </button>
          </div>
        </div>
      )}

      {pendingExport && (
        <ExportWarningModal
          isOpen={isExportModalOpen}
          onClose={closeExportModal}
          onConfirm={confirmExport}
          documentName={pendingExport.documentName}
          retentionClass={pendingExport.retentionClass}
          retainUntil={pendingExport.retainUntil}
          legalBasis={pendingExport.legalBasis}
        />
      )}
    </div>
  )
}

function BilingualView({
  bg,
  userLang,
  labels,
  onCopy,
  copiedTag,
  tagPrefix,
}: {
  bg: string
  userLang: string
  labels: (typeof T)['ru']
  onCopy: (text: string, tag: string) => void
  copiedTag: string | null
  tagPrefix: string
}) {
  const bgTag = `${tagPrefix}-bg`
  const bothTag = `${tagPrefix}-both`

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <div
          className="rounded-lg p-3"
          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            {labels.inspectorHeader}
          </p>
          <pre
            className="text-xs whitespace-pre-wrap font-sans"
            style={{ color: 'var(--text-primary)' }}
          >
            {bg}
          </pre>
        </div>
        <div
          className="rounded-lg p-3"
          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            {labels.userHeader}
          </p>
          <pre
            className="text-xs whitespace-pre-wrap font-sans"
            style={{ color: 'var(--text-primary)' }}
          >
            {userLang}
          </pre>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onCopy(bg, bgTag)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium"
          style={{
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent)',
          }}
        >
          {copiedTag === bgTag ? `✓ ${labels.copied}` : labels.copyBg}
        </button>
        <button
          onClick={() => onCopy(`${bg}\n\n---\n\n${userLang}`, bothTag)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          {copiedTag === bothTag ? `✓ ${labels.copied}` : labels.copyBoth}
        </button>
      </div>
    </>
  )
}
