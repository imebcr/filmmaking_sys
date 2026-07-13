import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { memberHasAccessToProject } from '@/lib/member-access'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const { id } = await params

  const hasAccess = await memberHasAccessToProject(session.user.id, id)
  if (!hasAccess) return NextResponse.json({ error: 'Projet non assigné.' }, { status: 403 })

  const supabase = createServerSupabaseClient()
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, client_name, description, stage_requirements, stage, deadline, revision_count, revisions_allowed, started_at, created_at, project_type:project_types(name, color, stages), deliverables(*)')
    .eq('id', id)
    .single()

  if (error || !project) return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 })

  // Only the member's own submissions are relevant to them — no cross-member deliverable visibility.
  const myDeliverables = (project.deliverables ?? [])
    .filter((d) => d.submitted_by === session.user.id)
    .sort((a, b) => b.version - a.version)

  const { deliverables: _all, ...rest } = project
  return NextResponse.json({ project: { ...rest, myDeliverables } })
}
