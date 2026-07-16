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
  // Client contact fields are deliberately NOT selected — team members don't get to see them.
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, client_name, description, stage_requirements, stage, deadline, revision_count, revisions_allowed, started_at, created_at, commercial_id, project_type:project_types(name, color, stages), deliverables(*), project_files(*), stakeholders:project_stakeholders(role, editor_id, name), editor_assignments(editor_id, editor_name)')
    .eq('id', id)
    .single()

  if (error || !project) return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 })

  const participantsMap = new Map<string, string>()
  for (const s of project.stakeholders ?? []) {
    if (s.editor_id && s.name) participantsMap.set(s.editor_id, s.name)
  }
  for (const a of project.editor_assignments ?? []) {
    if (a.editor_id && a.editor_name) participantsMap.set(a.editor_id, a.editor_name)
  }
  if (project.commercial_id && !participantsMap.has(project.commercial_id)) {
    const { data: commercial } = await supabase.from('editors').select('id, full_name').eq('id', project.commercial_id).single()
    if (commercial) participantsMap.set(commercial.id, commercial.full_name)
  }
  const participants = Array.from(participantsMap.entries()).map(([pid, name]) => ({ id: pid, name }))

  // Who's taking which role on this project — shown to every team member so they can see
  // who's doing script writing/voice over/filming/editing alongside them, at a glance.
  const team = [
    ...(project.stakeholders ?? [])
      .filter((s) => s.editor_id && s.name)
      .map((s) => ({ role: s.role, name: s.name as string })),
    ...(project.editor_assignments ?? [])
      .filter((a) => a.editor_id && a.editor_name)
      .map((a) => ({ role: 'editor' as const, name: a.editor_name })),
  ]

  // Used for this member's own upload-status gating (can they submit for the current stage?).
  const myDeliverables = (project.deliverables ?? [])
    .filter((d) => d.submitted_by === session.user.id)
    .sort((a, b) => b.version - a.version)

  // Full project history — every stage's submissions, so e.g. an editor can see the script/footage
  // that earlier roles delivered, even after the project has moved on or finished.
  const allDeliverables = (project.deliverables ?? [])
    .filter((d) => d.status !== 'uploading')
    .sort((a, b) => b.version - a.version)

  const { deliverables: _all, stakeholders: _stakeholders, editor_assignments: _assignments, ...rest } = project
  return NextResponse.json({ project: { ...rest, myDeliverables, allDeliverables, participants, team } })
}
