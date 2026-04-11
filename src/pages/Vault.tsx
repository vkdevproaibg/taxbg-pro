import { useMemo, useRef, useState } from 'react'
import {
  Archive, ChevronRight, ChevronDown, Folder, FolderOpen,
  FileText, FileCode, FileSpreadsheet, Upload, Download, Trash2, Sparkles, AlertTriangle,
} from 'lucide-react'
import { useUserStore, type AppLanguage } from '../store/userStore'
import { useCompaniesStore } from '../store/companiesStore'
import { useAccountingStore } from '../store/accountingStore'
import { useEmployeesStore } from '../store/employeesStore'
import { useJournalStore } from '../store/journalStore'
import { useVaultUploadsStore, type VaultUpload } from '../store/vaultUploadsStore'
import {
  buildVaultTree,
  collectSystemDocuments,
  flattenTree,
  generateSystemDocumentContent,
  exportVaultAsZip,
  strictestRetention,
  type VaultDocument,
  type VaultFolder,
  type VaultFileType,
} from '../lib/documentVault'
import { useExportWithWarning } from '../hooks/useExportWithWarning'
import ExportWarningModal from '../components/ui/ExportWarningModal'
import { useCompanyDataReady } from '../hooks/useCompanyData'

const LABELS: Record<AppLanguage, {
  title: string
  subtitle: string
  downloadAll: string
  upload: string
  uploadInto: string
  empty: string
  system: string
  uploaded: string
  download: string
  remove: string
  generatedAt: string
  period: string
  size: string
  noCompany: string
  retentionWarningTitle: string
  retentionWarningText: (years: number) => string
  subscriptionTitle: string
  subscriptionText: string
  subscriptionCta: string
  rootBadge: string
}> = {
  ru: {
    title: 'Архив документов',
    subtitle: 'Все документы компании в виртуальных регистраторах. Скачивайте по одному или целиком ZIP-архивом.',
    downloadAll: 'Скачать весь архив (ZIP)',
    upload: 'Загрузить документ',
    uploadInto: 'Загрузить в эту папку',
    empty: 'Папка пуста. Загрузите документы или они появятся после генерации.',
    system: 'Сгенерировано автоматически',
    uploaded: 'Загружено вручную',
    download: 'Скачать',
    remove: 'Удалить',
    generatedAt: 'Сгенерировано',
    period: 'Период',
    size: 'Размер',
    noCompany: 'Выберите компанию, чтобы увидеть архив.',
    retentionWarningTitle: 'Требуется долгое хранение',
    retentionWarningText: (y) => `Этот документ требует хранения ${y} лет. Без подписки TaxBG Pro удалит копию через 1 год — скачайте её себе.`,
    subscriptionTitle: 'Продлённое хранение',
    subscriptionText: 'TaxBG Pro бесплатно хранит документы 1 год. После этого данные удаляются. Подписка на продлённое хранение обеспечивает срок, установленный законом (до 50 лет для зарплатных ведомостей).',
    subscriptionCta: 'Узнать подробности',
    rootBadge: 'Все папки',
  },
  en: {
    title: 'Document vault',
    subtitle: 'All company documents in virtual binders. Download individually or as a ZIP archive.',
    downloadAll: 'Download entire archive (ZIP)',
    upload: 'Upload document',
    uploadInto: 'Upload into this folder',
    empty: 'Folder is empty. Upload documents or wait for them to be generated.',
    system: 'Generated automatically',
    uploaded: 'Uploaded manually',
    download: 'Download',
    remove: 'Remove',
    generatedAt: 'Generated',
    period: 'Period',
    size: 'Size',
    noCompany: 'Select a company to view the vault.',
    retentionWarningTitle: 'Long retention required',
    retentionWarningText: (y) => `This document must be retained for ${y} years. Without a subscription TaxBG Pro will remove its copy after 1 year — download it.`,
    subscriptionTitle: 'Extended retention',
    subscriptionText: 'TaxBG Pro stores documents for free for 1 year. After that, data is deleted. The extended retention subscription ensures storage for the statutory period (up to 50 years for payroll).',
    subscriptionCta: 'Learn more',
    rootBadge: 'All folders',
  },
  bg: {
    title: 'Архив на документи',
    subtitle: 'Всички документи на компанията в виртуални регистратори. Изтеглете поотделно или целия ZIP архив.',
    downloadAll: 'Изтегли целия архив (ZIP)',
    upload: 'Качи документ',
    uploadInto: 'Качи в тази папка',
    empty: 'Папката е празна. Качете документи или те ще се появят след генериране.',
    system: 'Генерирано автоматично',
    uploaded: 'Качено ръчно',
    download: 'Изтегли',
    remove: 'Изтрий',
    generatedAt: 'Генерирано',
    period: 'Период',
    size: 'Размер',
    noCompany: 'Изберете компания, за да видите архива.',
    retentionWarningTitle: 'Изисква се дълго съхранение',
    retentionWarningText: (y) => `Този документ трябва да се съхранява ${y} години. Без абонамент TaxBG Pro ще изтрие копието след 1 година — изтеглете го.`,
    subscriptionTitle: 'Продължено съхранение',
    subscriptionText: 'TaxBG Pro съхранява документи безплатно 1 година. След това данните се изтриват. Абонаментът за продължено съхранение осигурява законно установения срок (до 50 години за ведомостите за заплати).',
    subscriptionCta: 'Научи повече',
    rootBadge: 'Всички папки',
  },
  uk: {
    title: 'Архів документів',
    subtitle: 'Усі документи компанії у віртуальних реєстраторах. Завантажуйте по одному або цілим ZIP-архівом.',
    downloadAll: 'Завантажити весь архів (ZIP)',
    upload: 'Завантажити документ',
    uploadInto: 'Завантажити в цю папку',
    empty: 'Папка порожня. Завантажте документи або вони з\'являться після генерації.',
    system: 'Згенеровано автоматично',
    uploaded: 'Завантажено вручну',
    download: 'Завантажити',
    remove: 'Видалити',
    generatedAt: 'Згенеровано',
    period: 'Період',
    size: 'Розмір',
    noCompany: 'Виберіть компанію, щоб побачити архів.',
    retentionWarningTitle: 'Потрібне тривале зберігання',
    retentionWarningText: (y) => `Цей документ потребує зберігання ${y} років. Без підписки TaxBG Pro видалить копію через 1 рік — завантажте її.`,
    subscriptionTitle: 'Подовжене зберігання',
    subscriptionText: 'TaxBG Pro зберігає документи безкоштовно 1 рік. Після цього дані видаляються. Підписка на подовжене зберігання забезпечує встановлений законом строк (до 50 років для зарплатних відомостей).',
    subscriptionCta: 'Дізнатися більше',
    rootBadge: 'Усі папки',
  },
}

function extToFileType(name: string): VaultFileType {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'xml') return 'xml'
  if (ext === 'csv') return 'csv'
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx' || ext === 'doc') return 'docx'
  return 'other'
}

function iconForType(type: VaultFileType) {
  if (type === 'xml') return FileCode
  if (type === 'csv') return FileSpreadsheet
  return FileText
}

function formatSize(n?: number): string {
  if (!n) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

interface FolderNodeProps {
  folder: VaultFolder
  depth: number
  selectedId: string
  expanded: Set<string>
  onSelect: (id: string) => void
  onToggle: (id: string) => void
}

function FolderNode({ folder, depth, selectedId, expanded, onSelect, onToggle }: FolderNodeProps) {
  const hasChildren = (folder.children?.length ?? 0) > 0
  const isOpen = expanded.has(folder.id)
  const isSelected = selectedId === folder.id
  const Chevron = isOpen ? ChevronDown : ChevronRight
  const Icon = isOpen || isSelected ? FolderOpen : Folder

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors"
        style={{
          paddingLeft: 8 + depth * 14,
          backgroundColor: isSelected ? 'var(--accent-light)' : 'transparent',
          color: isSelected ? 'var(--accent-text)' : 'var(--text-secondary)',
          fontWeight: isSelected ? 600 : 400,
        }}
        onClick={() => {
          onSelect(folder.id)
          if (hasChildren) onToggle(folder.id)
        }}
      >
        {hasChildren ? (
          <Chevron className="h-3 w-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }} />
        <span className="truncate">{folder.name}</span>
      </button>
      {hasChildren && isOpen && (
        <div>
          {folder.children!.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Vault() {
  const language = useUserStore((s) => s.language)
  const companyName = useUserStore((s) => s.companyName)
  const eik = useUserStore((s) => s.eik)
  const activeCompanyId = useCompaniesStore((s) => s.activeCompanyId)
  const transactions = useAccountingStore((s) => s.transactions)
  const employees = useEmployeesStore((s) => s.employees)
  const journalEntries = useJournalStore((s) => s.entries)
  const dataReady = useCompanyDataReady()

  const uploads = useVaultUploadsStore((s) => s.uploads)
  const addUpload = useVaultUploadsStore((s) => s.addUpload)
  const removeUpload = useVaultUploadsStore((s) => s.removeUpload)

  const labels = LABELS[language] ?? LABELS.ru

  const years = useMemo(() => {
    const set = new Set<number>()
    set.add(new Date().getFullYear())
    for (const t of transactions) {
      const y = Number(t.date.slice(0, 4))
      if (!Number.isNaN(y)) set.add(y)
    }
    return Array.from(set).sort()
  }, [transactions])

  const tree = useMemo(
    () => buildVaultTree(companyName, eik, language, years),
    [companyName, eik, language, years],
  )

  const allFolders = useMemo(() => flattenTree(tree), [tree])

  const systemDocs = useMemo(
    () =>
      collectSystemDocuments({
        transactions,
        employees,
        journalEntries,
        companyName,
        eik,
        language,
      }),
    [transactions, employees, journalEntries, companyName, eik, language],
  )

  const uploadedForCompany: VaultUpload[] = useMemo(
    () => (activeCompanyId ? uploads.filter((u) => u.companyId === activeCompanyId) : []),
    [uploads, activeCompanyId],
  )

  const uploadedAsDocs: VaultDocument[] = useMemo(
    () =>
      uploadedForCompany.map((u) => ({
        id: u.id,
        folderId: u.folderId,
        folderPath: u.folderPath,
        fileName: u.fileName,
        fileType: u.fileType,
        generatedAt: u.uploadedAt,
        size: u.size,
        source: 'upload' as const,
        dataUrl: u.dataUrl,
      })),
    [uploadedForCompany],
  )

  const allDocs: VaultDocument[] = useMemo(
    () => [...systemDocs, ...uploadedAsDocs],
    [systemDocs, uploadedAsDocs],
  )

  const [selectedId, setSelectedId] = useState<string>('root')
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root', '02_tax', '03_financial', '04_payroll']))

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedFolder = useMemo(
    () => allFolders.find((f) => f.id === selectedId) ?? tree,
    [allFolders, selectedId, tree],
  )

  const documentsInSelected = useMemo(() => {
    if (selectedId === 'root') return allDocs
    const childrenIds = new Set<string>()
    const collect = (f: VaultFolder) => {
      childrenIds.add(f.id)
      f.children?.forEach(collect)
    }
    collect(selectedFolder)
    return allDocs.filter((d) => childrenIds.has(d.folderId))
  }, [allDocs, selectedFolder, selectedId])

  const { exportWithWarning, confirm, closeModal, pending, isOpen } = useExportWithWarning()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDownloadDocument = (doc: VaultDocument) => {
    const folder = allFolders.find((f) => f.id === doc.folderId)
    if (!folder) return

    const onConfirm = () => {
      if (doc.source === 'upload' && doc.dataUrl) {
        fetch(doc.dataUrl)
          .then((r) => r.blob())
          .then((b) => triggerBlobDownload(b, doc.fileName))
          .catch((err) => console.warn('[vault] upload download failed', err))
        return
      }
      const content = generateSystemDocumentContent(doc, {
        companyName, eik, transactions, employees, journalEntries,
      })
      if (content == null) return
      const mime = doc.fileType === 'xml' ? 'application/xml;charset=utf-8' : 'text/csv;charset=utf-8'
      const prefix = doc.fileType === 'csv' ? '\uFEFF' : ''
      const blob = new Blob([prefix + content], { type: mime })
      triggerBlobDownload(blob, doc.fileName)
    }

    exportWithWarning({
      documentName: `${doc.fileName} · ${folder.name}`,
      retentionClass: folder.retentionClass,
      legalBasis: folder.legalBasis,
      onConfirm,
    })
  }

  const handleDownloadArchive = () => {
    const { retentionClass, legalBasis } = strictestRetention(allDocs, allFolders)
    exportWithWarning({
      documentName: `${companyName || 'Company'} · Полный архив`,
      retentionClass,
      legalBasis,
      onConfirm: async () => {
        try {
          const blob = await exportVaultAsZip(
            tree,
            allDocs,
            { companyName, eik, transactions, employees, journalEntries },
            language,
          )
          triggerBlobDownload(blob, `TaxBG_Vault_${(companyName || 'company').replace(/\s+/g, '_')}.zip`)
        } catch (err) {
          console.error('[vault] zip export failed', err)
        }
      },
    })
  }

  const handleUploadClick = () => {
    if (!activeCompanyId || selectedId === 'root') return
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeCompanyId) return
    const folder = allFolders.find((f) => f.id === selectedId)
    if (!folder) return
    try {
      const dataUrl = await readFileAsDataUrl(file)
      addUpload({
        companyId: activeCompanyId,
        folderId: folder.id,
        folderPath: folder.path,
        fileName: file.name,
        fileType: extToFileType(file.name),
        dataUrl,
        size: file.size,
      })
    } catch (err) {
      console.warn('[vault] file read failed', err)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!activeCompanyId) {
    return (
      <div className="p-6">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{labels.noCompany}</p>
      </div>
    )
  }

  if (!dataReady) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    )
  }

  const showRetentionWarning = selectedFolder.retainYears > 1 && selectedId !== 'root'

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--accent-light)' }}
          >
            <Archive className="h-5 w-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {labels.title}
            </h1>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              {labels.subtitle}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownloadArchive}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <Download className="h-4 w-4" />
          {labels.downloadAll}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside
          className="rounded-xl p-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}
        >
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => setSelectedId('root')}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs"
              style={{
                backgroundColor: selectedId === 'root' ? 'var(--accent-light)' : 'transparent',
                color: selectedId === 'root' ? 'var(--accent-text)' : 'var(--text-secondary)',
                fontWeight: selectedId === 'root' ? 600 : 400,
              }}
            >
              <Archive className="h-3.5 w-3.5" style={{ color: selectedId === 'root' ? 'var(--accent)' : 'var(--text-muted)' }} />
              <span className="truncate">{labels.rootBadge}</span>
              <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>{allDocs.length}</span>
            </button>
            {tree.children?.map((child) => (
              <FolderNode
                key={child.id}
                folder={child}
                depth={0}
                selectedId={selectedId}
                expanded={expanded}
                onSelect={setSelectedId}
                onToggle={toggleExpanded}
              />
            ))}
          </div>
        </aside>

        <section className="space-y-4">
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {selectedFolder.name}
                </h2>
                {selectedFolder.description && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {selectedFolder.description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  <span className="rounded-full px-2 py-0.5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                    {selectedFolder.retainYears} {language === 'en' ? 'years' : language === 'bg' ? 'години' : language === 'uk' ? 'років' : 'лет'}
                  </span>
                  <span>{selectedFolder.legalBasis}</span>
                </div>
              </div>
              {selectedId !== 'root' && (
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-secondary)',
                    border: '1.5px solid var(--border)',
                  }}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {labels.uploadInto}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>

          {showRetentionWarning && (
            <div
              className="flex items-start gap-3 rounded-xl p-4"
              style={{ backgroundColor: '#fffbeb', border: '1.5px solid #f59e0b' }}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#d97706' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
                  {labels.retentionWarningTitle}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: '#92400e' }}>
                  {labels.retentionWarningText(selectedFolder.retainYears)}
                </p>
              </div>
            </div>
          )}

          {documentsInSelected.length === 0 ? (
            <div
              className="rounded-xl border border-dashed p-8 text-center text-xs"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              {selectedFolder.hint || labels.empty}
            </div>
          ) : (
            <div className="space-y-2">
              {documentsInSelected.map((doc) => {
                const Icon = iconForType(doc.fileType)
                const folder = allFolders.find((f) => f.id === doc.folderId)
                return (
                  <div
                    key={doc.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl p-3"
                    style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: 'var(--surface)' }}
                    >
                      <Icon className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {doc.fileName}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {folder && <span>{folder.name}</span>}
                        {doc.period && (
                          <>
                            <span>·</span>
                            <span>{labels.period}: {doc.period}</span>
                          </>
                        )}
                        {doc.size != null && (
                          <>
                            <span>·</span>
                            <span>{formatSize(doc.size)}</span>
                          </>
                        )}
                        <span>·</span>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: doc.source === 'system' ? 'var(--accent-light)' : 'var(--surface)',
                            color: doc.source === 'system' ? 'var(--accent-text)' : 'var(--text-secondary)',
                          }}
                        >
                          {doc.source === 'system' ? <Sparkles className="h-2.5 w-2.5" /> : <Upload className="h-2.5 w-2.5" />}
                          {doc.source === 'system' ? labels.system : labels.uploaded}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDownloadDocument(doc)}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                      >
                        <Download className="h-3 w-3" />
                        {labels.download}
                      </button>
                      {doc.source === 'upload' && (
                        <button
                          type="button"
                          onClick={() => removeUpload(doc.id)}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs"
                          style={{
                            backgroundColor: 'var(--surface)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border)',
                          }}
                          aria-label={labels.remove}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'var(--accent-light)',
              border: '1.5px solid var(--accent)',
            }}
          >
            <div className="flex items-start gap-3">
              <Archive className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>
                  {labels.subscriptionTitle}
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--accent-text)' }}>
                  {labels.subscriptionText}
                </p>
                <button
                  type="button"
                  className="mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                  onClick={() => {
                    window.location.assign('/settings')
                  }}
                >
                  {labels.subscriptionCta}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {pending && (
        <ExportWarningModal
          isOpen={isOpen}
          onClose={closeModal}
          onConfirm={confirm}
          documentName={pending.documentName}
          retentionClass={pending.retentionClass}
          retainUntil={pending.retainUntil}
          legalBasis={pending.legalBasis}
        />
      )}
    </div>
  )
}
