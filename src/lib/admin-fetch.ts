import { supabase } from '@/lib/supabase'

/** fetch() wrapper that attaches the admin's Supabase access token for protected API routes. */
export async function adminFetch(input: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(input, { ...init, headers })
}
