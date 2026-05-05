import { schedule } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// Runs every 2 days at 06:00 UTC
// Cron: minute hour day-of-month month day-of-week
export const handler = schedule('0 6 */2 * *', async () => {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('keep-alive: missing Supabase env vars')
    return { statusCode: 500 }
  }

  const supabase = createClient(url, key)

  // Minimal read — just fetch 1 row from any system-like table.
  // Using rpc('now') is the lightest possible call: SELECT now()
  const { error } = await supabase.rpc('now')

  if (error && error.code !== 'PGRST202') {
    // PGRST202 = function not found — fall back to a simple select
    const { error: e2 } = await supabase
      .from('audit_events')
      .select('id')
      .limit(1)

    if (e2) {
      console.error('keep-alive error:', e2.message)
      return { statusCode: 500 }
    }
  }

  console.log('keep-alive: Supabase pinged at', new Date().toISOString())
  return { statusCode: 200 }
})
