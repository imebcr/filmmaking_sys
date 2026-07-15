import { NextResponse } from 'next/server'
import { requireAdminOrCommercial } from '@/lib/admin-guard'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { notifyProjectAssigned, notifyProjectReassigned } from '@/lib/notifications'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminOrCommercial(request))) {
    console.warn('[sync-assignments] rejected — no valid admin/commercial session on the request')
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const added: string[] = Array.isArray(body?.added) ? body.added : []
  const removed: string[] = Array.isArray(body?.removed) ? body.removed : []
  console.log(`[sync-assignments] project ${id} — added: [${added.join(', ')}], removed: [${removed.join(', ')}]`)

  if (added.length === 0 && removed.length === 0) {
    console.log('[sync-assignments] nothing to do (no added/removed members)')
    return NextResponse.json({ ok: true })
  }

  const supabase = createServerSupabaseClient()
  const { data: project } = await supabase
    .from('projects')
    .select('client_name, deadline, project_type:project_types(name)')
    .eq('id', id)
    .single()

  if (!project) return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 })
  const typeName = (project.project_type as unknown as { name?: string } | null)?.name ?? '—'

  await Promise.all([
    ...added.map((memberId) => notifyProjectAssigned(memberId, project.client_name, typeName, project.deadline, id)),
    ...removed.map((memberId) => notifyProjectReassigned(memberId, project.client_name, false, id)),
  ])

  return NextResponse.json({ ok: true })
}
