import { useEffect, useRef, useState } from 'react'
import { useCompaniesStore } from '../store/companiesStore'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'

export interface CompanyRole {
  isDirector: boolean
  isAccountant: boolean
  /** true = same person is both director and accountant (or no members table) */
  isCombined: boolean
  /** true = a separate accountant exists → transactions need approval */
  needsApproval: boolean
  /** can approve/reject pending transactions */
  canApprove: boolean
  /** can create new transactions */
  canCreate: boolean
  loaded: boolean
}

const DEFAULT_COMBINED: CompanyRole = {
  isDirector:    true,
  isAccountant:  true,
  isCombined:    true,
  needsApproval: false,
  canApprove:    true,
  canCreate:     true,
  loaded:        true,
}

export function useCompanyRole(): CompanyRole {
  const activeCompanyId = useCompaniesStore((s) => s.activeCompanyId)
  // Select primitive fields individually to avoid object-reference churn
  const profileId   = useAuthStore((s) => s.profile?.id)
  const profileRole = useAuthStore((s) => s.profile?.role)
  const isDemo      = useAuthStore((s) => s.isDemo)

  const [role, setRole] = useState<CompanyRole>({ ...DEFAULT_COMBINED, loaded: false })
  // Track the last args we ran for, so the effect only fires on real changes
  const prevKey = useRef<string>('')

  useEffect(() => {
    const key = `${isDemo}|${activeCompanyId ?? ''}|${profileId ?? ''}|${profileRole ?? ''}`
    if (key === prevKey.current) return
    prevKey.current = key

    // Demo mode or no active company → combined (no workflow)
    if (isDemo || !activeCompanyId || !profileId) {
      setRole(DEFAULT_COMBINED)
      return
    }

    // Superadmin / superuser bypass workflow entirely
    if (profileRole === 'superadmin' || profileRole === 'superuser') {
      setRole(DEFAULT_COMBINED)
      return
    }

    if (!supabase) {
      setRole(DEFAULT_COMBINED)
      return
    }

    let cancelled = false

    async function load() {
      try {
        const { data, error } = await supabase!
          .from('company_members')
          .select('profile_id, is_director, is_accountant')
          .eq('company_id', activeCompanyId)

        if (cancelled) return

        if (error || !data || data.length === 0) {
          setRole(DEFAULT_COMBINED)
          return
        }

        const myRecord = data.find((m: Record<string, unknown>) => m.profile_id === profileId)

        const isDirector   = Boolean(myRecord?.is_director)
        const isAccountant = Boolean(myRecord?.is_accountant)

        const separateAccountant = data.some(
          (m: Record<string, unknown>) =>
            m.profile_id !== profileId && Boolean(m.is_accountant)
        )

        const isCombined    = isDirector && isAccountant
        const needsApproval = isDirector && !isAccountant && separateAccountant

        const canApprove =
          isAccountant ||
          isCombined ||
          profileRole === 'owner' ||
          profileRole === 'superadmin' ||
          profileRole === 'superuser'

        const canCreate =
          isDirector ||
          isCombined ||
          profileRole === 'owner' ||
          profileRole === 'superadmin' ||
          profileRole === 'superuser'

        setRole({ isDirector, isAccountant, isCombined, needsApproval, canApprove, canCreate, loaded: true })
      } catch {
        if (!cancelled) setRole(DEFAULT_COMBINED)
      }
    }

    load()

    return () => { cancelled = true }
  }, [activeCompanyId, profileId, profileRole, isDemo])

  return role
}
