import { supabase, isSupabaseConfigured } from './supabase'

let sessionId: string = ''
let analyticsEnabled = false

export function initAnalytics() {
  // Check consent
  const consent = localStorage.getItem('taxbg-cookie-analytics')
  analyticsEnabled = consent === 'true'

  if (!analyticsEnabled) return

  // Generate session ID (not persisted between sessions — privacy)
  sessionId = crypto.randomUUID()
}

export function setAnalyticsEnabled(enabled: boolean) {
  analyticsEnabled = enabled
  if (enabled && !sessionId) {
    sessionId = crypto.randomUUID()
  }
}

export function trackEvent(eventType: string, data?: Record<string, unknown>) {
  if (!analyticsEnabled || !isSupabaseConfigured || !supabase) return

  // Fire-and-forget, don't block UI
  supabase
    .auth.getUser()
    .then(({ data: userData }) => {
      supabase!.from('analytics_events').insert({
        profile_id: userData?.user?.id ?? null,
        session_id: sessionId,
        event_type: eventType,
        event_data: data ?? null,
        page_path: window.location.pathname,
      }).then(({ error }) => {
        if (error) console.warn('[analytics]', error.message)
      })
    })
}

export function trackPageView(path: string) {
  trackEvent('page_view', { path })
}
