'use client'

import { useAuth } from '@/context/AuthContext'
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react'

/**
 * The admin console (/dashboard, /pipeline, /availability, /finance, /settings) has two
 * possible visitors: the admin (Supabase Auth, full access) and a team member with the
 * 'commercial' role (NextAuth session, scoped access — no Finance/Settings). This hook
 * unifies both so layout/nav components don't need to know about two auth systems.
 */
export function useAdminIdentity() {
  const { user, authLoading, signOut: supabaseSignOut } = useAuth()
  const { data: session, status } = useSession()

  const isAdmin = Boolean(user)
  const isCommercial = !isAdmin && status === 'authenticated' && Boolean(session?.user?.roles?.includes('commercial'))
  const loading = authLoading || status === 'loading'
  const authenticated = isAdmin || isCommercial

  const signOut = async () => {
    if (isAdmin) await supabaseSignOut()
    else await nextAuthSignOut({ callbackUrl: '/login' })
  }

  return {
    isAdmin,
    isCommercial,
    authenticated,
    loading,
    signOut,
    displayName: session?.user?.name ?? null,
  }
}
