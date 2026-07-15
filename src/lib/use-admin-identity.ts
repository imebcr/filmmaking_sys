'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react'
import { adminFetch } from '@/lib/admin-fetch'

/**
 * The admin console (/dashboard, /pipeline, /availability, /settings) has two
 * possible visitors: the admin (Supabase Auth, full access) and a team member with the
 * 'commercial' role (NextAuth session, scoped access — no Settings). This hook
 * unifies both so layout/nav components don't need to know about two auth systems.
 */
export function useAdminIdentity() {
  const { user, authLoading, signOut: supabaseSignOut } = useAuth()
  const { data: session, status } = useSession()

  const isAdmin = Boolean(user)
  const isCommercial = !isAdmin && status === 'authenticated' && Boolean(session?.user?.roles?.includes('commercial'))
  const loading = authLoading || status === 'loading'
  const authenticated = isAdmin || isCommercial

  // So the admin can be picked as "Commercial responsable" — they have no `editors` row
  // by default (Supabase Auth only), so ensure one exists, once per session.
  const ensured = useRef(false)
  useEffect(() => {
    if (isAdmin && !ensured.current) {
      ensured.current = true
      adminFetch('/api/admin/ensure-commercial-identity', { method: 'POST' }).catch(() => {})
    }
  }, [isAdmin])

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
