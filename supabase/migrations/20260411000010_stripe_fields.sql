-- ═══════════════════════════════════════════════════════════
-- TaxBG Pro — Step 10: Stripe subscription fields
-- Migration: 20260411000010_stripe_fields
-- ═══════════════════════════════════════════════════════════

-- Add stripe_customer_id to company_subscriptions
-- (stripe_subscription_id already exists from initial schema)
alter table company_subscriptions
  add column if not exists stripe_customer_id text;

-- Index for webhook lookups by stripe_subscription_id
create index if not exists idx_company_subs_stripe
  on company_subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

comment on column company_subscriptions.stripe_customer_id is
  'Stripe Customer ID (cus_...). Set when subscription is created.';

comment on column company_subscriptions.stripe_subscription_id is
  'Stripe Subscription ID (sub_...). Set by webhook on checkout.session.completed.';
