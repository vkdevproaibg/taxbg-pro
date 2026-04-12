// src/lib/companyTransfer.ts
//
// Logic for transferring ownership of a company (ЕООД).
// A transfer moves the "who owns it" relation — it never deletes
// or duplicates company data. Access to client_account_members is
// toggled according to the transfer type.
//
// Archive export: the outgoing owner receives a ZIP with the
// documents covering ONLY their management period, so they can
// defend themselves during the 5-year ДОПК давностен срок.

import { supabase } from './supabase'
import { useCompaniesStore } from '../store/companiesStore'
import { useAccountingStore } from '../store/accountingStore'
import { useEmployeesStore } from '../store/employeesStore'
import { useJournalStore } from '../store/journalStore'
import { useUserStore, type AppLanguage } from '../store/userStore'
import { useVaultUploadsStore } from '../store/vaultUploadsStore'
import {
  buildVaultTree,
  collectSystemDocuments,
  exportVaultAsZip,
  type VaultDocument,
} from './documentVault'

// ── Types ─────────────────────────────────────────────────

export type TransferType = 'full_sale' | 'partial_sale' | 'inheritance' | 'gift'

export type TransferStatus =
  | 'draft'
  | 'pending_buyer'
  | 'archive_ready'
  | 'completed'
  | 'cancelled'

export interface TransferProcess {
  companyId: string
  transferType: TransferType
  buyerEmail: string
  sharesPct: number
  transferDate: string
  notaryActNumber?: string
  registryEntry?: string
  sellerManagementFrom?: string
  sellerManagementTo?: string
  notes?: string
}

export interface CompanyTransferRow {
  id: string
  company_id: string
  transfer_type: TransferType
  from_profile_id: string | null
  to_email: string | null
  to_profile_id: string | null
  shares_transferred_pct: number
  seller_management_from: string | null
  seller_management_to: string | null
  transfer_date: string
  notary_act_number: string | null
  registry_entry: string | null
  seller_archive_generated: boolean
  seller_archive_downloaded: boolean
  seller_archive_url: string | null
  seller_access_revoked: boolean
  seller_access_revoked_at: string | null
  status: TransferStatus
  notes: string | null
  created_at: string
}

// ── Audit ─────────────────────────────────────────────────

async function writeAudit(
  action: string,
  transferId: string,
  companyId: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  if (!supabase) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: company } = await supabase
    .from('companies')
    .select('client_account_id')
    .eq('id', companyId)
    .single()

  await supabase.from('audit_events').insert({
    actor_profile_id: user.id,
    client_account_id: company?.client_account_id ?? null,
    company_id: companyId,
    entity_type: 'company_transfer',
    entity_id: transferId,
    action,
    after_json: extra,
  })
}

// ── 1. Initiate ───────────────────────────────────────────

export async function initiateTransfer(
  process: TransferProcess,
): Promise<{ id: string | null; error: string | null }> {
  if (!supabase) return { id: null, error: 'Supabase не настроен' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { id: null, error: 'Не авторизиран' }

  const row = {
    company_id: process.companyId,
    transfer_type: process.transferType,
    from_profile_id: user.id,
    to_email: process.buyerEmail.trim().toLowerCase(),
    shares_transferred_pct: process.sharesPct,
    seller_management_from: process.sellerManagementFrom ?? null,
    seller_management_to:
      process.sellerManagementTo ?? process.transferDate,
    transfer_date: process.transferDate,
    notary_act_number: process.notaryActNumber ?? null,
    registry_entry: process.registryEntry ?? null,
    notes: process.notes ?? null,
    created_by: user.id,
    status: 'draft' as TransferStatus,
  }

  const { data, error } = await supabase
    .from('company_transfers')
    .insert(row)
    .select('id')
    .single()

  if (error || !data) {
    return { id: null, error: error?.message ?? 'Грешка при създаване' }
  }

  await writeAudit('transfer_initiated', data.id, process.companyId, {
    transfer_type: process.transferType,
    shares_pct: process.sharesPct,
    to_email: row.to_email,
  })

  return { id: data.id, error: null }
}

// ── 2. Generate seller archive ────────────────────────────

function docInPeriod(
  doc: VaultDocument,
  from: string | null,
  to: string | null,
): boolean {
  if (!from && !to) return true
  // period can be 'YYYY-MM' or 'YYYY' for system docs
  if (doc.period) {
    const periodStart =
      doc.period.length === 4 ? `${doc.period}-01-01` : `${doc.period}-01`
    const periodEnd =
      doc.period.length === 4 ? `${doc.period}-12-31` : `${doc.period}-31`
    if (to && periodStart > to) return false
    if (from && periodEnd < from) return false
    return true
  }
  // Uploaded documents — fall back to generatedAt as upload date
  const ts = doc.generatedAt.slice(0, 10)
  if (from && ts < from) return false
  if (to && ts > to) return false
  return true
}

function buildTransferCertificate(opts: {
  companyName: string
  eik: string
  transferDate: string
  notaryActNumber?: string | null
  from: string | null
  to: string | null
  language: AppLanguage
}): string {
  const { companyName, eik, transferDate, notaryActNumber, from, to, language } = opts
  const notary = notaryActNumber ?? '—'
  const periodFrom = from ?? '—'
  const periodTo = to ?? '—'

  const texts: Record<AppLanguage, string> = {
    bg:
      `ПРЕХВЪРЛЯНЕ НА ДРУЖЕСТВО\n` +
      `========================\n\n` +
      `Дружество: ${companyName}\n` +
      `ЕИК: ${eik}\n` +
      `Дата на прехвърляне: ${transferDate}\n` +
      `Нотариален акт: ${notary}\n\n` +
      `Този архив съдържа документи за периода ${periodFrom} — ${periodTo}, ` +
      `през който бившият собственик е управлявал дружеството.\n\n` +
      `Архивът се съхранява за данъчна защита на бившия собственик. ` +
      `Давностен срок по ДОПК чл. 109 — 5 години от края на годината, ` +
      `за която се отнася данъчното задължение.\n\n` +
      `Генерирано от TaxBG Pro.`,
    ru:
      `ПЕРЕДАЧА КОМПАНИИ\n` +
      `========================\n\n` +
      `Компания: ${companyName}\n` +
      `ЕИК: ${eik}\n` +
      `Дата передачи: ${transferDate}\n` +
      `Нотариальный акт: ${notary}\n\n` +
      `Этот архив содержит документы за период ${periodFrom} — ${periodTo}, ` +
      `когда бывший собственник управлял компанией.\n\n` +
      `Архив хранится для налоговой защиты бывшего собственника. ` +
      `Срок давности по ДОПК чл. 109 — 5 лет с конца года, к которому ` +
      `относится налоговое обязательство.\n\n` +
      `Сгенерировано в TaxBG Pro.`,
    en:
      `COMPANY TRANSFER\n` +
      `========================\n\n` +
      `Company: ${companyName}\n` +
      `EIK: ${eik}\n` +
      `Transfer date: ${transferDate}\n` +
      `Notary act: ${notary}\n\n` +
      `This archive contains documents for the period ${periodFrom} — ${periodTo}, ` +
      `during which the former owner managed the company.\n\n` +
      `Kept for tax protection of the former owner. ` +
      `Statute of limitation under ДОПК art. 109 — 5 years from the end ` +
      `of the year the tax obligation relates to.\n\n` +
      `Generated by TaxBG Pro.`,
    uk:
      `ПЕРЕДАЧА КОМПАНІЇ\n` +
      `========================\n\n` +
      `Компанія: ${companyName}\n` +
      `ЄІК: ${eik}\n` +
      `Дата передачі: ${transferDate}\n` +
      `Нотаріальний акт: ${notary}\n\n` +
      `Цей архів містить документи за період ${periodFrom} — ${periodTo}, ` +
      `коли колишній власник керував компанією.\n\n` +
      `Зберігається для податкового захисту колишнього власника. ` +
      `Строк давності за ДОПК ст. 109 — 5 років.\n\n` +
      `Згенеровано TaxBG Pro.`,
  }

  return texts[language] ?? texts.bg
}

export async function generateSellerArchive(
  transferId: string,
): Promise<{ blob: Blob | null; error: string | null }> {
  if (!supabase) return { blob: null, error: 'Supabase не настроен' }

  const { data: row, error } = await supabase
    .from('company_transfers')
    .select('*')
    .eq('id', transferId)
    .single<CompanyTransferRow>()

  if (error || !row) {
    return { blob: null, error: error?.message ?? 'Прехвърлянето не е намерено' }
  }

  const company = useCompaniesStore.getState().companies
    .find((c) => c.id === row.company_id)
  if (!company) return { blob: null, error: 'Компанията не е намерена' }

  const transactions = useAccountingStore.getState().transactions
    .filter((t) => !t.companyId || t.companyId === company.id)
  const employees = useEmployeesStore.getState().employees
  const journalEntries = useJournalStore.getState().entries
  const uploads = useVaultUploadsStore.getState().getForCompany(company.id)
  const language = useUserStore.getState().language

  // Years covered by the seller's period (for tree building)
  const fromY = row.seller_management_from
    ? Number(row.seller_management_from.slice(0, 4))
    : Number(transactions[0]?.date?.slice(0, 4)) || new Date().getFullYear()
  const toY = row.seller_management_to
    ? Number(row.seller_management_to.slice(0, 4))
    : new Date().getFullYear()
  const years: number[] = []
  for (let y = fromY; y <= toY; y++) years.push(y)
  if (years.length === 0) years.push(new Date().getFullYear())

  const tree = buildVaultTree(company.name, company.eik, language, years)

  const systemDocs = collectSystemDocuments({
    transactions,
    employees,
    journalEntries,
    companyName: company.name,
    eik: company.eik,
    language,
    years,
  })

  const uploadDocs: VaultDocument[] = uploads.map((u) => ({
    id: u.id,
    folderId: u.folderId,
    folderPath: u.folderPath,
    fileName: u.fileName,
    fileType: u.fileType,
    generatedAt: u.uploadedAt,
    size: u.size,
    source: 'upload',
    dataUrl: u.dataUrl,
  }))

  const filtered = [...systemDocs, ...uploadDocs].filter((d) =>
    docInPeriod(d, row.seller_management_from, row.seller_management_to),
  )

  const blob = await exportVaultAsZip(
    tree,
    filtered,
    {
      companyName: company.name,
      eik: company.eik,
      transactions,
      employees,
      journalEntries,
    },
    language,
  )

  // Append the transfer certificate to the ZIP root via a second pass.
  // We cannot inject into exportVaultAsZip without extending it, so we
  // re-open the blob using JSZip.
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(blob)
  zip.file(
    'TRANSFER_CERTIFICATE.txt',
    buildTransferCertificate({
      companyName: company.name,
      eik: company.eik,
      transferDate: row.transfer_date,
      notaryActNumber: row.notary_act_number,
      from: row.seller_management_from,
      to: row.seller_management_to,
      language,
    }),
  )
  const finalBlob = await zip.generateAsync({ type: 'blob' })

  await supabase
    .from('company_transfers')
    .update({
      seller_archive_generated: true,
      status: 'archive_ready' as TransferStatus,
    })
    .eq('id', transferId)

  await writeAudit('transfer_archive_generated', transferId, row.company_id, {
    files_included: filtered.length,
  })

  return { blob: finalBlob, error: null }
}

export async function markArchiveDownloaded(transferId: string): Promise<void> {
  if (!supabase) return
  const { data: row } = await supabase
    .from('company_transfers')
    .select('company_id')
    .eq('id', transferId)
    .single()

  await supabase
    .from('company_transfers')
    .update({ seller_archive_downloaded: true })
    .eq('id', transferId)

  if (row?.company_id) {
    await writeAudit('transfer_archive_downloaded', transferId, row.company_id)
  }
}

// ── Access control helpers ────────────────────────────────

async function revokeSellerAccess(
  clientAccountId: string,
  sellerProfileId: string,
): Promise<void> {
  if (!supabase) return
  await supabase
    .from('client_account_members')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
    })
    .eq('client_account_id', clientAccountId)
    .eq('profile_id', sellerProfileId)
}

async function addBuyerAsOwner(
  clientAccountId: string,
  buyerProfileId: string,
  invitedBy: string,
): Promise<void> {
  if (!supabase) return
  await supabase.from('client_account_members').upsert(
    {
      client_account_id: clientAccountId,
      profile_id: buyerProfileId,
      role: 'owner',
      status: 'active',
      invited_by: invitedBy,
      activated_at: new Date().toISOString(),
    },
    { onConflict: 'client_account_id,profile_id' },
  )
}

async function addBuyerAsPartner(
  companyId: string,
  buyerProfileId: string,
): Promise<void> {
  if (!supabase) return
  const { data: company } = await supabase
    .from('companies')
    .select('client_account_id')
    .eq('id', companyId)
    .single()
  if (!company) return

  await supabase.from('client_account_members').upsert(
    {
      client_account_id: company.client_account_id,
      profile_id: buyerProfileId,
      role: 'viewer',
      status: 'active',
      activated_at: new Date().toISOString(),
    },
    { onConflict: 'client_account_id,profile_id' },
  )

  await supabase.from('company_members').upsert(
    {
      company_id: companyId,
      profile_id: buyerProfileId,
      role: 'viewer',
      status: 'active',
      assigned_at: new Date().toISOString(),
    },
    { onConflict: 'company_id,profile_id' },
  )
}

// ── 3. Complete full transfer ─────────────────────────────

export async function completeFullTransfer(
  transferId: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase не настроен' }

  const { data: row, error } = await supabase
    .from('company_transfers')
    .select('*')
    .eq('id', transferId)
    .single<CompanyTransferRow>()
  if (error || !row) return { error: error?.message ?? 'Не е намерено' }

  if (row.transfer_type !== 'full_sale') {
    return { error: 'completeFullTransfer е приложимо само за full_sale' }
  }
  if (!row.seller_archive_downloaded) {
    return { error: 'Архивът не е свален — завършването е блокирано' }
  }

  const { data: company } = await supabase
    .from('companies')
    .select('client_account_id')
    .eq('id', row.company_id)
    .single()
  if (!company) return { error: 'Компанията не е намерена' }

  if (!row.to_profile_id) {
    await supabase
      .from('company_transfers')
      .update({ status: 'pending_buyer' as TransferStatus })
      .eq('id', transferId)
    await writeAudit('transfer_pending_buyer', transferId, row.company_id)
    return { error: null }
  }

  await addBuyerAsOwner(
    company.client_account_id,
    row.to_profile_id,
    row.from_profile_id ?? row.to_profile_id,
  )

  if (row.from_profile_id) {
    await revokeSellerAccess(company.client_account_id, row.from_profile_id)
  }

  await supabase
    .from('company_transfers')
    .update({
      status: 'completed' as TransferStatus,
      seller_access_revoked: true,
      seller_access_revoked_at: new Date().toISOString(),
    })
    .eq('id', transferId)

  await writeAudit('transfer_access_revoked', transferId, row.company_id)
  await writeAudit('transfer_completed', transferId, row.company_id)

  return { error: null }
}

// ── 4. Complete partial transfer ──────────────────────────

export async function completePartialTransfer(
  transferId: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase не настроен' }

  const { data: row, error } = await supabase
    .from('company_transfers')
    .select('*')
    .eq('id', transferId)
    .single<CompanyTransferRow>()
  if (error || !row) return { error: error?.message ?? 'Не е намерено' }

  if (row.transfer_type === 'full_sale') {
    return { error: 'completePartialTransfer не е за full_sale' }
  }

  if (!row.to_profile_id) {
    await supabase
      .from('company_transfers')
      .update({ status: 'pending_buyer' as TransferStatus })
      .eq('id', transferId)
    return { error: null }
  }

  await addBuyerAsPartner(row.company_id, row.to_profile_id)

  await supabase
    .from('company_transfers')
    .update({ status: 'completed' as TransferStatus })
    .eq('id', transferId)

  await writeAudit('transfer_completed', transferId, row.company_id, {
    mode: 'partial',
  })

  return { error: null }
}

// ── 5. Buyer claims a pending transfer ────────────────────

export async function claimTransferAsBuyer(
  transferId: string,
  profileId: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase не настроен' }

  const { data: row, error } = await supabase
    .from('company_transfers')
    .select('*')
    .eq('id', transferId)
    .single<CompanyTransferRow>()
  if (error || !row) return { error: error?.message ?? 'Не е намерено' }

  await supabase
    .from('company_transfers')
    .update({ to_profile_id: profileId })
    .eq('id', transferId)

  await writeAudit('transfer_claimed', transferId, row.company_id, {
    claimed_by: profileId,
  })

  if (row.transfer_type === 'full_sale') {
    if (row.seller_archive_downloaded) {
      return completeFullTransfer(transferId)
    }
    await supabase
      .from('company_transfers')
      .update({ status: 'pending_buyer' as TransferStatus })
      .eq('id', transferId)
    return { error: null }
  }

  // partial / inheritance / gift — add buyer as partner immediately
  return completePartialTransfer(transferId)
}

// ── 6. Pending lookup for the sign-in flow ────────────────

export interface PendingTransferSummary {
  id: string
  companyId: string
  companyName: string
  transferType: TransferType
  sharesPct: number
  transferDate: string
}

export async function findPendingTransfersForEmail(
  email: string,
): Promise<PendingTransferSummary[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('company_transfers')
    .select(
      'id, company_id, transfer_type, shares_transferred_pct, transfer_date, ' +
        'companies:company_id (name)',
    )
    .eq('status', 'pending_buyer')
    .eq('to_email', email.trim().toLowerCase())

  if (error || !data) return []

  return (data as unknown as Array<{
    id: string
    company_id: string
    transfer_type: TransferType
    shares_transferred_pct: number
    transfer_date: string
    companies: { name: string } | null
  }>).map((r) => ({
    id: r.id,
    companyId: r.company_id,
    companyName: r.companies?.name ?? '—',
    transferType: r.transfer_type,
    sharesPct: r.shares_transferred_pct,
    transferDate: r.transfer_date,
  }))
}
