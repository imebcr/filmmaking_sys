import { createServerSupabaseClient } from '@/lib/server-supabase'

/**
 * A member is "assigned" to a project if they appear as a stakeholder on it
 * (any role — filmmaker/script_writer/voice_over/editor) or hold an
 * editor_assignment (the Editing-stage scheduling mechanism from V1).
 * This is the server-side enforcement of CDC §2 "un membre ne voit que les
 * projets qui lui sont assignés".
 */
export async function getMemberProjectIds(memberId: string): Promise<string[]> {
  const supabase = createServerSupabaseClient()
  const [stakeholderRes, assignmentRes] = await Promise.all([
    supabase.from('project_stakeholders').select('project_id').eq('editor_id', memberId),
    supabase.from('editor_assignments').select('project_id').eq('editor_id', memberId),
  ])

  const ids = new Set<string>()
  ;(stakeholderRes.data ?? []).forEach((r) => ids.add(r.project_id))
  ;(assignmentRes.data ?? []).forEach((r) => ids.add(r.project_id))
  return Array.from(ids)
}

export async function memberHasAccessToProject(memberId: string, projectId: string): Promise<boolean> {
  const ids = await getMemberProjectIds(memberId)
  return ids.includes(projectId)
}

/** The inverse of getMemberProjectIds — every member currently assigned to a project. */
export async function getProjectAssigneeIds(projectId: string): Promise<string[]> {
  const supabase = createServerSupabaseClient()
  const [stakeholderRes, assignmentRes] = await Promise.all([
    supabase.from('project_stakeholders').select('editor_id').eq('project_id', projectId).not('editor_id', 'is', null),
    supabase.from('editor_assignments').select('editor_id').eq('project_id', projectId),
  ])

  const ids = new Set<string>()
  ;(stakeholderRes.data ?? []).forEach((r) => { if (r.editor_id) ids.add(r.editor_id) })
  ;(assignmentRes.data ?? []).forEach((r) => ids.add(r.editor_id))
  return Array.from(ids)
}
