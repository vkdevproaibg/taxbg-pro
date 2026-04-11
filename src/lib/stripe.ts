/**
 * Stripe Checkout helper — web only.
 * Mobile will use IAP (future).
 *
 * TODO (июнь 2026): настроить Stripe после регистрации юр. лица.
 * Промт с инструкциями: docs/stripe-setup-prompt.md
 */

/**
 * Returns true when Stripe env keys are present in the build.
 * Used by PaywallModal to decide whether to show the real button or stub.
 */
export function isStripeConfigured(): boolean {
  return (
    !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY &&
    !!import.meta.env.VITE_STRIPE_PRICE_ID
  )
}

export async function startCheckout(
  companyId: string,
  userAccessToken: string
): Promise<{ error: string | null }> {
  // TODO (июнь 2026): реализовать после регистрации юр. лица.
  // Инструкции: docs/stripe-setup-prompt.md
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  const priceId = import.meta.env.VITE_STRIPE_PRICE_ID
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

  if (!publishableKey || !priceId) {
    return { error: 'not_configured' }
  }
  if (!supabaseUrl) {
    return { error: 'Supabase URL not configured' }
  }

  const successUrl = `${window.location.origin}/?stripe=success`
  const cancelUrl = `${window.location.origin}/?stripe=cancelled`

  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/create-checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify({ priceId, companyId, successUrl, cancelUrl }),
      }
    )

    const data = await res.json()

    if (!res.ok || data.error) {
      return { error: data.error ?? `HTTP ${res.status}` }
    }

    if (!data.url) {
      return { error: 'No checkout URL returned' }
    }

    // Redirect to Stripe Checkout hosted page
    window.location.href = data.url
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error'
    return { error: message }
  }
}
