# TaxBG Pro — Production Checklist

## Security
[ ] Move llm_api_key from localStorage to llm_credentials
    table in Supabase (encrypted, server-side only)
[ ] Our platform LLM key — only in Edge Function,
    never exposed to client bundle
[ ] Remove any remaining VITE_ secret variables
[ ] Enable Supabase MFA for admin accounts

## Data & Storage
[ ] Upgrade Supabase to Pro plan before launch
    (Free plan: 500MB DB, 1GB storage, sleeps after 7 days)
[ ] Configure Supabase Storage bucket for documents
[ ] Set up purge notifications (90/30/7 days before retain_until)
[ ] Implement one-click archive export before purge

## Legal
[ ] Publish Privacy Policy with retention periods listed
[ ] Data Safety Form for Google Play
[ ] Sign in with Apple (required for App Store)
[ ] Terms of Service with storage liability disclaimer
[ ] Cookie/GDPR banner

## Billing (июнь 2026 — после регистрации юр. лица)
[ ] Зарегистрировать юр. лицо
[ ] Создать Stripe аккаунт
[ ] Создать продукт TaxBG Pro с monthly price
[ ] Добавить VITE_STRIPE_PUBLISHABLE_KEY + VITE_STRIPE_PRICE_ID в .env.local
[ ] supabase functions deploy create-checkout
[ ] supabase functions deploy stripe-webhook
[ ] supabase secrets set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET
[ ] Зарегистрировать webhook в Stripe Dashboard
[ ] Протестировать тестовой картой 4242 4242 4242 4242
[ ] Переключить на live ключи (pk_live_, sk_live_)
[ ] In-App Purchase (mobile, когда будет готово)

## Mobile
[ ] Capacitor build pipeline on GitHub Actions
[ ] Remove Stripe from mobile bundle
[ ] Add IAP for mobile Pro subscription
