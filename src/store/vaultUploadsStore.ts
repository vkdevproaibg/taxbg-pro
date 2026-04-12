import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VaultFileType } from '../lib/documentVault'

export interface VaultUpload {
  id: string
  companyId: string
  folderId: string
  folderPath: string
  fileName: string
  fileType: VaultFileType
  dataUrl: string
  size: number
  uploadedAt: string
}

interface VaultUploadsState {
  uploads: VaultUpload[]
  addUpload: (u: Omit<VaultUpload, 'id' | 'uploadedAt'>) => VaultUpload
  removeUpload: (id: string) => void
  getForCompany: (companyId: string) => VaultUpload[]
  getForFolder: (companyId: string, folderId: string) => VaultUpload[]
}

function newId(): string {
  return `vu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export const useVaultUploadsStore = create<VaultUploadsState>()(
  persist(
    (set, get) => ({
      uploads: [],

      addUpload: (u) => {
        const full: VaultUpload = {
          ...u,
          id: newId(),
          uploadedAt: new Date().toISOString(),
        }
        set((state) => ({ uploads: [...state.uploads, full] }))
        import('../lib/analytics').then(({ trackEvent }) => {
          trackEvent('vault_upload')
        })
        return full
      },

      removeUpload: (id) => {
        set((state) => ({ uploads: state.uploads.filter((u) => u.id !== id) }))
      },

      getForCompany: (companyId) => get().uploads.filter((u) => u.companyId === companyId),

      getForFolder: (companyId, folderId) =>
        get().uploads.filter((u) => u.companyId === companyId && u.folderId === folderId),
    }),
    { name: 'taxbg-vault-uploads' },
  ),
)
