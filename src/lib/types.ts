export type ProjectStage = 'incoming' | 'pre-production' | 'shooting' | 'editing' | 'delivered'
export type EditorSpecialty = 'talking_head' | 'motion' | 'both'
export type StakeholderRole = 'filmmaker' | 'media_face' | 'voiceover' | 'scriptwriter' | 'editor'
export type TeamMemberAccountStatus = 'pending' | 'invited' | 'active' | 'suspended'
export type ContactType = 'FIGURANT' | 'COMMERCIAL'
export type DeliverableStatus = 'uploading' | 'submitted' | 'reviewed' | 'validated' | 'rejected'
export type NotificationDeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed'
export type NotificationChannel = 'email' | 'telegram'
export type TeamMemberRole = 'editeur' | 'filmmaker' | 'script_writer' | 'voice_over' | 'commercial'
export type ContractType = 'staff' | 'freelance'

export const TEAM_MEMBER_ROLES: TeamMemberRole[] = ['editeur', 'filmmaker', 'script_writer', 'voice_over', 'commercial']
export const TEAM_MEMBER_ROLE_LABELS: Record<TeamMemberRole, string> = {
  editeur: 'Éditeur',
  filmmaker: 'Filmmaker',
  script_writer: 'Script Writer',
  voice_over: 'Voice Over',
  commercial: 'Commercial',
}
// Maps a team member role to the stakeholder role it fulfills on a project.
// 'commercial' has no stakeholder row — it maps to project.commercial_id instead, and gets
// scoped admin-console access (see useAdminIdentity) rather than the /me member portal.
export const ROLE_TO_STAKEHOLDER: Partial<Record<TeamMemberRole, StakeholderRole>> = {
  editeur: 'editor',
  filmmaker: 'filmmaker',
  script_writer: 'scriptwriter',
  voice_over: 'voiceover',
}

export interface ProjectType {
  id: string
  name: string
  default_duration_hours: number
  color: string
  default_price: number
  default_revisions: number
  stages: string[]
  created_at: string
}

export interface TeamMember {
  id: string
  full_name: string
  roles: string[]
  email: string | null
  password_hash: string | null
  invitation_token: string | null
  invitation_expires_at: string | null
  password_reset_token: string | null
  password_reset_expires_at: string | null
  account_status: TeamMemberAccountStatus
  telegram_chat_id: string | null
  telegram_linked_at: string | null
  telegram_link_code: string | null
  telegram_link_code_expires_at: string | null
  avatar_url: string | null
  notification_preferences: Record<string, unknown>
  quiet_hours_start: string
  quiet_hours_end: string
  cgu_accepted_at: string | null
  contract_type: ContractType
  level: string
  default_rate: number
  phone: string
  specialty: EditorSpecialty
  contact_info: string
  notes: string
  is_active: boolean
  created_at: string
}

export type Editor = TeamMember

export interface ClientOrder {
  id: string
  client_name: string
  client_phone: string
  client_email: string
  client_company: string
  commercial_id: string | null
  description: string
  created_at: string
}

export interface Project {
  id: string
  client_name: string
  description: string
  stage_requirements: Record<string, string>
  client_phone: string
  client_email: string
  client_company: string
  commercial_id: string | null
  order_id: string | null
  project_type_id: string | null
  deal_price: number
  started_at: string | null
  revision_count: number
  revisions_allowed: number
  deadline: string | null
  stage: ProjectStage
  notes: string
  created_at: string
  updated_at: string
  // Joined relations
  project_type?: ProjectType | null
  stakeholders?: Stakeholder[]
  editor_assignments?: EditorAssignment[]
  deliverables?: Deliverable[]
  project_files?: ProjectFile[]
}

export interface ProjectFile {
  id: string
  project_id: string
  file_name: string
  file_path: string
  size_bytes: number
  mime_type: string
  uploaded_by: string | null
  created_at: string
}

export interface Deliverable {
  id: string
  project_id: string
  stage: ProjectStage
  version: number
  submitted_by: string | null
  file_path: string
  size_bytes: number
  duration_seconds: number | null
  mime_type: string
  thumbnail_path: string | null
  status: DeliverableStatus
  notes: string
  submitted_at: string
  admin_reviewed_at: string | null
  admin_decision_at: string | null
  rejection_reason: string
  rejection_comment: string
  client_share_token: string | null
  client_share_expires_at: string | null
  client_share_access_log: Array<{ at: string; ip: string | null }>
  download_token: string | null
  created_at: string
  updated_at: string
  // Joined
  submitted_by_member?: TeamMember | null
  project?: Project | null
}

export interface Contact {
  id: string
  type: ContactType
  full_name: string
  phone: string
  daily_rate: number
  notes: string
  email: string
  photo_url: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  recipient_id: string | null
  event_type: string
  channels: NotificationChannel[]
  payload: Record<string, unknown>
  sent_at: string
  delivery_status: NotificationDeliveryStatus
  read_at: string | null
  created_at: string
}

export interface Stakeholder {
  id: string
  project_id: string
  role: StakeholderRole
  name: string
  editor_id: string | null
  cost: number
}

export interface EditorAssignment {
  id: string
  editor_id: string | null
  editor_name: string
  project_id: string
  start_date: string
  end_date: string
  created_at: string
  // Joined
  editor?: Editor
  project?: Project
}

export const STAGES: ProjectStage[] = [
  'incoming',
  'pre-production',
  'shooting',
  'editing',
  'delivered',
]

// Stages that produce a deliverable submission/validation cycle (CDC §4.3/§7.5)
export const DELIVERABLE_STAGES: ProjectStage[] = ['pre-production', 'shooting', 'editing']

export const STAGE_LABELS: Record<ProjectStage, string> = {
  incoming: 'Incoming',
  'pre-production': 'Pre-production',
  shooting: 'Shooting',
  editing: 'Editing',
  delivered: 'Delivered',
}

export const STAGE_COLORS: Record<ProjectStage, string> = {
  incoming: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  'pre-production': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  shooting: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  editing: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  delivered: 'text-green-400 bg-green-500/10 border-green-500/20',
}

export const STAKEHOLDER_LABELS: Record<StakeholderRole, string> = {
  filmmaker: 'Filmmaker',
  media_face: 'Media Face',
  voiceover: 'Voice Over',
  scriptwriter: 'Scriptwriter',
  editor: 'Editor',
}

export const SPECIALTY_LABELS: Record<EditorSpecialty, string> = {
  talking_head: 'Talking Head',
  motion: 'Motion Design',
  both: 'Both',
}
