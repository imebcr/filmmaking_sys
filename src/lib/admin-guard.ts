import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { createServerSupabaseClient } from '@/lib/server-supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'

/** Verifies the request carries a valid Supabase Auth session (admin login). */
export async function requireAdmin(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return false

  const supabase = createClient(supabaseUrl, anonKey)
  const { data, error } = await supabase.auth.getUser(token)
  if (error) console.warn('[admin-guard] token rejected:', error.message)
  return !error && Boolean(data.user)
}

/**
 * Admin OR a team member with the 'commercial' role — commercials get scoped
 * admin-console access (Dashboard/Pipeline/Availability) and use a NextAuth
 * session (cookie-based, sent automatically) rather than the Supabase Bearer
 * token adminFetch attaches. Use this instead of requireAdmin on any route a
 * commercial's Pipeline usage can reach (assignment sync, deliverable decisions).
 * Routes gated behind Settings (invites, contacts, etc.) should keep requireAdmin —
 * commercials have no UI path to them anyway.
 */
export async function requireAdminOrCommercial(request: Request): Promise<boolean> {
  if (await requireAdmin(request)) return true
  const session = await getServerSession(authOptions)
  return Boolean(session?.user?.roles?.includes('commercial'))
}

export interface ProfileIdentity {
  editorId: string
  /** Supabase-Auth admin, not a NextAuth-authenticated team member — no editors.password_hash
   * to change here (their password lives in Supabase Auth), so profile UIs should hide that. */
  isPureAdmin: boolean
}

/**
 * Resolves the `editors` row backing whoever's viewing the admin-console profile page —
 * either a NextAuth-authenticated commercial (their own row) or a Supabase-Auth admin
 * (their auto-provisioned row, see /api/admin/ensure-commercial-identity, matched by email).
 */
export async function resolveProfileIdentity(request: Request): Promise<ProfileIdentity | null> {
  // Bearer token (admin) checked first — same reasoning as resolveUploaderIdentity: a
  // browser that's ever logged into a team-member account keeps that NextAuth cookie
  // around, and this admin-console page always sends a Bearer token via adminFetch when
  // one exists, so it should win over a stale cookie rather than the request silently
  // resolving to the wrong (or a since-removed) identity.
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (token) {
    const supabaseAuth = createClient(supabaseUrl, anonKey)
    const { data, error } = await supabaseAuth.auth.getUser(token)
    if (error) {
      console.warn('[resolveProfileIdentity] Bearer token rejected by Supabase:', error.message)
    } else if (!data.user?.email) {
      console.warn('[resolveProfileIdentity] Supabase user has no email on file — cannot match an editors row.')
    } else {
      const supabase = createServerSupabaseClient()
      const { data: editor, error: lookupError } = await supabase.from('editors').select('id').eq('email', data.user.email).eq('is_active', true).maybeSingle()
      if (lookupError) console.error(`[resolveProfileIdentity] editors lookup failed for ${data.user.email}:`, lookupError.message)
      if (editor) return { editorId: editor.id, isPureAdmin: true }
      if (!lookupError) console.warn(`[resolveProfileIdentity] no active editors row found for admin email ${data.user.email} — ensure-commercial-identity should have created one.`)
    }
  }

  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    // The NextAuth JWT embeds the editor id at login time and is never re-checked against
    // the DB — if that account was deleted and recreated since (a fresh row, new id), a
    // browser that never logged back in still carries the old id. Writes against it then
    // silently affect zero rows instead of erroring, e.g. a Telegram link code gets "saved"
    // nowhere and can never be found again. Verify the row still exists so callers get a
    // clean 401 (and know to log back in) instead of a silent no-op.
    const supabase = createServerSupabaseClient()
    const { data: editor } = await supabase.from('editors').select('id').eq('id', session.user.id).maybeSingle()
    if (editor) return { editorId: session.user.id, isPureAdmin: false }
    console.warn(`[resolveProfileIdentity] NextAuth session id ${session.user.id} has no matching editors row — stale session after account delete/recreate?`)
    return null
  }

  return null
}
