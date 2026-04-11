// src/lib/supabaseIntegrations.ts
// Supabase persistence for user integrations.
// Sensitive values are obfuscated client-side.
// TODO production: move to Edge Function + pgcrypto encryption.

import { supabase } from './supabase'
import type {
  NapApiConfig,
  EmailConfig,
  PikConfig,
} from '../store/integrationsStore'

// ── Client-side obfuscation ───────────────────────────────────────────────────
// NOT strong encryption — prevents casual localStorage/network inspection only.
// Production: replace with server-side pgcrypto via Edge Function.

function obfuscate(value: string): string {
  if (!value) return ''
  return btoa(value.split('').reverse().join(''))
}

function deobfuscate(value: string): string {
  if (!value) return ''
  try { return atob(value).split('').reverse().join('') }
  catch { return '' }
}

// ── Save ──────────────────────────────────────────────────────────────────────

export async function saveIntegrations(
  profileId: string,
  nap:   NapApiConfig,
  email: EmailConfig,
  pik:   PikConfig
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const row = {
    profile_id: profileId,
    // Non-sensitive config as plain JSONB
    nap_config: {
      enabled:        nap.enabled,
      organizationId: nap.organizationId,
      status:         nap.status,
      lastChecked:    nap.lastChecked,
    },
    email_config: {
      enabled:   email.enabled,
      userEmail: email.userEmail,
      smtpHost:  email.smtpHost,
      smtpPort:  email.smtpPort,
      smtpUser:  email.smtpUser,
      useResend: email.useResend,
      status:    email.status,
    },
    pik_config: {
      enabled: pik.enabled,
      status:  pik.status,
    },
    // Sensitive values obfuscated
    nap_api_key_enc:   obfuscate(nap.apiKey),
    smtp_password_enc: obfuscate(email.smtpPassword),
    resend_key_enc:    obfuscate(email.resendApiKey),
    pik_code_enc:      obfuscate(pik.pikCode),
    updated_at:        new Date().toISOString(),
  }

  const { error } = await supabase
    .from('user_integrations')
    .upsert(row, { onConflict: 'profile_id' })

  return { error: error ? error.message : null }
}

// ── Load ──────────────────────────────────────────────────────────────────────

export async function loadIntegrations(profileId: string): Promise<{
  nap:   Partial<NapApiConfig>
  email: Partial<EmailConfig>
  pik:   Partial<PikConfig>
} | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('profile_id', profileId)
    .single()

  if (error || !data) return null

  return {
    nap: {
      ...(data.nap_config as object || {}),
      apiKey: deobfuscate((data.nap_api_key_enc as string) || ''),
    },
    email: {
      ...(data.email_config as object || {}),
      smtpPassword: deobfuscate((data.smtp_password_enc as string) || ''),
      resendApiKey: deobfuscate((data.resend_key_enc    as string) || ''),
    },
    pik: {
      ...(data.pik_config as object || {}),
      pikCode: deobfuscate((data.pik_code_enc as string) || ''),
    },
  }
}