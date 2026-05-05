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
- Supabase migrations are  in `supabase/migrations/` — run via Supabase CLI or dashboard

## Google OAuth Setup

To enable "Sign in with Google":

### 1. Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create or select a project
3. **APIs & Services → OAuth consent screen** → configure app name, email, scopes (`email`, `profile`, `openid`)
4. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins: `https://your-supabase-project.supabase.co`
   - Authorized redirect URIs:
     - `https://your-supabase-project.supabase.co/auth/v1/callback`
     - `http://localhost:5173` (for local dev)
5. Copy **Client ID** and **Client secret**

### 2. Supabase Dashboard

1. Go to **Authentication → Providers → Google**
2. Toggle **Enable Sign in with Google**
3. Paste **Client ID** and **Client secret** from step above
4. Save

### 3. App redirect URL

The app already sends `redirectTo: window.location.origin + '/auth/callback'`.
Make sure `window.location.origin` (e.g. `https://taxbgpro.com`) is added to:
- Supabase **Authentication → URL Configuration → Redirect URLs**
- Google Cloud Console **Authorized redirect URIs** (indirectly, via the Supabase callback)
