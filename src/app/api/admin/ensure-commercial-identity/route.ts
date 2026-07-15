import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/server-supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'

/**
 * The admin logs in via Supabase Auth and has no row in `editors` — but `commercial_id`
 * on a project is a FK into `editors`, so the admin can't be picked as "Commercial
 * responsable" unless they also exist there. This ensures a matching editors row
 * (linked by email, role 'commercial') exists so the admin shows up in that dropdown
 * like any other commercial — created once, reused after that.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })

  const authClient = createClient(supabaseUrl, anonKey)
  const { data: userData, error: userError } = await authClient.auth.getUser(token)
  if (userError || !userData.user?.email) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  const email = userData.user.email

  const supabase = createServerSupabaseClient()
  const { data: existing } = await supabase.from('editors').select('*').eq('email', email).eq('is_active', true).maybeSingle()

  if (existing) {
    if (!(existing.roles ?? []).includes('commercial')) {
      const { data: updated } = await supabase
        .from('editors')
        .update({ roles: [...(existing.roles ?? []), 'commercial'] })
        .eq('id', existing.id)
        .select()
        .single()
      return NextResponse.json({ editor: updated ?? existing })
    }
    return NextResponse.json({ editor: existing })
  }

  const { data: created, error: createError } = await supabase
    .from('editors')
    .insert({
      full_name: `Admin (${email.split('@')[0]})`,
      email,
      roles: ['commercial'],
      account_status: 'active',
      contract_type: 'staff',
      specialty: 'both',
      is_active: true,
    })
    .select()
    .single()

  if (createError || !created) return NextResponse.json({ error: 'Échec de la création.' }, { status: 500 })
  return NextResponse.json({ editor: created })
}
