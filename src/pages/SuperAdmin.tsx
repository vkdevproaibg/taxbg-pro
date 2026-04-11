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

type AdminTab = 'stats' | 'users' | 'logs' | 'legislation' | 'corrections'

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

  useEffect(() => { load() }, [])

  // Lazy-load legislation alerts on first mount of SuperAdmin page
  useEffect(() => {
    if (!legislationLoaded) loadLegislationAlerts()
  }, [legislationLoaded, loadLegislationAlerts])

  // Lazy-load correction reports for the active company
  useEffect(() => {
    if (activeCompanyId) loadCorrections(activeCompanyId)
  }, [activeCompanyId, loadCorrections])

  const TABS: { id: AdminTab; label: string; icon: string; badge?: number }[] = [
    { id: 'stats',       label: labels.tabStats,       icon: '📊' },
    { id: 'users',       label: labels.tabUsers,       icon: '👥' },
    { id: 'logs',        label: labels.tabLogs,        icon: '📋' },
    { id: 'legislation', label: labels.tabLegislation, icon: '📜', badge: pendingAlerts },
    { id: 'corrections', label: labels.tabCorrections, icon: '🛠', badge: pendingCorrections },
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

      </div>
    </div>
  )
}
