import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type RelationType =
  | 'parent'       // владеет дочерней
  | 'subsidiary'   // дочерняя компания
  | 'partner'      // партнёрская
  | 'offshore'     // офшорный холдинг/IP box
  | 'branch'       // филиал

export interface CompanyRelation {
  id: string
  fromCompanyId: string
  toCompanyId: string
  type: RelationType
  ownershipPct?: number    // % владения (для parent/subsidiary)
  purpose?: string         // 'IP holding' | 'trading' | 'payroll' etc.
  annualFlow?: number      // годовой денежный поток между компаниями €
  notes: string
}

interface GroupState {
  relations: CompanyRelation[]
  clientAccountId: string | null
  isSynced: boolean

  initFromSupabase: (clientAccountId: string) => Promise<void>
  addRelation:      (r: Omit<CompanyRelation, 'id'>) => void
  updateRelation:   (id: string, patch: Partial<CompanyRelation>) => void
  removeRelation:   (id: string) => void
  getRelationsFor:  (companyId: string) => CompanyRelation[]
}

export const useGroupStore = create<GroupState>()(
  persist(
    (set, get) => ({
      relations: [],
      clientAccountId: null,
      isSynced: false,

      initFromSupabase: async (clientAccountId) => {
        const { fetchRelations, importLocalRelations } =
          await import('../lib/supabaseGroup')
        set({ clientAccountId })
        const serverRelations = await fetchRelations(clientAccountId)
        if (serverRelations.length === 0) {
          const local = get().relations
          if (local.length > 0) await importLocalRelations(local, clientAccountId)
          set({ relations: await fetchRelations(clientAccountId), isSynced: true })
        } else {
          set({ relations: serverRelations, isSynced: true })
        }
      },

      addRelation: (r) => {
        const id = crypto.randomUUID()
        const newRelation: CompanyRelation = { ...r, id }
        set(s => ({ relations: [...s.relations, newRelation] }))
        const { clientAccountId, isSynced } = get()
        if (clientAccountId && isSynced) {
          import('../lib/supabaseGroup').then(({ createRelation }) =>
            createRelation(newRelation, clientAccountId).then(
              ({ error }) => { if (error) console.error('Sync addRelation:', error) }
            )
          )
        }
      },

      updateRelation: (id, patch) => {
        set((s) => ({
          relations: s.relations.map((r) =>
            r.id === id ? { ...r, ...patch } : r
          ),
        }))
        if (get().isSynced) {
          import('../lib/supabaseGroup').then(({ updateRelationInSupabase }) =>
            updateRelationInSupabase(id, patch).then(
              ({ error }) => { if (error) console.error('Sync updateRelation:', error) }
            )
          )
        }
      },

      removeRelation: (id) => {
        set((s) => ({
          relations: s.relations.filter((r) => r.id !== id),
        }))
        if (get().isSynced) {
          import('../lib/supabaseGroup').then(({ deleteRelationFromSupabase }) =>
            deleteRelationFromSupabase(id).then(
              ({ error }) => { if (error) console.error('Sync removeRelation:', error) }
            )
          )
        }
      },

      getRelationsFor: (companyId) =>
        get().relations.filter(
          (r) => r.fromCompanyId === companyId || r.toCompanyId === companyId
        ),
    }),
    { name: 'taxbg-group' }
  )
)

export const RELATION_LABELS: Record<RelationType, string> = {
  parent:     'Материнская компания',
  subsidiary: 'Дочерняя компания',
  partner:    'Партнёрская компания',
  offshore:   'Офшорный холдинг / IP Box',
  branch:     'Филиал',
}

export const COUNTRY_OPTIONS = [
  { code: 'BG',    label: '🇧🇬 Болгария — КНП 10%' },
  { code: 'CY',    label: '🇨🇾 Кипр — КНП 12.5%' },
  { code: 'EE',    label: '🇪🇪 Эстония — КНП 0% (при реинвест.)' },
  { code: 'DE',    label: '🇩🇪 Германия — КНП ~30%' },
  { code: 'NL',    label: '🇳🇱 Нидерланды — КНП 19-25.8%' },
  { code: 'IE',    label: '🇮🇪 Ирландия — КНП 12.5%' },
  { code: 'AE',    label: '🇦🇪 ОАЭ — КНП 9% (от 375K AED)' },
  { code: 'GE',    label: '🇬🇪 Грузия — КНП 15%' },
  { code: 'AM',    label: '🇦🇲 Армения — КНП 18%' },
  { code: 'RS',    label: '🇷🇸 Сербия — КНП 15%' },
  { code: 'MT',    label: '🇲🇹 Мальта — КНП 35% / эфф. 5%' },
  { code: 'LU',    label: '🇱🇺 Люксембург — КНП 17%' },
  { code: 'OTHER', label: '🌍 Другая юрисдикция' },
]
