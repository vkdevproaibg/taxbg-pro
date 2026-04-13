import { supabase, isSupabaseConfigured } from './supabase'
import { useCompaniesStore } from '../store/companiesStore'
import { useAccountingStore } from '../store/accountingStore'
import { useEmployeesStore } from '../store/employeesStore'

export interface HealthCheckResult {
  supabaseReachable: boolean
  localStorageAvailable: boolean
  localStorageUsedMB: number
  sessionValid: boolean
  browserSupported: boolean
  fontsLoaded: boolean
  lastCrash: string | null
  storesIntegrity: {
    companiesLoaded: boolean
    accountingLoaded: boolean
    employeesLoaded: boolean
  }
}

export async function runHealthCheck(): Promise<HealthCheckResult> {
  // Supabase reachability
  let supabaseReachable = false
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1)
      supabaseReachable = !error
    } catch {
      supabaseReachable = false
    }
  }

  // localStorage
  let localStorageAvailable = false
  let localStorageUsedMB = 0
  try {
    const testKey = '__hc_test__'
    localStorage.setItem(testKey, '1')
    localStorage.removeItem(testKey)
    localStorageAvailable = true

    let totalBytes = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        totalBytes += key.length + (localStorage.getItem(key)?.length ?? 0)
      }
    }
    localStorageUsedMB = Math.round((totalBytes * 2) / 1024 / 1024 * 100) / 100 // UTF-16
  } catch {
    localStorageAvailable = false
  }

  // Session validity
  let sessionValid = false
  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.auth.getSession()
      sessionValid = Boolean(data.session)
    } catch {
      sessionValid = false
    }
  }

  // Browser support
  let browserSupported = true
  try {
    if (typeof crypto.randomUUID !== 'function') browserSupported = false
    if (typeof fetch !== 'function') browserSupported = false
  } catch {
    browserSupported = false
  }

  // Fonts loaded
  let fontsLoaded = false
  try {
    if (document.fonts) {
      fontsLoaded = document.fonts.check('16px "Noto Sans"')
    }
  } catch {
    fontsLoaded = false
  }

  // Last crash
  let lastCrash: string | null = null
  try {
    lastCrash = localStorage.getItem('taxbg-crash-log')
  } catch { /* ignore */ }

  // Stores integrity
  const companiesLoaded = useCompaniesStore.getState().companies.length > 0 || useCompaniesStore.getState().isSynced
  const accountingLoaded = useAccountingStore.getState().isSynced
  const employeesLoaded = useEmployeesStore.getState().isSynced

  return {
    supabaseReachable,
    localStorageAvailable,
    localStorageUsedMB,
    sessionValid,
    browserSupported,
    fontsLoaded,
    lastCrash,
    storesIntegrity: {
      companiesLoaded,
      accountingLoaded,
      employeesLoaded,
    },
  }
}
