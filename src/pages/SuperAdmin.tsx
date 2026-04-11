import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import {
  fetchAdminStats,
  fetchAuditEvents,
  fetchAllUsers,
  type AdminStats,
  type AdminUserSummary,
  type AuditEvent,
} from '../lib/supabaseAdmin'

type AdminTab = 'stats' | 'users' | 'logs'

export default function SuperAdmin() {
  const { profile } = useAuthStore()

  // Access guard — hard wall, not a redirect
  if (profile?.role !== 'superadmin') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-5xl">🚫</p>
          <p className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}>
            Доступ запрещён
          </p>
          <p className="text-sm"
            style={{ color: 'var(--text-muted)' }}>
            Эта страница доступна только супер-администратору
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

  const TABS: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'stats', label: 'Статистика',    icon: '📊' },
    { id: 'users', label: 'Пользователи', icon: '👥' },
    { id: 'logs',  label: 'Аудит лог',    icon: '📋' },
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
              Супер-Админ
            </h1>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-bold tracking-wide"
              style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
            >
              ADMIN ONLY
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
            {loading ? '...' : '↻ Обновить'}
          </button>
        </div>

        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                borderBottom: tab === t.id
                  ? '2px solid var(--accent)'
                  : '2px solid transparent',
                color: tab === t.id
                  ? 'var(--accent)'
                  : 'var(--text-muted)',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">

        {loading && (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Загрузка...
          </p>
        )}

        {/* ── Stats ── */}
        {!loading && tab === 'stats' && stats && (
          <div className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[
                { label: 'Всего пользователей', value: stats.totalUsers,        icon: '👥' },
                { label: 'Pro подписок',         value: stats.proUsers,          icon: '💎' },
                { label: 'Free пользователей',   value: stats.freeUsers,         icon: '🔓' },
                { label: 'Всего компаний',        value: stats.totalCompanies,    icon: '🏢' },
                { label: 'Активных компаний',     value: stats.activeCompanies,   icon: '✅' },
                { label: 'Транзакций',            value: stats.totalTransactions, icon: '📊' },
                { label: 'Событий за 24ч',        value: stats.recentAuditEvents, icon: '🔔' },
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
              Обновлено: {refreshedAt.toLocaleTimeString()}
            </p>
          </div>
        )}

        {/* ── Users ── */}
        {!loading && tab === 'users' && (
          <div className="max-w-3xl space-y-2">
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Последние {users.length} пользователей (по дате регистрации)
            </p>

            {users.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Нет данных
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
              Последние {logs.length} событий
            </p>

            {logs.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Нет событий
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

      </div>
    </div>
  )
}
