import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

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
