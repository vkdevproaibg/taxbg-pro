# TaxBG Pro

Tax accounting system for IT entrepreneurs in Bulgaria. React + TypeScript + Vite + Supabase.

## Setup

```bash
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_OPENROUTER_API_KEY` | OpenRouter API key (optional, for AI features) |
| `VITE_LLM_MODEL` | LLM model ID (default: `anthropic/claude-sonnet-4-5`) |
| `VITE_APP_URL` | App URL for OpenRouter referer header |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (optional) |
| `VITE_STRIPE_PRICE_ID` | Stripe price ID (optional) |

## Build

```bash
npm run build    # outputs to dist/
npm run preview  # preview production build locally
```

## Deploy

### Vercel

1. Connect your GitHub repo at [vercel.com](https://vercel.com)
2. Framework preset: **Vite** (auto-detected)
3. Add environment variables in Project Settings > Environment Variables
4. Deploy — `vercel.json` handles SPA routing automatically

### Netlify

1. Connect your GitHub repo at [app.netlify.com](https://app.netlify.com)
2. Build command: `npm run build`, publish directory: `dist` (configured in `netlify.toml`)
3. Add environment variables in Site Settings > Environment Variables
4. Deploy — `netlify.toml` handles SPA redirects automatically

### Notes

- The app works in **demo mode** without Supabase credentials (all data stored in localStorage)
- AI features require an OpenRouter API key configured per-user in Settings
- Supabase migrations are in `supabase/migrations/` — run via Supabase CLI or dashboard
