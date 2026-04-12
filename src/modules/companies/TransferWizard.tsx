import { useState } from 'react'
import { useUserStore, type AppLanguage } from '../../store/userStore'
import type { Company } from '../../store/companiesStore'
import {
  initiateTransfer,
  generateSellerArchive,
  markArchiveDownloaded,
  completeFullTransfer,
  completePartialTransfer,
  type TransferType,
} from '../../lib/companyTransfer'

// ── i18n helper ───────────────────────────────────────────

type L = Record<AppLanguage, string>
const pick = (l: L, lang: AppLanguage) => l[lang] ?? l.ru

const T = {
  title: {
    ru: 'Продажа / Передача компании',
    en: 'Sale / Transfer of company',
    bg: 'Продажба / Прехвърляне на дружество',
    uk: 'Продаж / Передача компанії',
  },
  close: { ru: 'Закрыть', en: 'Close', bg: 'Затвори', uk: 'Закрити' },
  back: { ru: 'Назад', en: 'Back', bg: 'Назад', uk: 'Назад' },
  next: { ru: 'Далее', en: 'Next', bg: 'Напред', uk: 'Далі' },

  step1Title: {
    ru: 'Шаг 1. Тип передачи',
    en: 'Step 1. Transfer type',
    bg: 'Стъпка 1. Вид прехвърляне',
    uk: 'Крок 1. Тип передачі',
  },
  type_full: {
    ru: 'Полная продажа (100%)',
    en: 'Full sale (100%)',
    bg: 'Пълна продажба (100%)',
    uk: 'Повний продаж (100%)',
  },
  type_full_desc: {
    ru: 'Вы продаёте все дяловете. После завершения вы теряете доступ к данным компании — обязательно скачайте архив за период своего управления.',
    en: 'You sell all shares. After completion you lose access — make sure to download the archive covering your management period.',
    bg: 'Продавате всички дялове. След завършване губите достъп до данните — задължително свалете архива за вашия период на управление.',
    uk: 'Ви продаєте всі частки. Після завершення ви втрачаєте доступ — обов\u2019язково завантажте архів за період вашого керування.',
  },
  type_partial: {
    ru: 'Частичная продажа',
    en: 'Partial sale',
    bg: 'Частична продажба',
    uk: 'Частковий продаж',
  },
  type_partial_desc: {
    ru: 'Новый съдружник влиза, вы остаётесь. Оба видите всю историю компании.',
    en: 'A new partner joins, you stay. Both of you see the full company history.',
    bg: 'Влиза нов съдружник, вие оставате. Двамата виждате цялата история на дружеството.',
    uk: 'Входить новий партнер, ви залишаєтесь. Обидва бачите всю історію компанії.',
  },
  type_inherit: {
    ru: 'Наследование',
    en: 'Inheritance',
    bg: 'Наследяване',
    uk: 'Спадкування',
  },
  type_inherit_desc: {
    ru: 'Передача после смерти собственника. Обрабатывается как полная передача.',
    en: 'Transfer after owner death. Handled like a full transfer.',
    bg: 'Прехвърляне след смърт на собственика. Обработва се като пълно прехвърляне.',
    uk: 'Передача після смерті власника. Обробляється як повна передача.',
  },
  type_gift: {
    ru: 'Дарение',
    en: 'Gift',
    bg: 'Дарение',
    uk: 'Дарування',
  },
  type_gift_desc: {
    ru: 'Безвозмездная передача дялове — родственнику или третьему лицу.',
    en: 'Gratuitous transfer of shares — to a relative or third party.',
    bg: 'Безвъзмездно прехвърляне на дялове — на роднина или трето лице.',
    uk: 'Безоплатна передача часток — родичу або третій особі.',
  },

  step2Title: {
    ru: 'Шаг 2. Данные покупателя',
    en: 'Step 2. Buyer details',
    bg: 'Стъпка 2. Данни на купувача',
    uk: 'Крок 2. Дані покупця',
  },
  buyerEmail: {
    ru: 'Email нового собственика',
    en: 'New owner email',
    bg: 'Email на новия собственик',
    uk: 'Email нового власника',
  },
  buyerEmailHint: {
    ru: 'Если у покупателя ещё нет аккаунта — он получит уведомление при регистрации с этим email.',
    en: 'If the buyer has no account yet, they will get a notification when they sign up with this email.',
    bg: 'Ако купувачът още няма акаунт — ще получи известие, когато се регистрира с този email.',
    uk: 'Якщо у покупця ще немає акаунта — він отримає сповіщення під час реєстрації з цією адресою.',
  },
  sharesPct: {
    ru: 'Процент дялове',
    en: 'Share percentage',
    bg: 'Процент дялове',
    uk: 'Відсоток часток',
  },
  transferDate: {
    ru: 'Дата вписання в ТР',
    en: 'Date of registry entry',
    bg: 'Дата на вписване в ТР',
    uk: 'Дата внесення до реєстру',
  },
  notaryAct: {
    ru: 'Номер нотариального акта (необязательно)',
    en: 'Notary act number (optional)',
    bg: 'Номер на нотариален акт (по желание)',
    uk: 'Номер нотаріального акту (необов\u2019язково)',
  },
  registryEntry: {
    ru: 'Номер вписання БРРА (необязательно)',
    en: 'Registry entry number (optional)',
    bg: 'Номер на вписване в БРРА (по желание)',
    uk: 'Номер запису в реєстрі (необов\u2019язково)',
  },

  step3Title: {
    ru: 'Шаг 3. Ваш период управления',
    en: 'Step 3. Your management period',
    bg: 'Стъпка 3. Вашият период на управление',
    uk: 'Крок 3. Ваш період керування',
  },
  periodFrom: {
    ru: 'Дата начала',
    en: 'Start date',
    bg: 'Начална дата',
    uk: 'Дата початку',
  },
  periodTo: {
    ru: 'Дата окончания',
    en: 'End date',
    bg: 'Крайна дата',
    uk: 'Кінцева дата',
  },
  periodExplain: {
    ru: 'Этот период определяет, какие документы войдут в ваш архив. Храните архив минимум 5 лет — это срок давности по ДОПК чл. 109.',
    en: 'This period defines which documents go into your archive. Keep it for at least 5 years — the statute of limitation under ДОПК art. 109.',
    bg: 'Този период определя кои документи ще влязат в архива ви. Съхранявайте го поне 5 години — давностен срок по ДОПК чл. 109.',
    uk: 'Цей період визначає, які документи потраплять до вашого архіву. Зберігайте щонайменше 5 років — строк давності за ДОПК ст. 109.',
  },

  step4Title: {
    ru: 'Шаг 4. Архив для вашей защиты',
    en: 'Step 4. Archive for your protection',
    bg: 'Стъпка 4. Архив за вашата защита',
    uk: 'Крок 4. Архів для вашого захисту',
  },
  genArchive: {
    ru: 'Сгенерировать архив за мой период',
    en: 'Generate archive for my period',
    bg: 'Генерирай архив за моя период',
    uk: 'Створити архів за мій період',
  },
  generating: {
    ru: 'Генерируем...',
    en: 'Generating...',
    bg: 'Генерираме...',
    uk: 'Створюємо...',
  },
  download: {
    ru: 'Скачать архив (ZIP)',
    en: 'Download archive (ZIP)',
    bg: 'Свали архива (ZIP)',
    uk: 'Завантажити архів (ZIP)',
  },
  ackCheckbox: {
    ru: 'Я скачал(а) архив и понимаю, что после завершения передачи потеряю доступ к данным этой компании',
    en: 'I downloaded the archive and understand I will lose access to this company after completion',
    bg: 'Свалих архива и разбирам, че след завършване на прехвърлянето ще загубя достъп до данните на това дружество',
    uk: 'Я завантажив(ла) архів і розумію, що після завершення передачі втрачу доступ до даних цієї компанії',
  },

  step5Title: {
    ru: 'Шаг 5. Подтверждение',
    en: 'Step 5. Confirmation',
    bg: 'Стъпка 5. Потвърждение',
    uk: 'Крок 5. Підтвердження',
  },
  summary_company: { ru: 'Компания', en: 'Company', bg: 'Дружество', uk: 'Компанія' },
  summary_buyer: { ru: 'Покупатель', en: 'Buyer', bg: 'Купувач', uk: 'Покупець' },
  summary_pct: { ru: 'Доля', en: 'Share', bg: 'Дял', uk: 'Частка' },
  summary_date: { ru: 'Дата', en: 'Date', bg: 'Дата', uk: 'Дата' },
  summary_type: { ru: 'Тип', en: 'Type', bg: 'Вид', uk: 'Тип' },
  warnFull: {
    ru: '⚠ После подтверждения ваш доступ к данным этой компании будет отозван. Убедитесь, что скачали архив.',
    en: '⚠ After confirmation your access to this company will be revoked. Make sure you downloaded the archive.',
    bg: '⚠ След потвърждението достъпът ви до данните на това дружество ще бъде отнет. Уверете се, че сте свалили архива.',
    uk: '⚠ Після підтвердження ваш доступ до даних цієї компанії буде відкликано. Переконайтеся, що ви завантажили архів.',
  },
  warnPartial: {
    ru: 'Ваш доступ сохраняется. Покупатель будет добавлен как соучастник после принятия компании.',
    en: 'Your access is kept. The buyer will be added as a partner once they accept.',
    bg: 'Вашият достъп се запазва. Купувачът ще бъде добавен като съдружник след приемането.',
    uk: 'Ваш доступ зберігається. Покупець буде доданий як партнер після прийняття.',
  },
  confirmBtn: {
    ru: 'Подтвердить передачу',
    en: 'Confirm transfer',
    bg: 'Потвърди прехвърлянето',
    uk: 'Підтвердити передачу',
  },

  pendingBuyer: {
    ru: 'Покупатель ещё не зарегистрирован — передача завершится после его регистрации с указанным email.',
    en: 'Buyer has not registered yet — the transfer will complete when they sign up with the given email.',
    bg: 'Купувачът още не е регистриран — прехвърлянето ще се завърши след регистрацията му с посочения email.',
    uk: 'Покупець ще не зареєстрований — передача завершиться після його реєстрації з вказаною адресою.',
  },
  done: {
    ru: 'Передача оформлена',
    en: 'Transfer recorded',
    bg: 'Прехвърлянето е оформено',
    uk: 'Передачу оформлено',
  },
  errorPrefix: { ru: 'Ошибка', en: 'Error', bg: 'Грешка', uk: 'Помилка' },
} satisfies Record<string, L>

// ── Component ─────────────────────────────────────────────

interface Props {
  company: Company
  onClose: () => void
}

type Step = 1 | 2 | 3 | 4 | 5 | 6

export default function TransferWizard({ company, onClose }: Props) {
  const language = useUserStore((s) => s.language)
  const t = (l: L) => pick(l, language)

  const [step, setStep] = useState<Step>(1)
  const [transferType, setTransferType] = useState<TransferType>('full_sale')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [sharesPct, setSharesPct] = useState(100)
  const today = new Date().toISOString().slice(0, 10)
  const [transferDate, setTransferDate] = useState(today)
  const [notaryAct, setNotaryAct] = useState('')
  const [registry, setRegistry] = useState('')
  const [periodFrom, setPeriodFrom] = useState(
    company.createdAt ? company.createdAt.slice(0, 10) : '',
  )
  const [periodTo, setPeriodTo] = useState(today)

  const [transferId, setTransferId] = useState<string | null>(null)
  const [archiveBlob, setArchiveBlob] = useState<Blob | null>(null)
  const [archiveGenerating, setArchiveGenerating] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [ack, setAck] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneMessage, setDoneMessage] = useState<string | null>(null)

  const isFull = transferType === 'full_sale' || transferType === 'inheritance'

  // Sync sharesPct when switching type
  const handleTypeChange = (tt: TransferType) => {
    setTransferType(tt)
    if (tt === 'full_sale' || tt === 'inheritance') setSharesPct(100)
    else if (sharesPct === 100) setSharesPct(50)
  }

  // ── Step handlers ───────────────────────────────────────

  const canProceedFrom2 =
    buyerEmail.trim().length > 0 &&
    /@/.test(buyerEmail) &&
    sharesPct > 0 &&
    sharesPct <= 100 &&
    transferDate.length > 0

  const canProceedFrom3 = periodFrom.length > 0 && periodTo.length > 0

  const canProceedFrom4 = isFull ? downloaded && ack : true

  const goNext = async () => {
    setError(null)
    if (step === 2) {
      // Create the transfer row when entering step 3 so archive gen has an id
      if (!transferId) {
        setSubmitting(true)
        const { id, error: err } = await initiateTransfer({
          companyId: company.id,
          transferType,
          buyerEmail,
          sharesPct,
          transferDate,
          notaryActNumber: notaryAct || undefined,
          registryEntry: registry || undefined,
          sellerManagementFrom: periodFrom || undefined,
          sellerManagementTo: periodTo || transferDate,
        })
        setSubmitting(false)
        if (err || !id) {
          setError(err ?? 'unknown')
          return
        }
        setTransferId(id)
      }
    }
    setStep((s) => (s < 5 ? ((s + 1) as Step) : s))
  }

  const goBack = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))

  const handleGenerate = async () => {
    if (!transferId) return
    setArchiveGenerating(true)
    setError(null)
    const { blob, error: err } = await generateSellerArchive(transferId)
    setArchiveGenerating(false)
    if (err || !blob) {
      setError(err ?? 'unknown')
      return
    }
    setArchiveBlob(blob)
  }

  const handleDownload = async () => {
    if (!archiveBlob || !transferId) return
    const url = URL.createObjectURL(archiveBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${company.name.replace(/\s+/g, '_')}_archive.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDownloaded(true)
    await markArchiveDownloaded(transferId)
  }

  const handleConfirm = async () => {
    if (!transferId) return
    setSubmitting(true)
    setError(null)
    const result =
      transferType === 'partial_sale' || transferType === 'gift'
        ? await completePartialTransfer(transferId)
        : await completeFullTransfer(transferId)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setDoneMessage(t(T.done))
    setStep(6)
  }

  // ── UI ──────────────────────────────────────────────────

  const inputStyle = {
    border: '1.5px solid var(--border)',
    backgroundColor: 'var(--surface)',
    color: 'var(--text-primary)',
    borderRadius: 12,
    padding: '8px 12px',
    fontSize: 13,
    width: '100%',
    outline: 'none',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden"
        style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t(T.title)}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {company.name} · ЕИК {company.eik || '—'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-lg px-2"
            style={{ color: 'var(--text-muted)' }}
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-auto">
          {/* Progress */}
          {step <= 5 && (
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className="h-1 flex-1 rounded-full"
                  style={{
                    backgroundColor:
                      step >= s ? 'var(--accent)' : 'var(--border)',
                  }}
                />
              ))}
            </div>
          )}

          {/* STEP 1 — type */}
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t(T.step1Title)}
              </h3>
              {([
                { id: 'full_sale' as const,    label: T.type_full,    desc: T.type_full_desc },
                { id: 'partial_sale' as const, label: T.type_partial, desc: T.type_partial_desc },
                { id: 'inheritance' as const,  label: T.type_inherit, desc: T.type_inherit_desc },
                { id: 'gift' as const,         label: T.type_gift,    desc: T.type_gift_desc },
              ]).map((opt) => {
                const active = transferType === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleTypeChange(opt.id)}
                    className="w-full text-left rounded-xl p-3 transition-colors"
                    style={{
                      border: active
                        ? '2px solid var(--accent)'
                        : '1.5px solid var(--border)',
                      backgroundColor: active ? 'var(--accent-light)' : 'var(--surface)',
                    }}
                  >
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {t(opt.label)}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {t(opt.desc)}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* STEP 2 — buyer */}
          {step === 2 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t(T.step2Title)}
              </h3>
              <div>
                <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {t(T.buyerEmail)} *
                </label>
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="buyer@example.com"
                  style={inputStyle}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {t(T.buyerEmailHint)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {t(T.sharesPct)} *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={sharesPct}
                    disabled={isFull}
                    onChange={(e) => setSharesPct(Number(e.target.value))}
                    style={{ ...inputStyle, opacity: isFull ? 0.6 : 1 }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {t(T.transferDate)} *
                  </label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {t(T.notaryAct)}
                  </label>
                  <input
                    value={notaryAct}
                    onChange={(e) => setNotaryAct(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {t(T.registryEntry)}
                  </label>
                  <input
                    value={registry}
                    onChange={(e) => setRegistry(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — management period */}
          {step === 3 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t(T.step3Title)}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {t(T.periodFrom)}
                  </label>
                  <input
                    type="date"
                    value={periodFrom}
                    onChange={(e) => setPeriodFrom(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {t(T.periodTo)}
                  </label>
                  <input
                    type="date"
                    value={periodTo}
                    onChange={(e) => setPeriodTo(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div
                className="rounded-xl p-3 text-xs"
                style={{
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent-text)',
                }}
              >
                {t(T.periodExplain)}
              </div>
            </div>
          )}

          {/* STEP 4 — archive */}
          {step === 4 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t(T.step4Title)}
              </h3>

              {!archiveBlob && !archiveGenerating && (
                <button
                  onClick={handleGenerate}
                  className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {t(T.genArchive)}
                </button>
              )}

              {archiveGenerating && (
                <div className="space-y-2">
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--border)' }}
                  >
                    <div
                      className="h-full animate-pulse"
                      style={{ backgroundColor: 'var(--accent)', width: '66%' }}
                    />
                  </div>
                  <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    {t(T.generating)}
                  </p>
                </div>
              )}

              {archiveBlob && (
                <>
                  <button
                    onClick={handleDownload}
                    className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {downloaded ? '✓ ' : ''}
                    {t(T.download)}
                  </button>

                  {isFull && (
                    <label
                      className="flex items-start gap-2 rounded-xl p-3 cursor-pointer"
                      style={{
                        border: '1.5px solid var(--border)',
                        backgroundColor: 'var(--surface)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={ack}
                        onChange={(e) => setAck(e.target.checked)}
                        disabled={!downloaded}
                        className="mt-0.5"
                      />
                      <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                        {t(T.ackCheckbox)}
                      </span>
                    </label>
                  )}
                </>
              )}
            </div>
          )}

          {/* STEP 5 — confirm */}
          {step === 5 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t(T.step5Title)}
              </h3>
              <div
                className="rounded-xl p-4 space-y-1.5 text-xs"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <div>
                  <b>{t(T.summary_company)}:</b> {company.name} · ЕИК {company.eik || '—'}
                </div>
                <div>
                  <b>{t(T.summary_type)}:</b> {t(
                    transferType === 'full_sale' ? T.type_full
                      : transferType === 'partial_sale' ? T.type_partial
                      : transferType === 'inheritance' ? T.type_inherit
                      : T.type_gift,
                  )}
                </div>
                <div>
                  <b>{t(T.summary_buyer)}:</b> {buyerEmail}
                </div>
                <div>
                  <b>{t(T.summary_pct)}:</b> {sharesPct}%
                </div>
                <div>
                  <b>{t(T.summary_date)}:</b> {transferDate}
                </div>
              </div>
              <div
                className="rounded-xl p-3 text-xs"
                style={
                  isFull
                    ? { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fbbf24' }
                    : { backgroundColor: 'var(--accent-light)', color: 'var(--accent-text)' }
                }
              >
                {isFull ? t(T.warnFull) : t(T.warnPartial)}
              </div>
            </div>
          )}

          {/* DONE */}
          {step === 6 && (
            <div className="space-y-3 py-8 text-center">
              <div className="text-4xl">✓</div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {doneMessage}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t(T.pendingBuyer)}
              </p>
            </div>
          )}

          {error && (
            <div
              className="rounded-xl p-3 text-xs"
              style={{
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                border: '1px solid #fca5a5',
              }}
            >
              {t(T.errorPrefix)}: {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-4 gap-2"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={step === 6 ? onClose : goBack}
            disabled={step === 1 || submitting}
            className="rounded-xl px-4 py-2 text-sm disabled:opacity-40"
            style={{ border: '1.5px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {step === 6 ? t(T.close) : t(T.back)}
          </button>

          {step < 5 && (
            <button
              onClick={goNext}
              disabled={
                submitting ||
                (step === 2 && !canProceedFrom2) ||
                (step === 3 && !canProceedFrom3) ||
                (step === 4 && !canProceedFrom4)
              }
              className="rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {t(T.next)}
            </button>
          )}

          {step === 5 && (
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: isFull ? '#dc2626' : 'var(--accent)' }}
            >
              {t(T.confirmBtn)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
