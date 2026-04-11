import { useEffect, useState } from 'react'
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
  const profile = useAuthStore((s) => s.profile)
  const isDemo  = useAuthStore((s) => s.isDemo)

  const [role, setRole] = useState<CompanyRole>({ ...DEFAULT_COMBINED, loaded: false })

  useEffect(() => {
    // Demo mode or no active company → combined (no workflow)
    if (isDemo || !activeCompanyId || !profile) {
      setRole(DEFAULT_COMBINED)
      return
    }

    // Superadmin / superuser bypass workflow entirely
    if (profile.role === 'superadmin' || profile.role === 'superuser') {
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
        // Graceful fallback: if is_director / is_accountant columns don't exist yet
        // (migration 000012 not applied), the query still succeeds but returns rows
        // without those fields → we fall back to isCombined=true
        const { data, error } = await supabase!
          .from('company_members')
          .select('profile_id, is_director, is_accountant')
          .eq('company_id', activeCompanyId)

        if (cancelled) return

        if (error || !data || data.length === 0) {
          // No members records → single-user company, combined role
          setRole(DEFAULT_COMBINED)
          return
        }

        const myRecord = data.find((m: Record<string, unknown>) => m.profile_id === profile!.id)

        // is_director / is_accountant may be null/undefined if migration not applied
        const isDirector   = Boolean(myRecord?.is_director)
        const isAccountant = Boolean(myRecord?.is_accountant)

        // Check if there is ANOTHER member with is_accountant=true
        const separateAccountant = data.some(
          (m: Record<string, unknown>) =>
            m.profile_id !== profile!.id && Boolean(m.is_accountant)
        )

        const isCombined    = isDirector && isAccountant
        const needsApproval = isDirector && !isAccountant && separateAccountant

        // canApprove: accountant, owner, superadmin, or combined
        const canApprove =
          isAccountant ||
          isCombined ||
          profile!.role === 'owner' ||
          profile!.role === 'superadmin' ||
          profile!.role === 'superuser'

        const canCreate =
          isDirector ||
          isCombined ||
          profile!.role === 'owner' ||
          profile!.role === 'superadmin' ||
          profile!.role === 'superuser'

        setRole({
          isDirector,
          isAccountant,
          isCombined,
          needsApproval,
          canApprove,
          canCreate,
          loaded: true,
        })
      } catch {
        // Any error → safe fallback
        if (!cancelled) setRole(DEFAULT_COMBINED)
      }
    }

    setRole((prev) => ({ ...prev, loaded: false }))
    load()

    return () => { cancelled = true }
  }, [activeCompanyId, profile, isDemo])

  return role
}
