import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { requireAdmin } from '@/lib/admin-guard'
import { createServerSupabaseClient } from '@/lib/server-supabase'

export interface UploaderIdentity {
  /** null only for a pure Supabase-Auth admin, who has no row in `editors`. */
  editorId: string | null
  /** Admin or commercial — can upload to any project/stage, not just their own assigned work. */
  privileged: boolean
}

/**
 * Resolves who's making a deliverable-upload request. Team members authenticate via
 * NextAuth (cookie session) and stay scoped to their own assigned project/stage/role.
 * Admin (Supabase Auth Bearer token) and commercials (NextAuth session with the
 * 'commercial' role) are both "privileged" — they can upload on behalf of anyone,
 * to any project, at any stage.
 */
export async function resolveUploaderIdentity(request: Request): Promise<UploaderIdentity | null> {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    const supabase = createServerSupabaseClient()
    const { data: member } = await supabase.from('editors').select('roles').eq('id', session.user.id).single()
    const privileged = (member?.roles ?? []).includes('commercial')
    return { editorId: session.user.id, privileged }
  }
  if (await requireAdmin(request)) {
    return { editorId: null, privileged: true }
  }
  return null
}
