import { supabase } from './supabase'
import { useAuthStore } from '../store/authStore'
import { useCompaniesStore } from '../store/companiesStore'
import { useUserStore, type AppLanguage } from '../store/userStore'

export type RetentionClass =
  | 'payroll_50y'
  | 'accounting_10y'
  | 'tax_control_extended'
  | 'general_3y'
  | 'legal_hold'
  | 'manual_delete'

export type AckType = 'download_warning' | 'export_warning'

export const EXPORT_WARNING_TITLES: Record<AppLanguage, string> = {
  ru: 'Важно: ответственность за хранение документов',
  en: 'Important: document retention responsibility',
  bg: 'Важно: отговорност за съхранение на документи',
  uk: 'Важливо: відповідальність за зберігання документів',
}

export const EXPORT_WARNING_TEXTS: Record<AppLanguage, string> = {
  ru: `По болгарскому законодательству (ЗСч чл. 47, ДОПК чл. 38) ответственность за хранение документов несёт руководитель предприятия.

Сроки хранения:
• Бухгалтерские документы — 10 лет (ЗСч чл. 47)
• Зарплатные ведомости — 50 лет (наредба МЛСП)
• Данъчни документи — до изтичане на давностния срок + 1 год

TaxBG Pro обеспечивает хранение на своих серверах не более 1 года. После этого данные удаляются безвозвратно.

Скачивая этот документ, вы подтверждаете, что:
1. Понимаете сроки хранения
2. Обеспечите хранение документа в течение установленного законом срока
3. TaxBG Pro не несёт ответственности за утрату документов после удаления с серверов`,

  en: `Under Bulgarian law (Accounting Act art. 47, Tax Procedure Code art. 38), responsibility for retaining documents lies with the head of the enterprise.

Retention periods:
• Accounting documents — 10 years (Accounting Act art. 47)
• Payroll records — 50 years (MLSP regulation)
• Tax documents — until the statute of limitations expires + 1 year

TaxBG Pro retains data on its servers for no more than 1 year. After that, data is permanently deleted.

By downloading this document, you confirm that:
1. You understand the retention periods
2. You will retain the document for the period required by law
3. TaxBG Pro bears no liability for loss of documents after removal from the servers`,

  bg: `Съгласно българското законодателство (ЗСч чл. 47, ДОПК чл. 38) отговорността за съхранение на документите се носи от ръководителя на предприятието.

Срокове за съхранение:
• Счетоводни документи — 10 години (ЗСч чл. 47)
• Ведомости за заплати — 50 години (наредба МТСП)
• Данъчни документи — до изтичане на давностния срок + 1 година

TaxBG Pro осигурява съхранение на своите сървъри не повече от 1 година. След това данните се изтриват необратимо.

Изтегляйки този документ, Вие потвърждавате, че:
1. Разбирате сроковете за съхранение
2. Ще осигурите съхранението на документа за установения от закона срок
3. TaxBG Pro не носи отговорност за загуба на документи след изтриването им от сървърите`,

  uk: `Відповідно до болгарського законодавства (ЗСч чл. 47, ДОПК чл. 38) відповідальність за зберігання документів несе керівник підприємства.

Строки зберігання:
• Бухгалтерські документи — 10 років (ЗСч чл. 47)
• Зарплатні відомості — 50 років (наредба МТСП)
• Податкові документи — до закінчення строку давності + 1 рік

TaxBG Pro забезпечує зберігання на своїх серверах не більше 1 року. Після цього дані видаляються безповоротно.

Завантажуючи цей документ, Ви підтверджуєте, що:
1. Розумієте строки зберігання
2. Забезпечите зберігання документа протягом встановленого законом строку
3. TaxBG Pro не несе відповідальності за втрату документів після видалення з серверів`,
}

export function computeRetainUntil(retentionClass: RetentionClass): string {
  const year = new Date().getFullYear()
  const yearsByClass: Record<RetentionClass, number> = {
    general_3y: 3,
    accounting_10y: 11,
    tax_control_extended: 11,
    payroll_50y: 51,
    legal_hold: 11,
    manual_delete: 11,
  }
  return `${year + yearsByClass[retentionClass]}-06-30`
}

interface RecordAcknowledgementOpts {
  documentId?: string
  documentName: string
  retentionClass: RetentionClass | string
  retainUntil: string
  legalBasis: string
  ackType: AckType
}

export async function recordAcknowledgement(opts: RecordAcknowledgementOpts): Promise<void> {
  const language = useUserStore.getState().language
  const warningText = EXPORT_WARNING_TEXTS[language] ?? EXPORT_WARNING_TEXTS.ru
  const acknowledgedAt = new Date().toISOString()

  const logEntry = {
    ...opts,
    warningTextShown: warningText,
    language,
    acknowledgedAt,
  }

  try {
    const raw = localStorage.getItem('taxbg-export-log')
    const arr: unknown[] = raw ? JSON.parse(raw) : []
    arr.push(logEntry)
    if (arr.length > 500) arr.splice(0, arr.length - 500)
    localStorage.setItem('taxbg-export-log', JSON.stringify(arr))
  } catch (e) {
    console.warn('[exportAck] localStorage write failed', e)
  }

  if (!supabase) return
  const { isDemo, user } = useAuthStore.getState()
  if (isDemo || !user) return

  if (opts.documentId) {
    const { error } = await supabase.from('document_acknowledgements').insert({
      document_id: opts.documentId,
      profile_id: user.id,
      ack_type: opts.ackType,
      warning_text_shown: warningText,
      legal_basis_snapshot: opts.legalBasis,
      retain_until_shown: opts.retainUntil,
    })
    if (error) console.warn('[exportAck] document_acknowledgements insert failed', error)
  }

  const activeCompanyId = useCompaniesStore.getState().activeCompanyId
  const { error: auditError } = await supabase.from('audit_events').insert({
    actor_profile_id: user.id,
    company_id: activeCompanyId,
    entity_type: 'document',
    action: 'downloaded',
    after_json: {
      documentName: opts.documentName,
      retentionClass: opts.retentionClass,
      retainUntil: opts.retainUntil,
      legalBasis: opts.legalBasis,
      ackType: opts.ackType,
    },
  })
  if (auditError) console.warn('[exportAck] audit_events insert failed', auditError)
}
