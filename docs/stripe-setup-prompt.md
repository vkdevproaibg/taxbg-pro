# Stripe — промт для реализации (июнь 2026)

> Код edge-функций и UI уже написан. Нужно только выполнить шаги ниже
> после регистрации юр. лица и создания Stripe аккаунта.

## Предварительные шаги (вручную)

1. Создать Stripe аккаунт на stripe.com
2. Создать продукт "TaxBG Pro" с monthly recurring price
3. Добавить в `.env.local` (никогда не коммитить):
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   VITE_STRIPE_PRICE_ID=price_...
   ```
4. Убедиться что `.gitignore` содержит `.env.local` и `.env.production`

## Деплой

```bash
# Edge Functions уже написаны в supabase/functions/
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook

# Secrets (брать из Stripe Dashboard → Developers)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Применить миграцию (stripe_customer_id + индекс)
supabase db push
```

## Webhook в Stripe Dashboard

Stripe Dashboard → Developers → Webhooks → Add endpoint:

- **URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
- **Events:**
  - `checkout.session.completed`
  - `customer.subscription.deleted`
  - `customer.subscription.paused`

## Тестирование (test mode)

1. Ключ в `.env.local` начинается с `pk_test_`
2. Открыть PaywallModal как залогиненный free user
3. Нажать "Оформить Pro подписку" → редирект на Stripe Checkout
4. Тестовая карта: `4242 4242 4242 4242`, любая будущая дата, любой CVC
5. После оплаты → возврат с `?stripe=success`
6. `fetchProfile()` срабатывает → `profile.subscription = 'pro'`
7. Paywall исчезает автоматически
8. Проверить в Supabase Dashboard:
   - `profiles.subscription = 'pro'`
   - `company_subscriptions` — новая строка со stripe данными

## Переключение на live

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_live_...
# В .env.local: VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## Файлы реализации

| Файл | Описание |
|------|----------|
| `supabase/functions/create-checkout/index.ts` | Edge Function: создаёт Checkout Session |
| `supabase/functions/stripe-webhook/index.ts` | Edge Function: обрабатывает события Stripe |
| `src/lib/stripe.ts` | Frontend: вызывает create-checkout, редиректит |
| `src/components/ui/PaywallModal.tsx` | UI: кнопка подписки |
| `src/App.tsx` | Обрабатывает `?stripe=success` возврат |
| `supabase/migrations/20260411000010_stripe_fields.sql` | stripe_customer_id + индекс |
