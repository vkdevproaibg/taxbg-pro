import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type LegalForm = 'ood' | 'et' | 'self'
export type AppLanguage = 'ru' | 'uk' | 'en' | 'bg'
export type LLMProvider = 'openrouter' | 'original'
export type LLMMode = 'own_key' | 'platform'

interface UserState {
  onboardingDone: boolean
  legalForm: LegalForm
  hasVat: boolean
  hasEmployees: boolean
  eik: string
  language: AppLanguage
  companyName: string
  taxPeriod: string
  llmProvider: LLMProvider
  llmMode: LLMMode
  llmApiKey: string
  llmModel: string
  useCustomModelForChat: boolean
  setOnboardingDone: (done: boolean) => void
  setLegalForm: (form: LegalForm) => void
  setHasVat: (v: boolean) => void
  setHasEmployees: (v: boolean) => void
  setEik: (eik: string) => void
  setLanguage: (lang: AppLanguage) => void
  setCompanyName: (name: string) => void
  setTaxPeriod: (period: string) => void
  setLlmProvider: (provider: LLMProvider) => void
  setLlmApiKey: (key: string) => void
  setLlmModel: (model: string) => void
  setUseCustomModelForChat: (enabled: boolean) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      onboardingDone: false,
      legalForm: 'ood',
      hasVat: false,
      hasEmployees: false,
      eik: '',
      language: 'ru',
      companyName: '',
      taxPeriod: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      llmProvider: 'openrouter',
      llmMode: 'own_key',
      llmApiKey: '',
      llmModel: import.meta.env.VITE_LLM_MODEL ?? 'anthropic/claude-sonnet-4-5',
      useCustomModelForChat: false,
      setOnboardingDone: (onboardingDone) => set({ onboardingDone }),
      setLegalForm: (legalForm) => set({ legalForm }),
      setHasVat: (hasVat) => set({ hasVat }),
      setHasEmployees: (hasEmployees) => set({ hasEmployees }),
      setEik: (eik) => set({ eik }),
      setLanguage: (language) => set({ language }),
      setCompanyName: (companyName) => set({ companyName }),
      setTaxPeriod: (taxPeriod) => set({ taxPeriod }),
      setLlmProvider: (llmProvider) => set({ llmProvider }),
      setLlmApiKey: (llmApiKey) => set({ llmApiKey }),
      setLlmModel: (llmModel) => set({ llmModel }),
      setUseCustomModelForChat: (useCustomModelForChat) => set({ useCustomModelForChat }),
    }),
    { name: 'taxbg-user' }
  )
)
