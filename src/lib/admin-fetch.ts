import { supabase } from '@/lib/supabase'

/** fetch() wrapper that attaches the admin's Supabase access token for protected API routes. */
export async function adminFetch(input: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(input, { ...init, headers })

  // getSession() is supposed to auto-refresh an expired access token, but a long-idle tab
  // (browser throttles background timers) can still end up sending a stale one — force one
  // refresh and retry once rather than surfacing "Non autorisé" for what's really just an
  // expired token.
  if (res.status === 401) {
    const { data: refreshed } = await supabase.auth.refreshSession()
    const freshToken = refreshed.session?.access_token
    if (freshToken && freshToken !== token) {
      const retryHeaders = new Headers(init.headers)
      retryHeaders.set('Authorization', `Bearer ${freshToken}`)
      return fetch(input, { ...init, headers: retryHeaders })
    }
  }

  return res
}
