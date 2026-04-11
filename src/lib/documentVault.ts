import JSZip from 'jszip'
import type { AppLanguage } from '../store/userStore'
import type { Transaction } from '../store/accountingStore'
import type { Employee } from '../store/employeesStore'
import type { JournalEntry } from '../store/journalStore'
import type { RetentionClass } from './exportAcknowledgement'
import { computeRetainUntil } from './exportAcknowledgement'
import { generateDDSXml } from './xmlGenerator'
import { buildOPR, buildBalanceSheet, oprToCsv, balanceToCsv } from './financialReports'
import { calculateObrazec1, obrazec1ToCsv } from './obrazec1'

export type VaultFileType = 'xml' | 'csv' | 'pdf' | 'docx' | 'other'
export type VaultSystemDocType = 'dds_xml' | 'opr_csv' | 'balance_csv' | 'obrazec1_csv'

export interface VaultFolder {
  id: string
  name: string
  path: string
  retentionClass: RetentionClass
  retainYears: number
  legalBasis: string
  description: string
  hint: string
  children?: VaultFolder[]
}

export interface VaultDocument {
  id: string
  folderId: string
  folderPath: string
  fileName: string
  fileType: VaultFileType
  generatedAt: string
  period?: string
  size?: number
  source: 'system' | 'upload'
  systemType?: VaultSystemDocType
  dataUrl?: string
}

export interface VaultGeneratorContext {
  companyName: string
  eik: string
  transactions: Transaction[]
  employees: Employee[]
  journalEntries: JournalEntry[]
}

const MONTH_FOLDERS: Record<number, { latin: string; ru: string; en: string; bg: string; uk: string }> = {
  1:  { latin: '01_Januari',   ru: 'Январь',    en: 'January',   bg: 'Януари',    uk: 'Січень' },
  2:  { latin: '02_Februari',  ru: 'Февраль',   en: 'February',  bg: 'Февруари',  uk: 'Лютий' },
  3:  { latin: '03_Mart',      ru: 'Март',      en: 'March',     bg: 'Март',      uk: 'Березень' },
  4:  { latin: '04_April',     ru: 'Апрель',    en: 'April',     bg: 'Април',     uk: 'Квітень' },
  5:  { latin: '05_Mai',       ru: 'Май',       en: 'May',       bg: 'Май',       uk: 'Травень' },
  6:  { latin: '06_Yuni',      ru: 'Июнь',      en: 'June',      bg: 'Юни',       uk: 'Червень' },
  7:  { latin: '07_Yuli',      ru: 'Июль',      en: 'July',      bg: 'Юли',       uk: 'Липень' },
  8:  { latin: '08_Avgust',    ru: 'Август',    en: 'August',    bg: 'Август',    uk: 'Серпень' },
  9:  { latin: '09_Septemvri', ru: 'Сентябрь',  en: 'September', bg: 'Септември', uk: 'Вересень' },
  10: { latin: '10_Oktomvri',  ru: 'Октябрь',   en: 'October',   bg: 'Октомври',  uk: 'Жовтень' },
  11: { latin: '11_Noemvri',   ru: 'Ноябрь',    en: 'November',  bg: 'Ноември',   uk: 'Листопад' },
  12: { latin: '12_Dekemvri',  ru: 'Декабрь',   en: 'December',  bg: 'Декември',  uk: 'Грудень' },
}

const RETENTION_YEARS: Record<RetentionClass, number> = {
  general_3y: 3,
  accounting_10y: 10,
  tax_control_extended: 10,
  payroll_50y: 50,
  legal_hold: 10,
  manual_delete: 10,
}

interface FolderDef {
  id: string
  path: string
  names: Record<AppLanguage, string>
  descriptions: Record<AppLanguage, string>
  hints: Record<AppLanguage, string>
  retentionClass: RetentionClass
  legalBasis: string
}

const TOP_LEVEL: FolderDef[] = [
  {
    id: '01_founding',
    path: '01_Uchreditelni_dokumenti',
    names: {
      ru: '01. Учредительные документы',
      en: '01. Founding documents',
      bg: '01. Учредителни документи',
      uk: '01. Установчі документи',
    },
    descriptions: {
      ru: 'Устав, решения общего собрания, договоры об управлении, протоколы.',
      en: 'Articles of association, shareholder resolutions, management agreements, minutes.',
      bg: 'Устав, решения на ОС, договори за управление, протоколи.',
      uk: 'Статут, рішення загальних зборів, договори про управління, протоколи.',
    },
    hints: {
      ru: 'Загрузите сюда устав, решения ОС и другие учредительные документы',
      en: 'Upload articles of association, resolutions and other founding documents here',
      bg: 'Качете тук устав, решения на ОС и други учредителни документи',
      uk: 'Завантажте сюди статут, рішення зборів та інші установчі документи',
    },
    retentionClass: 'accounting_10y',
    legalBasis: 'ТЗ; ЗСч чл. 47',
  },
  {
    id: '02_tax',
    path: '02_Danachni_deklaracii',
    names: {
      ru: '02. Налоговые декларации',
      en: '02. Tax declarations',
      bg: '02. Данъчни декларации',
      uk: '02. Податкові декларації',
    },
    descriptions: {
      ru: 'Декларации ДДС, ЗКПО, ЗДДФЛ и другие налоговые документы.',
      en: 'VAT, corporate tax, personal income tax declarations and other tax documents.',
      bg: 'Декларации по ДДС, ЗКПО, ЗДДФЛ и други данъчни документи.',
      uk: 'Декларації ПДВ, корпоративного податку, ПДФО та інші податкові документи.',
    },
    hints: {
      ru: 'Здесь хранятся сгенерированные декларации',
      en: 'Generated declarations are stored here',
      bg: 'Тук се съхраняват генерираните декларации',
      uk: 'Тут зберігаються згенеровані декларації',
    },
    retentionClass: 'accounting_10y',
    legalBasis: 'ЗСч чл. 47; ДОПК чл. 38',
  },
  {
    id: '03_financial',
    path: '03_Schetovodni_otcheti',
    names: {
      ru: '03. Бухгалтерские отчёты',
      en: '03. Financial reports',
      bg: '03. Счетоводни отчети',
      uk: '03. Бухгалтерські звіти',
    },
    descriptions: {
      ru: 'ОПР, баланс, ГФО (когда будет опубликован).',
      en: 'Profit & loss, balance sheet, annual report (when published).',
      bg: 'ОПР, баланс, ГФО (когато бъде публикуван).',
      uk: 'ЗПР, баланс, річний фінансовий звіт (коли буде опубліковано).',
    },
    hints: {
      ru: 'Здесь хранятся сгенерированные отчёты',
      en: 'Generated reports are stored here',
      bg: 'Тук се съхраняват генерираните отчети',
      uk: 'Тут зберігаються згенеровані звіти',
    },
    retentionClass: 'accounting_10y',
    legalBasis: 'ЗСч чл. 47',
  },
  {
    id: '04_payroll',
    path: '04_Zaplati_i_osigurovki',
    names: {
      ru: '04. Зарплаты и осигуровки',
      en: '04. Payroll and social security',
      bg: '04. Заплати и осигуровки',
      uk: '04. Зарплати та соціальне страхування',
    },
    descriptions: {
      ru: 'Образец 1, ведомости зарплат, данные по осигуровкам. Срок хранения — 50 лет.',
      en: 'Form 1, payroll sheets, social security data. Retention — 50 years.',
      bg: 'Образец 1, ведомости за заплати, данни за осигуровки. Срок — 50 години.',
      uk: 'Зразок 1, зарплатні відомості, дані соціального страхування. Строк — 50 років.',
    },
    hints: {
      ru: 'Зарплатные документы по месяцам',
      en: 'Payroll documents by month',
      bg: 'Заплатни документи по месеци',
      uk: 'Зарплатні документи за місяцями',
    },
    retentionClass: 'payroll_50y',
    legalBasis: 'ЗСч чл. 47; наредба МТСП',
  },
  {
    id: '05_invoices',
    path: '05_Fakturi',
    names: {
      ru: '05. Фактуры',
      en: '05. Invoices',
      bg: '05. Фактури',
      uk: '05. Фактури',
    },
    descriptions: {
      ru: 'Выданные и полученные счета-фактуры.',
      en: 'Issued and received invoices.',
      bg: 'Издадени и получени фактури.',
      uk: 'Видані та отримані рахунки-фактури.',
    },
    hints: {
      ru: 'Загрузите копии фактур в соответствующие подпапки',
      en: 'Upload invoice copies into the relevant subfolder',
      bg: 'Качете копия на фактурите в съответните подпапки',
      uk: 'Завантажте копії фактур у відповідні підпапки',
    },
    retentionClass: 'accounting_10y',
    legalBasis: 'ЗДДС чл. 113; ЗСч чл. 47',
  },
  {
    id: '06_bank',
    path: '06_Bankovi_dokumenti',
    names: {
      ru: '06. Банковские документы',
      en: '06. Bank documents',
      bg: '06. Банкови документи',
      uk: '06. Банківські документи',
    },
    descriptions: {
      ru: 'Банковские выписки, платёжные поручения, справки.',
      en: 'Bank statements, payment orders, certificates.',
      bg: 'Банкови извлечения, платежни нареждания, удостоверения.',
      uk: 'Банківські виписки, платіжні доручення, довідки.',
    },
    hints: {
      ru: 'Загрузите банковские выписки и документы',
      en: 'Upload bank statements and documents',
      bg: 'Качете банкови извлечения и документи',
      uk: 'Завантажте банківські виписки та документи',
    },
    retentionClass: 'accounting_10y',
    legalBasis: 'ЗСч чл. 47',
  },
  {
    id: '07_contracts',
    path: '07_Dogovori',
    names: {
      ru: '07. Договоры',
      en: '07. Contracts',
      bg: '07. Договори',
      uk: '07. Договори',
    },
    descriptions: {
      ru: 'Договоры с клиентами, поставщиками, подрядчиками.',
      en: 'Contracts with clients, suppliers, contractors.',
      bg: 'Договори с клиенти, доставчици, изпълнители.',
      uk: 'Договори з клієнтами, постачальниками, підрядниками.',
    },
    hints: {
      ru: 'Загрузите копии договоров',
      en: 'Upload contract copies',
      bg: 'Качете копия на договорите',
      uk: 'Завантажте копії договорів',
    },
    retentionClass: 'accounting_10y',
    legalBasis: 'ЗЗД; ЗСч чл. 47',
  },
  {
    id: '08_nap_correspondence',
    path: '08_Korespondencia_NAP',
    names: {
      ru: '08. Переписка с НАП',
      en: '08. Correspondence with NAP',
      bg: '08. Кореспонденция с НАП',
      uk: '08. Листування з НАП',
    },
    descriptions: {
      ru: 'Объяснительные записки, становища, запросы и ответы НАП.',
      en: 'Explanatory notes, opinions, NAP requests and responses.',
      bg: 'Обяснителни записки, становища, запитвания и отговори от НАП.',
      uk: 'Пояснювальні записки, висновки, запити та відповіді НАП.',
    },
    hints: {
      ru: 'Загрузите документы переписки с НАП',
      en: 'Upload NAP correspondence documents',
      bg: 'Качете документи от кореспонденцията с НАП',
      uk: 'Завантажте документи листування з НАП',
    },
    retentionClass: 'accounting_10y',
    legalBasis: 'ДОПК чл. 38',
  },
  {
    id: '09_assets',
    path: '09_Dalgotraini_aktivi',
    names: {
      ru: '09. Долгосрочные активы',
      en: '09. Fixed assets',
      bg: '09. Дълготрайни активи',
      uk: '09. Довгострокові активи',
    },
    descriptions: {
      ru: 'Амортизационный план, документы на покупку, акты ввода в эксплуатацию.',
      en: 'Depreciation schedule, purchase documents, commissioning acts.',
      bg: 'Амортизационен план, документи за покупка, актове за въвеждане в експлоатация.',
      uk: 'План амортизації, документи на покупку, акти введення в експлуатацію.',
    },
    hints: {
      ru: 'Документы на долгосрочные активы',
      en: 'Fixed asset documents',
      bg: 'Документи за дълготрайни активи',
      uk: 'Документи на довгострокові активи',
    },
    retentionClass: 'accounting_10y',
    legalBasis: 'ЗКПО чл. 54; ЗСч чл. 47',
  },
  {
    id: '10_other',
    path: '10_Prochie',
    names: {
      ru: '10. Прочее',
      en: '10. Other',
      bg: '10. Прочие',
      uk: '10. Інше',
    },
    descriptions: {
      ru: 'Прочие документы, не вошедшие в другие категории.',
      en: 'Other documents not fitting other categories.',
      bg: 'Други документи, невлизащи в други категории.',
      uk: 'Інші документи, що не увійшли до інших категорій.',
    },
    hints: {
      ru: 'Прочие документы',
      en: 'Other documents',
      bg: 'Други документи',
      uk: 'Інші документи',
    },
    retentionClass: 'general_3y',
    legalBasis: 'ДОПК чл. 38',
  },
]

function folderFromDef(def: FolderDef, language: AppLanguage): VaultFolder {
  return {
    id: def.id,
    name: def.names[language] ?? def.names.ru,
    path: def.path,
    retentionClass: def.retentionClass,
    retainYears: RETENTION_YEARS[def.retentionClass],
    legalBasis: def.legalBasis,
    description: def.descriptions[language] ?? def.descriptions.ru,
    hint: def.hints[language] ?? def.hints.ru,
  }
}

function yearFolder(
  parent: VaultFolder,
  year: number,
  retention: { retentionClass: RetentionClass; legalBasis: string },
  language: AppLanguage,
): VaultFolder {
  const desc = {
    ru: `Документы за ${year} год`,
    en: `Documents for ${year}`,
    bg: `Документи за ${year}`,
    uk: `Документи за ${year} рік`,
  }[language] ?? `Documents for ${year}`
  return {
    id: `${parent.id}/${year}`,
    name: String(year),
    path: `${parent.path}/${year}`,
    retentionClass: retention.retentionClass,
    retainYears: RETENTION_YEARS[retention.retentionClass],
    legalBasis: retention.legalBasis,
    description: desc,
    hint: desc,
  }
}

export function buildVaultTree(
  companyName: string,
  eik: string,
  language: AppLanguage,
  years: number[] = [new Date().getFullYear()],
): VaultFolder {
  const root: VaultFolder = {
    id: 'root',
    name: companyName ? `${companyName} (ЕИК ${eik || '—'})` : 'Vault',
    path: '.',
    retentionClass: 'accounting_10y',
    retainYears: 10,
    legalBasis: 'ЗСч чл. 47',
    description: '',
    hint: '',
    children: [],
  }

  for (const def of TOP_LEVEL) {
    const folder = folderFromDef(def, language)

    if (def.id === '02_tax') {
      folder.children = years.map((y) => {
        const yf = yearFolder(folder, y, { retentionClass: folder.retentionClass, legalBasis: folder.legalBasis }, language)
        yf.children = [
          {
            id: `${yf.id}/dds`,
            name: {
              ru: 'ДДС (ежемесячно)', en: 'VAT (monthly)', bg: 'ДДС (месечни)', uk: 'ПДВ (щомісяця)',
            }[language] ?? 'ДДС',
            path: `${yf.path}/DDS`,
            retentionClass: folder.retentionClass,
            retainYears: folder.retainYears,
            legalBasis: 'ЗДДС чл. 125; ЗСч чл. 47',
            description: '',
            hint: '',
          },
          {
            id: `${yf.id}/zkpo`,
            name: {
              ru: 'ЗКПО (годовая)', en: 'Corporate tax (annual)', bg: 'ЗКПО (годишна)', uk: 'Корпоративний податок (річний)',
            }[language] ?? 'ЗКПО',
            path: `${yf.path}/ZKPO`,
            retentionClass: folder.retentionClass,
            retainYears: folder.retainYears,
            legalBasis: 'ЗКПО; ЗСч чл. 47',
            description: '',
            hint: '',
          },
          {
            id: `${yf.id}/zddfl`,
            name: {
              ru: 'ЗДДФЛ (если применимо)', en: 'Personal income tax (if applicable)', bg: 'ЗДДФЛ (ако е приложимо)', uk: 'ПДФО (якщо застосовно)',
            }[language] ?? 'ЗДДФЛ',
            path: `${yf.path}/ZDDFL`,
            retentionClass: folder.retentionClass,
            retainYears: folder.retainYears,
            legalBasis: 'ЗДДФЛ; ЗСч чл. 47',
            description: '',
            hint: '',
          },
        ]
        return yf
      })
    } else if (def.id === '03_financial') {
      folder.children = years.map((y) =>
        yearFolder(folder, y, { retentionClass: folder.retentionClass, legalBasis: folder.legalBasis }, language),
      )
    } else if (def.id === '04_payroll') {
      folder.children = years.map((y) => {
        const yf = yearFolder(folder, y, { retentionClass: folder.retentionClass, legalBasis: folder.legalBasis }, language)
        yf.children = Array.from({ length: 12 }, (_, i) => {
          const m = i + 1
          const mf = MONTH_FOLDERS[m]
          return {
            id: `${yf.id}/${String(m).padStart(2, '0')}`,
            name: mf[language] ?? mf.bg,
            path: `${yf.path}/${mf.latin}`,
            retentionClass: folder.retentionClass,
            retainYears: folder.retainYears,
            legalBasis: folder.legalBasis,
            description: '',
            hint: '',
          }
        })
        return yf
      })
    } else if (def.id === '05_invoices') {
      folder.children = [
        {
          id: `${folder.id}/issued`,
          name: {
            ru: 'Выданные (продажи)', en: 'Issued (sales)', bg: 'Издадени (продажби)', uk: 'Видані (продажі)',
          }[language] ?? 'Issued',
          path: `${folder.path}/Izdadeni`,
          retentionClass: folder.retentionClass,
          retainYears: folder.retainYears,
          legalBasis: folder.legalBasis,
          description: '',
          hint: '',
        },
        {
          id: `${folder.id}/received`,
          name: {
            ru: 'Полученные (покупки)', en: 'Received (purchases)', bg: 'Получени (покупки)', uk: 'Отримані (покупки)',
          }[language] ?? 'Received',
          path: `${folder.path}/Polucheni`,
          retentionClass: folder.retentionClass,
          retainYears: folder.retainYears,
          legalBasis: folder.legalBasis,
          description: '',
          hint: '',
        },
      ]
    }

    root.children!.push(folder)
  }

  return root
}

export function flattenTree(root: VaultFolder): VaultFolder[] {
  const out: VaultFolder[] = []
  const walk = (f: VaultFolder) => {
    out.push(f)
    f.children?.forEach(walk)
  }
  walk(root)
  return out
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function uniquePeriods<K extends string>(items: { date: string }[], fmt: (date: string) => K): K[] {
  const set = new Set<K>()
  for (const it of items) set.add(fmt(it.date))
  return Array.from(set).sort()
}

export function collectSystemDocuments(opts: {
  transactions: Transaction[]
  employees: Employee[]
  journalEntries: JournalEntry[]
  companyName: string
  eik: string
  language: AppLanguage
  years?: number[]
}): VaultDocument[] {
  const { transactions, employees, language } = opts
  const now = new Date().toISOString()
  const docs: VaultDocument[] = []

  const ddsPeriods = uniquePeriods(
    transactions.filter((t) => t.type === 'vat_out' || t.type === 'vat_in'),
    (d) => d.slice(0, 7),
  )
  for (const period of ddsPeriods) {
    const [yStr] = period.split('-')
    const fileName = `DDS_${period.replace('-', '_')}.xml`
    const folderPath = `02_Danachni_deklaracii/${yStr}/DDS`
    const folderId = `02_tax/${yStr}/dds`
    docs.push({
      id: `sys-dds-${period}`,
      folderId,
      folderPath,
      fileName,
      fileType: 'xml',
      generatedAt: now,
      period,
      source: 'system',
      systemType: 'dds_xml',
    })
  }

  const yearsWithData = uniquePeriods(transactions, (d) => d.slice(0, 4) as '0000')
  for (const y of yearsWithData) {
    const folderId = `03_financial/${y}`
    const folderPath = `03_Schetovodni_otcheti/${y}`
    docs.push({
      id: `sys-opr-${y}`,
      folderId,
      folderPath,
      fileName: `OPR_${y}.csv`,
      fileType: 'csv',
      generatedAt: now,
      period: y,
      source: 'system',
      systemType: 'opr_csv',
    })
    docs.push({
      id: `sys-balance-${y}`,
      folderId,
      folderPath,
      fileName: `Balance_${y}_12_31.csv`,
      fileType: 'csv',
      generatedAt: now,
      period: y,
      source: 'system',
      systemType: 'balance_csv',
    })
  }

  if (employees.some((e) => e.active)) {
    const payrollPeriods = ddsPeriods.length > 0 ? ddsPeriods : [new Date().toISOString().slice(0, 7)]
    for (const period of payrollPeriods) {
      const [yStr, mStr] = period.split('-')
      const folderId = `04_payroll/${yStr}/${mStr}`
      const folderPath = `04_Zaplati_i_osigurovki/${yStr}/${MONTH_FOLDERS[Number(mStr)].latin}`
      docs.push({
        id: `sys-obrazec1-${period}`,
        folderId,
        folderPath,
        fileName: `Obrazec1_${period.replace('-', '_')}.csv`,
        fileType: 'csv',
        generatedAt: now,
        period,
        source: 'system',
        systemType: 'obrazec1_csv',
      })
    }
  }

  void language
  return docs
}

export function generateSystemDocumentContent(
  doc: VaultDocument,
  ctx: VaultGeneratorContext,
): string | null {
  if (doc.source !== 'system' || !doc.systemType || !doc.period) return null

  const { companyName, eik, transactions, employees, journalEntries } = ctx

  if (doc.systemType === 'dds_xml') {
    const [yStr, mStr] = doc.period.split('-')
    const year = Number(yStr)
    const month = Number(mStr)
    const from = `${yStr}-${mStr}-01`
    const to = lastDayOfMonth(year, month)
    const inRange = (t: Transaction) => t.date >= from && t.date <= to

    const salesRows = transactions.filter((t) => inRange(t) && t.type === 'vat_out')
    const purchaseRows = transactions.filter((t) => inRange(t) && t.type === 'vat_in')

    const sumBase = (rows: Transaction[], rate: number) =>
      rows.filter((t) => t.vatRate === rate).reduce((s, t) => s + t.amount, 0)
    const sumVat = (rows: Transaction[], rate: number) =>
      rows.filter((t) => t.vatRate === rate).reduce((s, t) => s + (t.vatAmount ?? 0), 0)

    const salesBase20 = sumBase(salesRows, 0.20)
    const salesBase9 = sumBase(salesRows, 0.09)
    const salesBase0 = sumBase(salesRows, 0)
    const vatOut20 = sumVat(salesRows, 0.20)
    const vatOut9 = sumVat(salesRows, 0.09)
    const purchasesBase20 = sumBase(purchaseRows, 0.20)
    const purchasesBase9 = sumBase(purchaseRows, 0.09)
    const vatIn20 = sumVat(purchaseRows, 0.20)
    const vatIn9 = sumVat(purchaseRows, 0.09)
    const vatTotalOut = vatOut20 + vatOut9
    const vatTotalIn = vatIn20 + vatIn9
    const vatPayable = Math.max(vatTotalOut - vatTotalIn, 0)
    const vatRefund = Math.max(vatTotalIn - vatTotalOut, 0)

    return generateDDSXml({
      period: doc.period,
      companyName, eik, vatNumber: eik,
      salesBase20, vatOut20,
      salesBase9, vatOut9,
      salesBase0,
      purchasesBase20, vatIn20,
      purchasesBase9, vatIn9,
      vatPayable, vatRefund,
    })
  }

  if (doc.systemType === 'opr_csv') {
    const year = doc.period
    const from = `${year}-01-01`
    const to = `${year}-12-31`
    const report = buildOPR(journalEntries, transactions, from, to, companyName)
    return oprToCsv(report)
  }

  if (doc.systemType === 'balance_csv') {
    const year = doc.period
    const upToDate = `${year}-12-31`
    const sheet = buildBalanceSheet(journalEntries, upToDate, companyName, transactions)
    return balanceToCsv(sheet)
  }

  if (doc.systemType === 'obrazec1_csv') {
    const summary = calculateObrazec1(employees.filter((e) => e.active), doc.period, companyName, eik)
    return obrazec1ToCsv(summary)
  }

  return null
}

function buildReadmeText(folder: VaultFolder, language: AppLanguage): string {
  const retainUntil = computeRetainUntil(folder.retentionClass)
  const title = {
    ru: 'TaxBG Pro — Архив документов',
    en: 'TaxBG Pro — Document Vault',
    bg: 'TaxBG Pro — Архив на документи',
    uk: 'TaxBG Pro — Архів документів',
  }[language] ?? 'TaxBG Pro — Document Vault'

  const retentionLabel = {
    ru: 'Срок хранения',
    en: 'Retention period',
    bg: 'Срок на съхранение',
    uk: 'Строк зберігання',
  }[language] ?? 'Retention period'

  const basisLabel = {
    ru: 'Правовое основание',
    en: 'Legal basis',
    bg: 'Правно основание',
    uk: 'Правова основа',
  }[language] ?? 'Legal basis'

  const untilLabel = {
    ru: 'Хранить до',
    en: 'Retain until',
    bg: 'Съхранение до',
    uk: 'Зберігати до',
  }[language] ?? 'Retain until'

  const userPart = `${title}
========================================

${folder.name}

${folder.description}

${retentionLabel}: ${folder.retainYears} ${language === 'en' ? 'years' : language === 'bg' ? 'години' : language === 'uk' ? 'років' : 'лет'}
${untilLabel}: ${retainUntil}
${basisLabel}: ${folder.legalBasis}
`

  if (language === 'bg') return userPart

  const bgPart = `

--- БЪЛГАРСКИ ---

${folder.name}

Срок на съхранение: ${folder.retainYears} години
Съхранение до: ${retainUntil}
Правно основание: ${folder.legalBasis}
`
  return userPart + bgPart
}

export async function exportVaultAsZip(
  tree: VaultFolder,
  documents: VaultDocument[],
  ctx: VaultGeneratorContext,
  language: AppLanguage,
): Promise<Blob> {
  const zip = new JSZip()
  const all = flattenTree(tree).filter((f) => f.id !== 'root')

  for (const folder of all) {
    zip.folder(folder.path)
    zip.file(`${folder.path}/README.txt`, buildReadmeText(folder, language))
  }

  for (const doc of documents) {
    const fullPath = `${doc.folderPath}/${doc.fileName}`
    if (doc.source === 'upload' && doc.dataUrl) {
      const base64 = doc.dataUrl.includes(',') ? doc.dataUrl.split(',')[1] : doc.dataUrl
      zip.file(fullPath, base64, { base64: true })
      continue
    }
    const content = generateSystemDocumentContent(doc, ctx)
    if (content != null) {
      zip.file(fullPath, content)
    }
  }

  return zip.generateAsync({ type: 'blob' })
}

export function strictestRetention(documents: VaultDocument[], folders: VaultFolder[]): {
  retentionClass: RetentionClass
  legalBasis: string
} {
  const order: RetentionClass[] = ['payroll_50y', 'tax_control_extended', 'accounting_10y', 'legal_hold', 'manual_delete', 'general_3y']
  const folderById = new Map(folders.map((f) => [f.id, f]))
  let best: RetentionClass = 'general_3y'
  let basis = 'ЗСч чл. 47'
  for (const doc of documents) {
    const folder = folderById.get(doc.folderId)
    if (!folder) continue
    if (order.indexOf(folder.retentionClass) < order.indexOf(best)) {
      best = folder.retentionClass
      basis = folder.legalBasis
    }
  }
  return { retentionClass: best, legalBasis: basis }
}
