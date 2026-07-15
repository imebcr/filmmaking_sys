'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import type {
  Project,
  Editor,
  ProjectType,
  EditorAssignment,
  Stakeholder,
  Contact,
  StakeholderRole,
} from '@/lib/types'

export interface BatchVideoInput {
  project_type_id: string | null
  deadline: string | null
  deal_price: number
}

export interface ProjectBatchInput {
  clientName: string
  clientPhone: string
  clientEmail: string
  clientCompany: string
  commercialId: string | null
  description: string
  stageRequirements: Record<string, string>
  revisionsAllowed: number
  videos: BatchVideoInput[]
  sharedStakeholders: Array<{ role: StakeholderRole; editor_id: string | null; name: string }>
}

interface AppContextType {
  projects: Project[]
  editors: Editor[]
  inactiveEditors: Editor[]
  projectTypes: ProjectType[]
  editorAssignments: EditorAssignment[]
  contacts: Contact[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>

  createProject: (data: Partial<Project>) => Promise<Project | null>
  createProjectBatch: (input: ProjectBatchInput) => Promise<Project[] | null>
  updateProject: (id: string, data: Partial<Project>) => Promise<string | null>
  deleteProject: (id: string) => Promise<void>
  duplicateProject: (id: string) => Promise<void>

  createEditor: (data: Partial<Editor>) => Promise<{ editor: Editor | null; error: string | null }>
  updateEditor: (id: string, data: Partial<Editor>) => Promise<string | null>
  deleteEditor: (id: string) => Promise<string | null>
  setEditorActive: (id: string, active: boolean) => Promise<string | null>

  createProjectType: (data: Partial<ProjectType>) => Promise<ProjectType | null>
  updateProjectType: (id: string, data: Partial<ProjectType>) => Promise<void>
  deleteProjectType: (id: string) => Promise<void>

  saveStakeholders: (projectId: string, stakeholders: Omit<Stakeholder, 'id' | 'project_id'>[]) => Promise<string | null>

  createAssignment: (data: Omit<EditorAssignment, 'id' | 'created_at' | 'editor' | 'project'>) => Promise<EditorAssignment | null>
  updateAssignment: (id: string, data: Partial<EditorAssignment>) => Promise<void>
  deleteAssignment: (id: string) => Promise<void>

  createContact: (data: Partial<Contact>) => Promise<Contact | null>
  updateContact: (id: string, data: Partial<Contact>) => Promise<void>
  deleteContact: (id: string) => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [editors, setEditors] = useState<Editor[]>([])
  const [inactiveEditors, setInactiveEditors] = useState<Editor[]>([])
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])
  const [editorAssignments, setEditorAssignments] = useState<EditorAssignment[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      const [projectsRes, editorsRes, inactiveEditorsRes, typesRes, assignmentsRes, contactsRes] = await Promise.all([
        supabase
          .from('projects')
          .select('*, project_type:project_types(*), stakeholders:project_stakeholders(*), editor_assignments(*, editor:editors(*)), deliverables(*, submitted_by_member:editors(*)), project_files(*)')
          .order('created_at', { ascending: false }),
        supabase.from('editors').select('*').eq('is_active', true).order('full_name'),
        supabase.from('editors').select('*').eq('is_active', false).order('full_name'),
        supabase.from('project_types').select('*').order('name'),
        supabase
          .from('editor_assignments')
          .select('*, editor:editors(*), project:projects(*, project_type:project_types(*))')
          .order('start_date'),
        supabase.from('contacts').select('*').order('full_name'),
      ])

      if (projectsRes.error) throw projectsRes.error
      if (editorsRes.error) throw editorsRes.error
      if (inactiveEditorsRes.error) throw inactiveEditorsRes.error
      if (typesRes.error) throw typesRes.error
      if (assignmentsRes.error) throw assignmentsRes.error
      if (contactsRes.error) throw contactsRes.error

      setProjects((projectsRes.data as Project[]) ?? [])
      setEditors((editorsRes.data as Editor[]) ?? [])
      setInactiveEditors((inactiveEditorsRes.data as Editor[]) ?? [])
      setProjectTypes((typesRes.data as ProjectType[]) ?? [])
      setEditorAssignments((assignmentsRes.data as EditorAssignment[]) ?? [])
      setContacts((contactsRes.data as Contact[]) ?? [])
      setError(null)
    } catch (err) {
      console.error(err)
      const detail = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : String(err)
      setError(`Failed to load data: ${detail}`)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    refetch().finally(() => setLoading(false))
  }, [refetch])

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'editors' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_types' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_stakeholders' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'editor_assignments' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliverables' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_files' }, () => refetch())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [refetch])

  // ── Project mutations ────────────────────────────────────────
  const createProject = async (data: Partial<Project>): Promise<Project | null> => {
    const { data: row, error } = await supabase
      .from('projects')
      .insert({ client_name: 'New Project', stage: 'incoming', ...data })
      .select()
      .single()
    if (error) { console.error(error); return null }
    await refetch()
    return row as Project
  }

  // Creates one client_orders row + N project rows (one per requested video), all sharing
  // the same client contact info, commercial, and initial team assignment.
  const createProjectBatch = async (input: ProjectBatchInput): Promise<Project[] | null> => {
    const { data: order, error: orderError } = await supabase
      .from('client_orders')
      .insert({
        client_name: input.clientName,
        client_phone: input.clientPhone,
        client_email: input.clientEmail,
        client_company: input.clientCompany,
        commercial_id: input.commercialId,
        description: input.description,
      })
      .select()
      .single()
    if (orderError || !order) { console.error(orderError); return null }

    const projectRows = input.videos.map((v) => ({
      client_name: input.clientName,
      description: input.description,
      stage_requirements: input.stageRequirements,
      client_phone: input.clientPhone,
      client_email: input.clientEmail,
      client_company: input.clientCompany,
      commercial_id: input.commercialId,
      order_id: order.id,
      project_type_id: v.project_type_id,
      deal_price: v.deal_price,
      deadline: v.deadline,
      revisions_allowed: input.revisionsAllowed,
      stage: 'incoming',
    }))
    const { data: createdProjects, error: projectsError } = await supabase
      .from('projects')
      .insert(projectRows)
      .select()
    if (projectsError || !createdProjects) { console.error(projectsError); return null }

    if (input.sharedStakeholders.length > 0) {
      const stakeholderRows = createdProjects.flatMap((p) =>
        input.sharedStakeholders.map((s) => ({ project_id: p.id, role: s.role, name: s.name, editor_id: s.editor_id, cost: 0 })),
      )
      const { error: stakeholderError } = await supabase.from('project_stakeholders').insert(stakeholderRows)
      if (stakeholderError) console.error(stakeholderError)
    }

    await refetch()
    return createdProjects as Project[]
  }

  const updateProject = async (id: string, data: Partial<Project>): Promise<string | null> => {
    const { error } = await supabase.from('projects').update(data).eq('id', id)
    if (error) console.error(error)

    // When delivered, free up any assignments that haven't ended yet
    if (data.stage === 'delivered') {
      const now = new Date().toISOString()
      await supabase
        .from('editor_assignments')
        .update({ end_date: now })
        .eq('project_id', id)
        .gt('end_date', now)
    }

    await refetch()
    return error?.message ?? null
  }

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) console.error(error)
    await refetch()
  }

  const duplicateProject = async (id: string) => {
    const original = projects.find((p) => p.id === id)
    if (!original) return
    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        client_name: original.client_name + ' (copy)',
        project_type_id: original.project_type_id,
        deal_price: original.deal_price,
        deadline: original.deadline,
        stage: original.stage,
        notes: original.notes,
      })
      .select()
      .single()
    if (error || !newProject) { console.error(error); return }
    const stakeholders = original.stakeholders ?? []
    if (stakeholders.length > 0) {
      await supabase.from('project_stakeholders').insert(
        stakeholders.map((s) => ({
          project_id: newProject.id,
          role: s.role,
          name: s.name,
          editor_id: s.editor_id,
          cost: s.cost,
        })),
      )
    }
    await refetch()
  }

  // ── Editor mutations ─────────────────────────────────────────
  const createEditor = async (data: Partial<Editor>): Promise<{ editor: Editor | null; error: string | null }> => {
    const { data: row, error } = await supabase
      .from('editors')
      .insert({ full_name: 'New Editor', specialty: 'both', ...data })
      .select()
      .single()
    if (error) { console.error(error); return { editor: null, error: error.message } }
    await refetch()
    return { editor: row as Editor, error: null }
  }

  const updateEditor = async (id: string, data: Partial<Editor>): Promise<string | null> => {
    const { error } = await supabase.from('editors').update(data).eq('id', id)
    if (error) { console.error(error); return error.message }
    await refetch()
    return null
  }

  // Permanent — the editor row is actually gone. project_stakeholders.name and
  // editor_assignments.editor_name are stored separately so past project history stays readable.
  const deleteEditor = async (id: string): Promise<string | null> => {
    const { error } = await supabase.from('editors').delete().eq('id', id)
    if (error) { console.error(error); return error.message }
    await refetch()
    return null
  }

  const setEditorActive = async (id: string, active: boolean): Promise<string | null> => {
    const { error } = await supabase.from('editors').update({ is_active: active }).eq('id', id)
    if (error) { console.error(error); return error.message }
    await refetch()
    return null
  }

  // ── Project type mutations ───────────────────────────────────
  const createProjectType = async (data: Partial<ProjectType>): Promise<ProjectType | null> => {
    const { data: row, error } = await supabase
      .from('project_types')
      .insert({ name: 'New Type', default_duration_hours: 24, color: '#3B82F6', ...data })
      .select()
      .single()
    if (error) { console.error(error); return null }
    await refetch()
    return row as ProjectType
  }

  const updateProjectType = async (id: string, data: Partial<ProjectType>) => {
    const { error } = await supabase.from('project_types').update(data).eq('id', id)
    if (error) console.error(error)
    await refetch()
  }

  const deleteProjectType = async (id: string) => {
    const { error } = await supabase.from('project_types').delete().eq('id', id)
    if (error) console.error(error)
    await refetch()
  }

  // ── Stakeholder mutations ────────────────────────────────────
  const saveStakeholders = async (
    projectId: string,
    newStakeholders: Omit<Stakeholder, 'id' | 'project_id'>[],
  ): Promise<string | null> => {
    const toInsert = newStakeholders
      .filter((s) => s.name.trim() !== '' || s.cost > 0)
      .map((s) => ({ ...s, project_id: projectId }))

    // 1. Snapshot existing IDs before touching anything
    const { data: existing } = await supabase
      .from('project_stakeholders')
      .select('id')
      .eq('project_id', projectId)
    const oldIds = (existing ?? []).map((r) => r.id)

    // 2. Insert new rows — if this fails, old data is still intact
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('project_stakeholders')
        .insert(toInsert)
      if (insertError) {
        console.error('Stakeholder insert failed:', insertError)
        return insertError.message
      }
    }

    // 3. Delete old rows by ID — only runs after insert confirmed OK
    if (oldIds.length > 0) {
      await supabase.from('project_stakeholders').delete().in('id', oldIds)
    }

    await refetch()
    return null
  }

  // ── Assignment mutations ─────────────────────────────────────
  const createAssignment = async (
    data: Omit<EditorAssignment, 'id' | 'created_at' | 'editor' | 'project'>,
  ): Promise<EditorAssignment | null> => {
    const { data: row, error } = await supabase
      .from('editor_assignments')
      .insert(data)
      .select()
      .single()
    if (error) { console.error(error); return null }
    await refetch()
    return row as EditorAssignment
  }

  const updateAssignment = async (id: string, data: Partial<EditorAssignment>) => {
    const { error } = await supabase.from('editor_assignments').update(data).eq('id', id)
    if (error) console.error(error)
    await refetch()
  }

  const deleteAssignment = async (id: string) => {
    const { error } = await supabase.from('editor_assignments').delete().eq('id', id)
    if (error) console.error(error)
    await refetch()
  }

  // ── Contact mutations ────────────────────────────────────────
  const createContact = async (data: Partial<Contact>): Promise<Contact | null> => {
    const { data: row, error } = await supabase
      .from('contacts')
      .insert({ type: 'FIGURANT', full_name: 'New Contact', ...data })
      .select()
      .single()
    if (error) { console.error(error); return null }
    await refetch()
    return row as Contact
  }

  const updateContact = async (id: string, data: Partial<Contact>) => {
    const { error } = await supabase.from('contacts').update(data).eq('id', id)
    if (error) console.error(error)
    await refetch()
  }

  const deleteContact = async (id: string) => {
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) console.error(error)
    await refetch()
  }

  return (
    <AppContext.Provider
      value={{
        projects, editors, inactiveEditors, projectTypes, editorAssignments, contacts,
        loading, error, refetch,
        createProject, createProjectBatch, updateProject, deleteProject, duplicateProject,
        createEditor, updateEditor, deleteEditor, setEditorActive,
        createProjectType, updateProjectType, deleteProjectType,
        saveStakeholders,
        createAssignment, updateAssignment, deleteAssignment,
        createContact, updateContact, deleteContact,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
