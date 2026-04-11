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
  napApi:   NapApiConfig
  email:    EmailConfig
  pik:      PikConfig
  isSynced: boolean

  setNapApi:         (config: Partial<NapApiConfig>) => void
  setEmail:          (config: Partial<EmailConfig>)  => void
  setPik:            (config: Partial<PikConfig>)    => void
  initFromSupabase:  (profileId: string) => Promise<void>
  persistToSupabase: () => Promise<void>
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
    (set, get) => ({
      napApi:   DEFAULT_NAP,
      email:    DEFAULT_EMAIL,
      pik:      DEFAULT_PIK,
      isSynced: false,

      setNapApi: (cfg) => {
        set(s => ({ napApi: { ...s.napApi, ...cfg } }))
        if (get().isSynced) get().persistToSupabase()
      },

      setEmail: (cfg) => {
        set(s => ({ email: { ...s.email, ...cfg } }))
        if (get().isSynced) get().persistToSupabase()
      },

      setPik: (cfg) => {
        set(s => ({ pik: { ...s.pik, ...cfg } }))
        if (get().isSynced) get().persistToSupabase()
      },

      initFromSupabase: async (profileId) => {
        const { loadIntegrations } = await import('../lib/supabaseIntegrations')
        const data = await loadIntegrations(profileId)

        if (data) {
          set(s => ({
            napApi:   { ...s.napApi,  ...data.nap },
            email:    { ...s.email,   ...data.email },
            pik:      { ...s.pik,     ...data.pik },
            isSynced: true,
          }))
        } else {
          set({ isSynced: true })
          get().persistToSupabase()
        }
      },

      persistToSupabase: async () => {
        const { saveIntegrations } = await import('../lib/supabaseIntegrations')
        const { useAuthStore }     = await import('./authStore')
        const userId = useAuthStore.getState().user?.id
        if (!userId) return
        const { napApi, email, pik } = get()
        const { error } = await saveIntegrations(userId, napApi, email, pik)
        if (error) console.error('persistToSupabase integrations:', error)
      },
    }),
    { name: 'taxbg-integrations' }
  )
)
