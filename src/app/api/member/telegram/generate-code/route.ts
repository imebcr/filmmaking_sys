import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { createSixCharacterCode, expiresAt } from '@/lib/member-security'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const code = createSixCharacterCode()
  const codeExpiresAt = expiresAt(10)

  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('editors')
    .update({ telegram_link_code: code, telegram_link_code_expires_at: codeExpiresAt })
    .eq('id', session.user.id)

  if (error) return NextResponse.json({ error: 'Impossible de générer le code.' }, { status: 500 })

  return NextResponse.json({ code, expiresAt: codeExpiresAt })
}
