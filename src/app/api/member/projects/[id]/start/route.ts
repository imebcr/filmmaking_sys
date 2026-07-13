import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { memberHasAccessToProject } from '@/lib/member-access'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const { id } = await params

  const hasAccess = await memberHasAccessToProject(session.user.id, id)
  if (!hasAccess) return NextResponse.json({ error: 'Projet non assigné.' }, { status: 403 })

  const supabase = createServerSupabaseClient()
  const { data: project } = await supabase.from('projects').select('started_at').eq('id', id).single()
  if (!project?.started_at) {
    await supabase.from('projects').update({ started_at: new Date().toISOString() }).eq('id', id)
  }

  return NextResponse.json({ ok: true })
}
