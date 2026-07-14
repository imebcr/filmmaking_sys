import type { Project, ProjectStage, TeamMemberRole } from './types'
import { STAGES, DELIVERABLE_STAGES, ROLE_TO_STAKEHOLDER } from './types'

const MOTION_DESIGN_TYPE_NAME = 'Motion Design'

// Which team-member role(s) get assigned when a card moves into a given stage.
export const STAGE_ROLES: Partial<Record<ProjectStage, TeamMemberRole[]>> = {
  'pre-production': ['script_writer', 'voice_over'],
  shooting: ['filmmaker'],
}

export function isMotionDesign(project: Project): boolean {
  return project.project_type?.name === MOTION_DESIGN_TYPE_NAME
}

// Motion Design has no filming step — Pre-production goes straight to Editing.
export function resolveTargetStage(project: Project, requestedStage: ProjectStage): ProjectStage {
  if (requestedStage === 'shooting' && isMotionDesign(project)) return 'editing'
  return requestedStage
}

export function nextStageFor(project: Project): ProjectStage | null {
  const idx = STAGES.indexOf(project.stage)
  if (idx === -1 || idx === STAGES.length - 1) return null
  return resolveTargetStage(project, STAGES[idx + 1])
}

export function prevStageFor(project: Project): ProjectStage | null {
  const idx = STAGES.indexOf(project.stage)
  if (idx <= 0) return null
  const prev = STAGES[idx - 1]
  if (prev === 'shooting' && isMotionDesign(project)) return STAGES[idx - 2] ?? null
  return prev
}

// A project can only advance past a deliverable stage once something has been uploaded for it.
export function hasDeliverableForCurrentStage(project: Project): boolean {
  if (!DELIVERABLE_STAGES.includes(project.stage)) return true
  return (project.deliverables ?? []).some((d) => d.stage === project.stage && d.status !== 'uploading')
}

// Whether every role needed for a target stage was already decided up front (at creation/edit).
export function stageRolesAlreadyAssigned(project: Project, stage: ProjectStage): boolean {
  const roles = STAGE_ROLES[stage]
  if (!roles || roles.length === 0) return true
  return roles.every((role) => {
    const stakeholderRole = ROLE_TO_STAKEHOLDER[role]
    return (project.stakeholders ?? []).some((s) => s.role === stakeholderRole && s.editor_id)
  })
}
