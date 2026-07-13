import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { getMemberProjectIds } from '@/lib/member-access'
import { STAGES } from '@/lib/types'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const projectIds = await getMemberProjectIds(session.user.id)
  if (projectIds.length === 0) return NextResponse.json({ projects: [] })

  const supabase = createServerSupabaseClient()
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, client_name, description, stage, deadline, revision_count, revisions_allowed, started_at, created_at, updated_at, project_type:project_types(name, color), deliverables(id, stage, version, status, submitted_by)')
    .in('id', projectIds)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Impossible de charger les projets.' }, { status: 500 })

  const enriched = (projects ?? []).map((p) => {
    const stageIndex = STAGES.indexOf(p.stage)
    const percentComplete = Math.round((stageIndex / (STAGES.length - 1)) * 100)

    const ownStageDeliverables = (p.deliverables ?? [])
      .filter((d) => d.stage === p.stage && d.submitted_by === session.user.id)
      .sort((a, b) => b.version - a.version)
    const isRejected = ownStageDeliverables[0]?.status === 'rejected'

    const { deliverables: _deliverables, ...rest } = p
    return { ...rest, percentComplete, isRejected }
  })

  enriched.sort((a, b) => {
    if (a.isRejected !== b.isRejected) return a.isRejected ? -1 : 1
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
    if (a.deadline) return -1
    if (b.deadline) return 1
    return a.created_at.localeCompare(b.created_at)
  })

  return NextResponse.json({ projects: enriched })
}
