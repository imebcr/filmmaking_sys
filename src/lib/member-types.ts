import type { ProjectStage } from '@/lib/types'

export interface MemberProjectListItem {
  id: string
  client_name: string
  description: string
  stage: ProjectStage
  deadline: string | null
  revision_count: number
  revisions_allowed: number
  started_at: string | null
  created_at: string
  updated_at: string
  project_type: { name: string; color: string } | null
  percentComplete: number
  isRejected: boolean
  isPendingReview: boolean
}
