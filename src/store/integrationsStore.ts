import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface NapApiConfig {
  enabled: boolean
  apiKey: string
  organizationId: string
  status: 'connected' | 'error' | 'unchecked'
  lastChecked?: string
}

export interface EmailConfig {
  enabled: boolean
  userEmail: string
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  resendApiKey: string
  useResend: boolean
  status: 'connected' | 'error' | 'unchecked'
}

export interface PikConfig {
  enabled: boolean
  pikCode: string
  status: 'saved' | 'unchecked'
}

interface IntegrationsState {
  napApi: NapApiConfig
  email: EmailConfig
  pik: PikConfig

  setNapApi: (config: Partial<NapApiConfig>) => void
  setEmail: (config: Partial<EmailConfig>) => void
  setPik: (config: Partial<PikConfig>) => void
}

const DEFAULT_NAP: NapApiConfig = {
  enabled: false,
  apiKey: '',
  organizationId: '',
  status: 'unchecked',
}

const DEFAULT_EMAIL: EmailConfig = {
  enabled: false,
  userEmail: '',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  resendApiKey: '',
  useResend: true,
  status: 'unchecked',
}

const DEFAULT_PIK: PikConfig = {
  enabled: false,
  pikCode: '',
  status: 'unchecked',
}

export const useIntegrationsStore = create<IntegrationsState>()(
  persist(
    (set) => ({
      napApi: DEFAULT_NAP,
      email: DEFAULT_EMAIL,
      pik: DEFAULT_PIK,
      setNapApi: (cfg) => set((s) => ({ napApi: { ...s.napApi, ...cfg } })),
      setEmail: (cfg) => set((s) => ({ email: { ...s.email, ...cfg } })),
      setPik: (cfg) => set((s) => ({ pik: { ...s.pik, ...cfg } })),
    }),
    { name: 'taxbg-integrations' }
  )
)
