import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useUserStore } from '../store/userStore'
import { useCompaniesStore } from '../store/companiesStore'
import { useLegislationStore } from '../store/legislationStore'
import LegislationTab from '../modules/superadmin/LegislationTab'
import CorrectionsTab from '../modules/superadmin/CorrectionsTab'
import {
  fetchAdminStats,
  fetchAuditEvents,
  fetchAllUsers,
  type AdminStats,
  type AdminUserSummary,
  type AuditEvent,
} from '../lib/supabaseAdmin'
import { supabase } from '../lib/supabase'
import { loadUserContext, type UserContext } from '../lib/remoteAccess'
import { getSnapshots, createSnapshot, restoreSnapshot, executeWithSafety } from '../lib/dataSnapshot'

type AdminTab = 'stats' | 'users' | 'logs' | 'legislation' | 'corrections' | 'analytics' | 'support' | 'user_view'

const T = {
  ru: {
    accessDenied: 'Доступ запрещён',
    accessDeniedDesc: 'Эта страница доступна только супер-администратору',
    pageTitle: 'Супер-Админ',
    adminOnly: 'ADMIN ONLY',
    refresh: '↻ Обновить',
    loading: 'Загрузка...',
    tabStats: 'Статистика',
    tabUsers: 'Пользователи',
    tabLogs: 'Аудит лог',
    tabLegislation: 'Законодательство',
    tabCorrections: 'Корректировки',
    tabAnalytics: 'Аналитика',
    totalUsers: 'Всего пользователей',
    proUsers: 'Pro подписок',
    freeUsers: 'Free пользователей',
    totalCompanies: 'Всего компаний',
    activeCompanies: 'Активных компаний',
    totalTransactions: 'Транзакций',
    recentEvents: 'Событий за 24ч',
    updatedAt: 'Обновлено',
    usersRecent: 'Последние',
    usersByDate: 'пользователей (по дате регистрации)',
    noData: 'Нет данных',
    logsRecent: 'Последние',
    logsEvents: 'событий',
    noEvents: 'Нет событий',
    activeToday: 'Активных сегодня',
    activeWeek: 'За неделю',
    activeMonth: 'За месяц',
    topPages: 'Топ-10 страниц',
    topActions: 'Топ-5 действий (7 дней)',
    activityChart: 'Активность по дням (30 дней)',
    page: 'Страница',
    views: 'Просмотров',
    action: 'Действие',
    count: 'Кол-во',
    date: 'Дата',
    events: 'События',
    tabSupport: 'Поддержка',
    tabUserView: 'Просмотр',
    ticketStatus: 'Статус',
    ticketDate: 'Дата',
    ticketDesc: 'Описание',
    ticketAiDiag: 'AI Диагноз',
    ticketDiagJson: 'Диагностика (JSON)',
    ticketTakeWork: 'Взять в работу',
    ticketResolve: 'Отметить решённым',
    noTickets: 'Нет тикетов',
    userViewSelect: 'Выберите пользователя для просмотра',
    userViewBtn: 'Просмотреть',
    userTransactions: 'Транзакции',
    userBalance: 'Баланс / ОПР',
    userEmployees: 'Сотрудники',
    userSnapshots: 'Снимки',
    snapshotRestore: 'Откатить',
    snapshotCreate: 'Создать снимок',
    snapshotConfirm: 'Вы уверены? Это заменит текущие данные.',
    snapshotConfirm2: 'Подтвердить откат',
    dangerActions: 'Действия',
    fixJournals: 'Создать снимок + исправить проводки',
    executing: 'Выполняем...',
  },
  en: {
    accessDenied: 'Access denied',
    accessDeniedDesc: 'This page is for super admins only',
    pageTitle: 'Super Admin',
    adminOnly: 'ADMIN ONLY',
    refresh: '↻ Refresh',
    loading: 'Loading...',
    tabStats: 'Stats',
    tabUsers: 'Users',
    tabLogs: 'Audit log',
    tabLegislation: 'Legislation',
    tabCorrections: 'Corrections',
    tabAnalytics: 'Analytics',
    totalUsers: 'Total users',
    proUsers: 'Pro subscriptions',
    freeUsers: 'Free users',
    totalCompanies: 'Total companies',
    activeCompanies: 'Active companies',
    totalTransactions: 'Transactions',
    recentEvents: 'Events (24h)',
    updatedAt: 'Updated',
    usersRecent: 'Latest',
    usersByDate: 'users (by signup date)',
    noData: 'No data',
    logsRecent: 'Latest',
    logsEvents: 'events',
    noEvents: 'No events',
    activeToday: 'Active today',
    activeWeek: 'This week',
    activeMonth: 'This month',
    topPages: 'Top 10 pages',
    topActions: 'Top 5 actions (7 days)',
    activityChart: 'Activity by day (30 days)',
    page: 'Page',
    views: 'Views',
    action: 'Action',
    count: 'Count',
    date: 'Date',
    events: 'Events',
    tabSupport: 'Support',
    tabUserView: 'User View',
    ticketStatus: 'Status',
    ticketDate: 'Date',
    ticketDesc: 'Description',
    ticketAiDiag: 'AI Diagnosis',
    ticketDiagJson: 'Diagnostics (JSON)',
    ticketTakeWork: 'Take in progress',
    ticketResolve: 'Mark resolved',
    noTickets: 'No tickets',
    userViewSelect: 'Select a user to view',
    userViewBtn: 'View',
    userTransactions: 'Transactions',
    userBalance: 'Balance / P&L',
    userEmployees: 'Employees',
    userSnapshots: 'Snapshots',
    snapshotRestore: 'Restore',
    snapshotCreate: 'Create snapshot',
    snapshotConfirm: 'Are you sure? This will replace current data.',
    snapshotConfirm2: 'Confirm restore',
    dangerActions: 'Actions',
    fixJournals: 'Snapshot + fix journal entries',
    executing: 'Executing...',
  },
  bg: {
    accessDenied: 'Достъпът е отказан',
    accessDeniedDesc: 'Тази страница е достъпна само за супер-администратори',
    pageTitle: 'Супер-Админ',
    adminOnly: 'ADMIN ONLY',
    refresh: '↻ Обнови',
    loading: 'Зареждане...',
    tabStats: 'Статистика',
    tabUsers: 'Потребители',
    tabLogs: 'Одит лог',
    tabLegislation: 'Законодателство',
    tabCorrections: 'Корекции',
    tabAnalytics: 'Аналитика',
    totalUsers: 'Общо потребители',
    proUsers: 'Pro абонаменти',
    freeUsers: 'Free потребители',
    totalCompanies: 'Общо компании',
    activeCompanies: 'Активни компании',
    totalTransactions: 'Транзакции',
    recentEvents: 'Събития (24ч)',
    updatedAt: 'Обновено',
    usersRecent: 'Последни',
    usersByDate: 'потребители (по дата на регистрация)',
    noData: 'Няма данни',
    logsRecent: 'Последни',
    logsEvents: 'събития',
    noEvents: 'Няма събития',
    activeToday: 'Активни днес',
    activeWeek: 'Тази седмица',
    activeMonth: 'Този месец',
    topPages: 'Топ 10 страници',
    topActions: 'Топ 5 действия (7 дни)',
    activityChart: 'Активност по дни (30 дни)',
    page: 'Страница',
    views: 'Прегледи',
    action: 'Действие',
    count: 'Брой',
    date: 'Дата',
    events: 'Събития',
    tabSupport: 'Поддръжка',
    tabUserView: 'Преглед',
    ticketStatus: 'Статус',
    ticketDate: 'Дата',
    ticketDesc: 'Описание',
    ticketAiDiag: 'AI Диагноза',
    ticketDiagJson: 'Диагностика (JSON)',
    ticketTakeWork: 'Вземи в работа',
    ticketResolve: 'Маркирай решен',
    noTickets: 'Няма тикети',
    userViewSelect: 'Изберете потребител за преглед',
    userViewBtn: 'Преглед',
    userTransactions: 'Транзакции',
    userBalance: 'Баланс / ОПР',
    userEmployees: 'Служители',
    userSnapshots: 'Снимки',
    snapshotRestore: 'Възстанови',
    snapshotCreate: 'Създай снимка',
    snapshotConfirm: 'Сигурни ли сте? Това ще замени текущите данни.',
    snapshotConfirm2: 'Потвърди възстановяване',
    dangerActions: 'Действия',
    fixJournals: 'Снимка + поправи проводки',
    executing: 'Изпълняваме...',
  },
  uk: {
    accessDenied: 'Доступ заборонено',
    accessDeniedDesc: 'Ця сторінка доступна лише супер-адміністраторам',
    pageTitle: 'Супер-Адмін',
    adminOnly: 'ADMIN ONLY',
    refresh: '↻ Оновити',
    loading: 'Завантаження...',
    tabStats: 'Статистика',
    tabUsers: 'Користувачі',
    tabLogs: 'Аудит лог',
    tabLegislation: 'Законодавство',
    tabCorrections: 'Коригування',
    tabAnalytics: 'Аналітика',
    totalUsers: 'Всього користувачів',
    proUsers: 'Pro підписок',
    freeUsers: 'Free користувачів',
    totalCompanies: 'Всього компаній',
    activeCompanies: 'Активних компаній',
    totalTransactions: 'Транзакцій',
    recentEvents: 'Подій за 24г',
    updatedAt: 'Оновлено',
    usersRecent: 'Останні',
    usersByDate: 'користувачів (за датою реєстрації)',
    noData: 'Немає даних',
    logsRecent: 'Останні',
    logsEvents: 'подій',
    noEvents: 'Немає подій',
    activeToday: 'Активних сьогодні',
    activeWeek: 'За тиждень',
    activeMonth: 'За місяць',
    topPages: 'Топ-10 сторінок',
    topActions: 'Топ-5 дій (7 днів)',
    activityChart: 'Активність по днях (30 днів)',
    page: 'Сторінка',
    views: 'Переглядів',
    action: 'Дія',
    count: 'Кількість',
    date: 'Дата',
    events: 'Події',
    tabSupport: 'Підтримка',
    tabUserView: 'Перегляд',
    ticketStatus: 'Статус',
    ticketDate: 'Дата',
    ticketDesc: 'Опис',
    ticketAiDiag: 'AI Діагноз',
    ticketDiagJson: 'Діагностика (JSON)',
    ticketTakeWork: 'Взяти в роботу',
    ticketResolve: 'Позначити вирішеним',
    noTickets: 'Немає тікетів',
    userViewSelect: 'Оберіть користувача для перегляду',
    userViewBtn: 'Переглянути',
    userTransactions: 'Транзакції',
    userBalance: 'Баланс / ОПР',
    userEmployees: 'Співробітники',
    userSnapshots: 'Знімки',
    snapshotRestore: 'Відкатити',
    snapshotCreate: 'Створити знімок',
    snapshotConfirm: 'Ви впевнені? Це замінить поточні дані.',
    snapshotConfirm2: 'Підтвердити відкат',
    dangerActions: 'Дії',
    fixJournals: 'Знімок + виправити проводки',
    executing: 'Виконуємо...',
  },
}

export default function SuperAdmin() {
  const { profile } = useAuthStore()
  const language = useUserStore(s => s.language) || 'ru'
  const labels = T[language] ?? T.ru

  const loadLegislationAlerts = useLegislationStore(s => s.loadAlerts)
  const legislationLoaded = useLegislationStore(s => s.isLoaded)
  const pendingAlerts = useLegislationStore(s => s.getPendingCount())
  const activeCompanyId = useCompaniesStore(s => s.activeCompanyId)
  const loadCorrections = useLegislationStore(s => s.loadCorrectionReports)
  const pendingCorrections = useLegislationStore(s =>
    activeCompanyId ? s.getPendingCorrectionsCount(activeCompanyId) : 0,
  )

  // Access guard — hard wall, not a redirect
  if (profile?.role !== 'superadmin') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-5xl">🚫</p>
          <p className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}>
            {labels.accessDenied}
          </p>
          <p className="text-sm"
            style={{ color: 'var(--text-muted)' }}>
            {labels.accessDeniedDesc}
          </p>
        </div>
      </div>
    )
  }

  const [tab, setTab]         = useState<AdminTab>('stats')
  const [stats, setStats]     = useState<AdminStats | null>(null)
  const [users, setUsers]     = useState<AdminUserSummary[]>([])
  const [logs,  setLogs]      = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date())

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<{
    activeToday: number
    activeWeek: number
    activeMonth: number
    topPages: { page: string; views: number }[]
    topActions: { action: string; count: number }[]
    dailyActivity: { date: string; events: number }[]
  } | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Support tickets state
  const [tickets, setTickets] = useState<Record<string, unknown>[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Record<string, unknown> | null>(null)
  const [diagExpanded, setDiagExpanded] = useState(false)

  // User view state
  const [userContext, setUserContext] = useState<UserContext | null>(null)
  const [userViewLoading, setUserViewLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userSnapshots, setUserSnapshots] = useState<Record<string, unknown>[]>([])
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null)
  const [actionRunning, setActionRunning] = useState(false)

  const load = async () => {
    setLoading(true)
    const [s, u, l] = await Promise.all([
      fetchAdminStats(),
      fetchAllUsers(50),
      fetchAuditEvents(100),
    ])
    setStats(s)
    setUsers(u)
    setLogs(l)
    setLoading(false)
    setRefreshedAt(new Date())
  }

  const loadAnalytics = async () => {
    if (!supabase) return
    setAnalyticsLoading(true)
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const [todayRes, weekRes, monthRes, pagesRes, actionsRes, dailyRes] = await Promise.all([
        // Active users today (unique profile_id)
        supabase.from('analytics_events')
          .select('profile_id')
          .gte('created_at', todayStart)
          .not('profile_id', 'is', null),
        // Active users this week
        supabase.from('analytics_events')
          .select('profile_id')
          .gte('created_at', weekAgo)
          .not('profile_id', 'is', null),
        // Active users this month
        supabase.from('analytics_events')
          .select('profile_id')
          .gte('created_at', monthAgo)
          .not('profile_id', 'is', null),
        // Top pages (page_view events last 30 days)
        supabase.from('analytics_events')
          .select('page_path')
          .eq('event_type', 'page_view')
          .gte('created_at', monthAgo),
        // Top actions last 7 days
        supabase.from('analytics_events')
          .select('event_type')
          .neq('event_type', 'page_view')
          .gte('created_at', weekAgo),
        // All events last 30 days for daily chart
        supabase.from('analytics_events')
          .select('created_at')
          .gte('created_at', monthAgo),
      ])

      // Count unique profile_ids
      const uniqueIds = (rows: { profile_id: string | null }[]) =>
        new Set(rows.filter(r => r.profile_id).map(r => r.profile_id)).size

      const activeToday = uniqueIds(todayRes.data ?? [])
      const activeWeek = uniqueIds(weekRes.data ?? [])
      const activeMonth = uniqueIds(monthRes.data ?? [])

      // Aggregate top pages
      const pageCounts = new Map<string, number>()
      for (const row of pagesRes.data ?? []) {
        const p = row.page_path ?? '/'
        pageCounts.set(p, (pageCounts.get(p) ?? 0) + 1)
      }
      const topPages = [...pageCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([page, views]) => ({ page, views }))

      // Aggregate top actions
      const actionCounts = new Map<string, number>()
      for (const row of actionsRes.data ?? []) {
        const a = row.event_type
        actionCounts.set(a, (actionCounts.get(a) ?? 0) + 1)
      }
      const topActions = [...actionCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([action, count]) => ({ action, count }))

      // Aggregate daily activity
      const dayCounts = new Map<string, number>()
      for (const row of dailyRes.data ?? []) {
        const d = row.created_at.slice(0, 10) // YYYY-MM-DD
        dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1)
      }
      // Fill all 30 days
      const dailyActivity: { date: string; events: number }[] = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const key = d.toISOString().slice(0, 10)
        dailyActivity.push({ date: key, events: dayCounts.get(key) ?? 0 })
      }

      setAnalyticsData({ activeToday, activeWeek, activeMonth, topPages, topActions, dailyActivity })
    } catch (err) {
      console.error('[superadmin] analytics load failed', err)
    }
    setAnalyticsLoading(false)
  }

  useEffect(() => { load() }, [])

  // Lazy-load legislation alerts on first mount of SuperAdmin page
  useEffect(() => {
    if (!legislationLoaded) loadLegislationAlerts()
  }, [legislationLoaded, loadLegislationAlerts])

  // Lazy-load correction reports for the active company
  useEffect(() => {
    if (activeCompanyId) loadCorrections(activeCompanyId)
  }, [activeCompanyId, loadCorrections])

  // Lazy-load analytics data when tab is selected
  useEffect(() => {
    if (tab === 'analytics' && !analyticsData && !analyticsLoading) loadAnalytics()
  }, [tab])

  // Lazy-load support tickets
  const loadTickets = async () => {
    if (!supabase) return
    setTicketsLoading(true)
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setTickets(data ?? [])
    setTicketsLoading(false)
  }
  useEffect(() => {
    if (tab === 'support' && tickets.length === 0 && !ticketsLoading) loadTickets()
  }, [tab])

  // User view helpers
  const handleViewUser = async (profileId: string) => {
    setUserViewLoading(true)
    setSelectedUserId(profileId)
    const ctx = await loadUserContext(profileId)
    setUserContext(ctx)
    // Load snapshots for first company
    const firstCompany = ctx.companies[0] as { id: string } | undefined
    if (firstCompany?.id) {
      const snaps = await getSnapshots(firstCompany.id)
      setUserSnapshots(snaps as unknown as Record<string, unknown>[])
    }
    setUserViewLoading(false)
  }

  const handleUpdateTicket = async (ticketId: string, patch: Record<string, unknown>) => {
    if (!supabase) return
    await supabase.from('support_tickets').update(patch).eq('id', ticketId)
    loadTickets()
    setSelectedTicket(null)
  }

  const handleRestoreSnapshot = async (snapshotId: string) => {
    if (!profile?.id) return
    setActionRunning(true)
    await restoreSnapshot(snapshotId, profile.id)
    if (selectedUserId) await handleViewUser(selectedUserId)
    setRestoreConfirm(null)
    setActionRunning(false)
  }

  const handleCreateSnapshot = async () => {
    if (!profile?.id || !userContext) return
    const firstCompany = userContext.companies[0] as { id: string } | undefined
    if (!firstCompany?.id) return
    setActionRunning(true)
    await createSnapshot({
      profileId: selectedUserId ?? profile.id,
      companyId: firstCompany.id,
      triggerType: 'manual',
    })
    const snaps = await getSnapshots(firstCompany.id)
    setUserSnapshots(snaps as unknown as Record<string, unknown>[])
    setActionRunning(false)
  }

  const handleFixJournals = async () => {
    if (!profile?.id || !userContext) return
    const firstCompany = userContext.companies[0] as { id: string } | undefined
    if (!firstCompany?.id) return
    setActionRunning(true)
    try {
      await executeWithSafety({
        profileId: profile.id,
        companyId: firstCompany.id,
        actionName: 'fix_journals_admin',
        action: async () => {
          // Backfill journal entries via accounting store
          const { useAccountingStore } = await import('../store/accountingStore')
          useAccountingStore.getState().backfillJournalEntries()
        },
      })
    } catch (err) {
      console.error('[superadmin] fix journals failed:', err)
    }
    setActionRunning(false)
  }

  const TABS: { id: AdminTab; label: string; icon: string; badge?: number }[] = [
    { id: 'stats',       label: labels.tabStats,       icon: '📊' },
    { id: 'users',       label: labels.tabUsers,       icon: '👥' },
    { id: 'logs',        label: labels.tabLogs,        icon: '📋' },
    { id: 'legislation', label: labels.tabLegislation, icon: '📜', badge: pendingAlerts },
    { id: 'corrections', label: labels.tabCorrections, icon: '🛠', badge: pendingCorrections },
    { id: 'analytics',   label: labels.tabAnalytics,   icon: '📈' },
    { id: 'support',     label: labels.tabSupport,     icon: '🎫' },
    { id: 'user_view',   label: labels.tabUserView,    icon: '👁' },
  ]

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div
        className="border-b px-6 pt-4 pb-0"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-card)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚡</span>
            <h1
              className="text-xl font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {labels.pageTitle}
            </h1>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-bold tracking-wide"
              style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
            >
              {labels.adminOnly}
            </span>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            {loading ? '...' : labels.refresh}
          </button>
        </div>

        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5"
              style={{
                borderBottom: tab === t.id
                  ? '2px solid var(--accent)'
                  : '2px solid transparent',
                color: tab === t.id
                  ? 'var(--accent)'
                  : 'var(--text-muted)',
              }}
            >
              <span>{t.icon} {t.label}</span>
              {t.badge !== undefined && t.badge > 0 && (
                <span
                  className="inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none min-w-[18px]"
                  style={{ backgroundColor: '#f59e0b', color: 'white' }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">

        {loading && tab !== 'legislation' && tab !== 'corrections' && (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {labels.loading}
          </p>
        )}

        {/* ── Stats ── */}
        {!loading && tab === 'stats' && stats && (
          <div className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[
                { label: labels.totalUsers,        value: stats.totalUsers,        icon: '👥' },
                { label: labels.proUsers,          value: stats.proUsers,          icon: '💎' },
                { label: labels.freeUsers,         value: stats.freeUsers,         icon: '🔓' },
                { label: labels.totalCompanies,    value: stats.totalCompanies,    icon: '🏢' },
                { label: labels.activeCompanies,   value: stats.activeCompanies,   icon: '✅' },
                { label: labels.totalTransactions, value: stats.totalTransactions, icon: '📊' },
                { label: labels.recentEvents,      value: stats.recentAuditEvents, icon: '🔔' },
              ].map(item => (
                <div
                  key={item.label}
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <p className="text-2xl">{item.icon}</p>
                  <p
                    className="text-2xl font-bold mt-1 tabular-nums"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {item.value}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {labels.updatedAt}: {refreshedAt.toLocaleTimeString()}
            </p>
          </div>
        )}

        {/* ── Users ── */}
        {!loading && tab === 'users' && (
          <div className="max-w-3xl space-y-2">
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              {labels.usersRecent} {users.length} {labels.usersByDate}
            </p>

            {users.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {labels.noData}
              </p>
            )}

            {users.map(u => (
              <div
                key={u.profileId}
                className="rounded-xl p-4 flex items-center justify-between gap-4"
                style={{
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="min-w-0">
                  <p
                    className="text-xs font-mono truncate"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {u.profileId}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor:
                          u.subscription === 'pro'
                            ? 'var(--accent-light)'
                            : 'var(--surface)',
                        color:
                          u.subscription === 'pro'
                            ? 'var(--accent)'
                            : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {u.subscription}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {u.role}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {u.language}
                    </span>
                  </div>
                </div>
                <p
                  className="text-xs whitespace-nowrap shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {new Date(u.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Audit logs ── */}
        {!loading && tab === 'logs' && (
          <div className="max-w-3xl space-y-2">
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              {labels.logsRecent} {logs.length} {labels.logsEvents}
            </p>

            {logs.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {labels.noEvents}
              </p>
            )}

            {logs.map(e => (
              <div
                key={e.id}
                className="rounded-xl p-3"
                style={{
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: e.action.includes('delete')
                          ? '#fef2f2'
                          : 'var(--accent-light)',
                        color: e.action.includes('delete')
                          ? '#dc2626'
                          : 'var(--accent)',
                      }}
                    >
                      {e.action}
                    </span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {e.entity_type}
                    </span>
                  </div>
                  <span
                    className="text-xs whitespace-nowrap shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                </div>
                <p
                  className="text-xs mt-1.5 font-mono truncate"
                  style={{ color: 'var(--text-muted)' }}
                >
                  actor: {e.actor_profile_id ?? '—'} ·
                  company: {e.company_id ?? '—'}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Legislation ── */}
        {tab === 'legislation' && <LegislationTab />}

        {/* ── Corrections ── */}
        {tab === 'corrections' && <CorrectionsTab />}

        {/* ── Analytics ── */}
        {tab === 'analytics' && (
          <div className="max-w-4xl space-y-6">
            {analyticsLoading && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {labels.loading}
              </p>
            )}

            {!analyticsLoading && analyticsData && (
              <>
                {/* Active users cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: labels.activeToday, value: analyticsData.activeToday, icon: '🟢' },
                    { label: labels.activeWeek,  value: analyticsData.activeWeek,  icon: '📅' },
                    { label: labels.activeMonth, value: analyticsData.activeMonth, icon: '📆' },
                  ].map(item => (
                    <div
                      key={item.label}
                      className="rounded-xl p-4"
                      style={{
                        backgroundColor: 'var(--surface-card)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <p className="text-2xl">{item.icon}</p>
                      <p
                        className="text-2xl font-bold mt-1 tabular-nums"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {item.value}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Top pages */}
                  <div
                    className="rounded-xl p-4"
                    style={{
                      backgroundColor: 'var(--surface-card)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <p
                      className="text-sm font-semibold mb-3"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {labels.topPages}
                    </p>
                    {analyticsData.topPages.length === 0 && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {labels.noData}
                      </p>
                    )}
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ color: 'var(--text-muted)' }}>
                          <th className="text-left pb-1 font-medium">{labels.page}</th>
                          <th className="text-right pb-1 font-medium">{labels.views}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.topPages.map(p => (
                          <tr key={p.page}>
                            <td className="py-1 font-mono" style={{ color: 'var(--text-secondary)' }}>
                              {p.page}
                            </td>
                            <td className="py-1 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>
                              {p.views}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Top actions */}
                  <div
                    className="rounded-xl p-4"
                    style={{
                      backgroundColor: 'var(--surface-card)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <p
                      className="text-sm font-semibold mb-3"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {labels.topActions}
                    </p>
                    {analyticsData.topActions.length === 0 && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {labels.noData}
                      </p>
                    )}
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ color: 'var(--text-muted)' }}>
                          <th className="text-left pb-1 font-medium">{labels.action}</th>
                          <th className="text-right pb-1 font-medium">{labels.count}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.topActions.map(a => (
                          <tr key={a.action}>
                            <td className="py-1 font-mono" style={{ color: 'var(--text-secondary)' }}>
                              {a.action}
                            </td>
                            <td className="py-1 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>
                              {a.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Daily activity bar chart */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <p
                    className="text-sm font-semibold mb-3"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {labels.activityChart}
                  </p>
                  {(() => {
                    const maxEvents = Math.max(...analyticsData.dailyActivity.map(d => d.events), 1)
                    return (
                      <div className="flex items-end gap-[2px]" style={{ height: 120 }}>
                        {analyticsData.dailyActivity.map(d => {
                          const pct = (d.events / maxEvents) * 100
                          return (
                            <div
                              key={d.date}
                              className="flex-1 rounded-t transition-all"
                              style={{
                                height: `${Math.max(pct, 2)}%`,
                                backgroundColor: d.events > 0 ? 'var(--accent)' : 'var(--border)',
                                minWidth: 4,
                              }}
                              title={`${d.date}: ${d.events}`}
                            />
                          )
                        })}
                      </div>
                    )
                  })()}
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {analyticsData.dailyActivity[0]?.date.slice(5)}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {analyticsData.dailyActivity[analyticsData.dailyActivity.length - 1]?.date.slice(5)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={loadAnalytics}
                    disabled={analyticsLoading}
                    className="text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
                    style={{
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {analyticsLoading ? '...' : labels.refresh}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Support Tickets ── */}
        {tab === 'support' && (
          <div className="max-w-4xl space-y-3">
            {ticketsLoading && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{labels.loading}</p>
            )}

            {!ticketsLoading && tickets.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{labels.noTickets}</p>
            )}

            {selectedTicket ? (
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-xs underline"
                  style={{ color: 'var(--accent)' }}
                >
                  &larr; Back
                </button>
                <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                      {selectedTicket.status as string}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(selectedTicket.created_at as string).toLocaleString()}
                    </span>
                  </div>

                  {selectedTicket.user_description && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{labels.ticketDesc}</p>
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedTicket.user_description as string}</p>
                    </div>
                  )}

                  {selectedTicket.ai_diagnosis && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{labels.ticketAiDiag}</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{selectedTicket.ai_diagnosis as string}</p>
                    </div>
                  )}

                  {selectedTicket.ai_suggested_fix && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Suggested fix</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{selectedTicket.ai_suggested_fix as string}</p>
                    </div>
                  )}

                  <div className="mb-3">
                    <button
                      onClick={() => setDiagExpanded(!diagExpanded)}
                      className="text-xs underline"
                      style={{ color: 'var(--accent)' }}
                    >
                      {labels.ticketDiagJson} {diagExpanded ? '▲' : '▼'}
                    </button>
                    {diagExpanded && (
                      <pre className="mt-2 text-[11px] p-3 rounded-lg overflow-auto max-h-80"
                        style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        {JSON.stringify(selectedTicket.diagnostic_json, null, 2)}
                      </pre>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    {selectedTicket.status !== 'in_progress' && selectedTicket.status !== 'resolved' && (
                      <button
                        onClick={() => handleUpdateTicket(selectedTicket.id as string, {
                          status: 'in_progress', resolved_by: profile?.id,
                        })}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                      >
                        {labels.ticketTakeWork}
                      </button>
                    )}
                    {selectedTicket.status !== 'resolved' && (
                      <button
                        onClick={() => handleUpdateTicket(selectedTicket.id as string, {
                          status: 'resolved', resolved_by: profile?.id,
                          resolved_at: new Date().toISOString(),
                        })}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                      >
                        {labels.ticketResolve}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id as string}
                  onClick={() => { setSelectedTicket(ticket); setDiagExpanded(false) }}
                  className="rounded-xl p-4 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: (ticket.status as string) === 'resolved' ? '#dcfce7' : 'var(--accent-light)',
                          color: (ticket.status as string) === 'resolved' ? '#16a34a' : 'var(--accent)',
                        }}>
                        {ticket.status as string}
                      </span>
                      <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {(ticket.user_description as string) || (ticket.ai_diagnosis as string)?.slice(0, 80) || '—'}
                      </p>
                    </div>
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {new Date(ticket.created_at as string).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs mt-1 font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                    profile: {(ticket.profile_id as string)?.slice(0, 8)} · id: {(ticket.id as string)?.slice(0, 8)}
                  </p>
                </div>
              ))
            )}

            <button
              onClick={loadTickets}
              disabled={ticketsLoading}
              className="text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 mt-4"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              {ticketsLoading ? '...' : labels.refresh}
            </button>
          </div>
        )}

        {/* ── User View ── */}
        {tab === 'user_view' && (
          <div className="max-w-4xl space-y-4">
            {!userContext && !userViewLoading && (
              <div className="space-y-3">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{labels.userViewSelect}</p>
                {users.map(u => (
                  <div key={u.profileId}
                    className="rounded-xl p-3 flex items-center justify-between"
                    style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                    <div>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{u.profileId.slice(0, 12)}...</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="rounded-full px-2 py-0.5 text-xs" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                          {u.subscription}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.role}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewUser(u.profileId)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium"
                      style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                    >
                      {labels.userViewBtn}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {userViewLoading && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{labels.loading}</p>
            )}

            {userContext && !userViewLoading && (
              <div className="space-y-4">
                <button
                  onClick={() => { setUserContext(null); setSelectedUserId(null) }}
                  className="text-xs underline"
                  style={{ color: 'var(--accent)' }}
                >
                  &larr; Back
                </button>

                {/* Profile info */}
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
                    {(userContext.profile as Record<string, unknown>)?.id as string}
                  </p>
                  <div className="flex gap-2 text-xs">
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {(userContext.profile as Record<string, unknown>)?.role as string}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {(userContext.profile as Record<string, unknown>)?.subscription as string}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {(userContext.profile as Record<string, unknown>)?.language as string}
                    </span>
                  </div>
                </div>

                {/* Transactions — read only */}
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {labels.userTransactions} ({userContext.transactions.length})
                  </p>
                  <div className="max-h-60 overflow-auto space-y-1">
                    {userContext.transactions.slice(0, 50).map((tx, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{tx.date as string}</span>
                          <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{tx.description as string}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}>
                            {tx.type as string}
                          </span>
                          <span className="font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                            {Number(tx.amount).toFixed(2)} &euro;
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Employees — read only */}
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {labels.userEmployees} ({userContext.employees.length})
                  </p>
                  <div className="space-y-1">
                    {userContext.employees.map((emp, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1">
                        <span style={{ color: 'var(--text-secondary)' }}>{emp.position as string}</span>
                        <span className="font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          {Number(emp.gross_salary).toFixed(2)} &euro;
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Snapshots */}
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {labels.userSnapshots} ({userSnapshots.length})
                    </p>
                    <button
                      onClick={handleCreateSnapshot}
                      disabled={actionRunning}
                      className="text-xs px-3 py-1 rounded-lg font-medium disabled:opacity-50"
                      style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                    >
                      {labels.snapshotCreate}
                    </button>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {userSnapshots.map((snap) => (
                      <div key={snap.id as string} className="flex items-center justify-between text-xs py-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                            {new Date(snap.created_at as string).toLocaleString()}
                          </span>
                          <span className="rounded-full px-1.5 py-0.5 text-[10px]"
                            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}>
                            {snap.trigger_type as string}
                          </span>
                        </div>
                        <div>
                          {restoreConfirm === (snap.id as string) ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleRestoreSnapshot(snap.id as string)}
                                disabled={actionRunning}
                                className="text-[10px] px-2 py-0.5 rounded font-bold disabled:opacity-50"
                                style={{ backgroundColor: '#dc2626', color: 'white' }}
                              >
                                {actionRunning ? '...' : labels.snapshotConfirm2}
                              </button>
                              <button onClick={() => setRestoreConfirm(null)} className="text-[10px] px-2 py-0.5 rounded"
                                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                &times;
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRestoreConfirm(snap.id as string)}
                              className="text-[10px] px-2 py-0.5 rounded"
                              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                            >
                              {labels.snapshotRestore}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Danger actions */}
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface-card)', border: '2px solid #dc2626' }}>
                  <p className="text-sm font-semibold mb-3" style={{ color: '#dc2626' }}>
                    {labels.dangerActions}
                  </p>
                  <button
                    onClick={handleFixJournals}
                    disabled={actionRunning}
                    className="text-xs px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                    style={{ border: '1px solid #dc2626', color: '#dc2626' }}
                  >
                    {actionRunning ? labels.executing : labels.fixJournals}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
