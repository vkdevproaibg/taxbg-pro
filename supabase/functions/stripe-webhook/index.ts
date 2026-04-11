import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!stripeSecretKey || !webhookSecret) {
    return new Response('Stripe secrets not configured', { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const body = await req.text()

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Signature verification failed'
    console.error('Webhook signature error:', msg)
    return new Response(`Webhook Error: ${msg}`, { status: 400 })
  }

  const supabase = createClient(supabaseUrl!, serviceRoleKey!)

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      const companyId = session.metadata?.company_id
      const stripeSubscriptionId = session.subscription as string | null

      console.log('checkout.session.completed', { userId, companyId, stripeSubscriptionId })

      if (!userId) {
        console.error('Missing user_id in session metadata')
        return new Response('Missing user_id', { status: 400 })
      }

      // Update profile subscription to 'pro'
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ subscription: 'pro' })
        .eq('id', userId)

      if (profileError) {
        console.error('Failed to update profile subscription:', profileError)
        return new Response('Failed to update profile', { status: 500 })
      }

      // Upsert company subscription
      if (companyId && stripeSubscriptionId) {
        const { error: subError } = await supabase
          .from('company_subscriptions')
          .upsert({
            company_id: companyId,
            plan: 'pro',
            status: 'active',
            stripe_subscription_id: stripeSubscriptionId,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'company_id' })

        if (subError) {
          console.error('Failed to upsert company_subscription:', subError)
          // Non-fatal — profile is already updated
        }
      }
    }

    if (
      event.type === 'customer.subscription.deleted' ||
      event.type === 'customer.subscription.paused'
    ) {
      const subscription = event.data.object as Stripe.Subscription
      const stripeSubscriptionId = subscription.id

      console.log(`${event.type}`, { stripeSubscriptionId })

      const { error } = await supabase
        .from('company_subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', stripeSubscriptionId)

      if (error) {
        console.error('Failed to cancel company_subscription:', error)
        return new Response('Failed to cancel subscription', { status: 500 })
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Handler error'
    console.error('Webhook handler error:', msg)
    return new Response(`Handler error: ${msg}`, { status: 500 })
  }

  return new Response(
    JSON.stringify({ received: true }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
