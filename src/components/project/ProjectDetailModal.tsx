'use client'

import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Project, ProjectStage, TeamMemberRole } from '@/lib/types'
import { STAGE_LABELS, DELIVERABLE_STAGES, ROLE_TO_STAKEHOLDER, TEAM_MEMBER_ROLE_LABELS } from '@/lib/types'
import { useApp } from '@/context/AppContext'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import DeliverablePanel from '@/components/deliverables/DeliverablePanel'
import ProjectFilesSection from '@/components/project/ProjectFilesSection'
import { syncAssignments } from '@/lib/sync-assignments'

// Team roles assigned up front, same set offered when the project is created.
// The editor is deliberately excluded — assigned only once the project reaches Editing.
const TEAM_ROLES: TeamMemberRole[] = ['filmmaker', 'script_writer', 'voice_over']

interface Props {
  project: Project
  onClose: () => void
  onSwitchProject?: (id: string) => void
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-navy/50 text-xs mb-1 font-medium">{children}</label>
)

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-bold text-navy/40 uppercase tracking-wider mb-3">{children}</h3>
)

export default function ProjectDetailModal({ project, onClose, onSwitchProject }: Props) {
  const { projects, projectTypes, editors, updateProject, deleteProject, saveStakeholders, updateAssignment } = useApp()
  const orderSiblings = project.order_id ? projects.filter((p) => p.id !== project.id && p.order_id === project.order_id) : []

  const [clientName, setClientName] = useState(project.client_name)
  const [projectTypeId, setProjectTypeId] = useState(project.project_type_id ?? '')
  const [dealPrice, setDealPrice] = useState(project.deal_price?.toString() ?? '')
  const [deadline, setDeadline] = useState(project.deadline?.slice(0, 10) ?? '')
  const [notes, setNotes] = useState(project.notes ?? '')
  const [description, setDescription] = useState(project.description ?? '')
  const [clientPhone, setClientPhone] = useState(project.client_phone ?? '')
  const [clientEmail, setClientEmail] = useState(project.client_email ?? '')
  const [clientCompany, setClientCompany] = useState(project.client_company ?? '')
  const [commercialId, setCommercialId] = useState(project.commercial_id ?? '')
  const [stageRequirements, setStageRequirements] = useState<Record<string, string>>(project.stage_requirements ?? {})
  const [revisionsAllowed, setRevisionsAllowed] = useState((project.revisions_allowed ?? 0).toString())
  const [team, setTeam] = useState<Record<string, string>>({})
  const [mediaFaceName, setMediaFaceName] = useState('')
  const [editorId, setEditorId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // project.commercial_id is a FK into editors, not contacts — must be a team member with the Commercial role.
  const commercials = editors.filter((e) => (e.roles ?? []).includes('commercial'))

  const loadFromProject = (p: Project) => {
    setClientName(p.client_name)
    setProjectTypeId(p.project_type_id ?? '')
    setDealPrice(p.deal_price?.toString() ?? '')
    setDeadline(p.deadline?.slice(0, 10) ?? '')
    setNotes(p.notes ?? '')
    setDescription(p.description ?? '')
    setClientPhone(p.client_phone ?? '')
    setClientEmail(p.client_email ?? '')
    setClientCompany(p.client_company ?? '')
    setCommercialId(p.commercial_id ?? '')
    setStageRequirements(p.stage_requirements ?? {})
    setRevisionsAllowed((p.revisions_allowed ?? 0).toString())
    const nextTeam: Record<string, string> = {}
    TEAM_ROLES.forEach((role) => {
      const stakeholderRole = ROLE_TO_STAKEHOLDER[role]
      const existing = (p.stakeholders ?? []).find((s) => s.role === stakeholderRole)
      if (existing?.editor_id) nextTeam[role] = existing.editor_id
    })
    setTeam(nextTeam)
    setMediaFaceName((p.stakeholders ?? []).find((s) => s.role === 'media_face')?.name ?? '')
    setEditorId((p.editor_assignments ?? [])[0]?.editor_id ?? '')
  }

  const currentAssignment = (project.editor_assignments ?? [])[0]
  const eligibleEditorsForCut = editors.filter((e) => (e.roles ?? []).includes('editeur'))

  useEffect(() => {
    loadFromProject(project)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  const price = parseFloat(dealPrice) || 0

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    const projectUpdateError = await updateProject(project.id, {
      client_name: clientName.trim() || project.client_name,
      project_type_id: projectTypeId || null,
      deal_price: price,
      deadline: deadline || null,
      notes,
      description,
      client_phone: clientPhone,
      client_email: clientEmail,
      client_company: clientCompany,
      commercial_id: commercialId || null,
      stage_requirements: stageRequirements,
      revisions_allowed: parseInt(revisionsAllowed) || 0,
    })
    if (projectUpdateError) {
      setSaving(false)
      setSaveError(`Failed to save project: ${projectUpdateError}`)
      return
    }

    const stakeholdersToSave: Array<{ role: 'filmmaker' | 'scriptwriter' | 'voiceover' | 'media_face'; editor_id: string | null; name: string; cost: number }> = TEAM_ROLES
      .map((role) => {
        const memberId = team[role]
        if (!memberId) return null
        const member = editors.find((e) => e.id === memberId)
        if (!member) return null
        return { role: ROLE_TO_STAKEHOLDER[role]!, editor_id: member.id as string | null, name: member.full_name, cost: 0 }
      })
      .filter((s): s is { role: 'filmmaker' | 'scriptwriter' | 'voiceover'; editor_id: string | null; name: string; cost: number } => s !== null)

    if (mediaFaceName.trim()) {
      stakeholdersToSave.push({ role: 'media_face', editor_id: null, name: mediaFaceName.trim(), cost: 0 })
    }

    const err = await saveStakeholders(project.id, stakeholdersToSave)
    setSaving(false)
    if (err) {
      setSaveError('Failed to save team. Run the SQL migration in Supabase to add the scriptwriter role.')
      return
    }

    const previousMemberIds = new Set((project.stakeholders ?? []).map((s) => s.editor_id).filter(Boolean) as string[])
    const newMemberIds = new Set(stakeholdersToSave.map((s) => s.editor_id).filter(Boolean) as string[])
    const added = [...newMemberIds].filter((id) => !previousMemberIds.has(id))
    const removed = [...previousMemberIds].filter((id) => !newMemberIds.has(id))

    // Reassigning the editor (only possible once one was already assigned via the Editing-stage popup).
    if (currentAssignment && editorId && editorId !== currentAssignment.editor_id) {
      const newEditor = eligibleEditorsForCut.find((e) => e.id === editorId)
      await updateAssignment(currentAssignment.id, { editor_id: editorId, editor_name: newEditor?.full_name ?? '' })
      added.push(editorId)
      if (currentAssignment.editor_id) removed.push(currentAssignment.editor_id)
    }

    syncAssignments(project.id, added, removed)

    onClose()
  }

  const handleDelete = async () => {
    await deleteProject(project.id)
    onClose()
  }

  const selectedType = projectTypes.find((t) => t.id === projectTypeId)

  return (
    <Modal open onClose={onClose} title="Project Details" size="lg">
      <div className="space-y-6">
        {/* General Info */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>General</SectionTitle>
            <span className="text-[10px] font-semibold rounded-full px-2.5 py-1 bg-brand/10 text-brand border border-brand/25">
              {STAGE_LABELS[project.stage]}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>Client Name</Label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>

            <div>
              <Label>Project Type</Label>
              <select value={projectTypeId} onChange={(e) => setProjectTypeId(e.target.value)}>
                <option value="">Select type…</option>
                {projectTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {selectedType && <div className="mt-1.5"><Badge projectType={selectedType} small /></div>}
            </div>

            <div>
              <Label>Deal Price (DA)</Label>
              <input type="number" value={dealPrice} onChange={(e) => setDealPrice(e.target.value)} min="0" />
            </div>

            <div>
              <Label>Deadline</Label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>

            <div>
              <Label>Révisions autorisées</Label>
              <input type="number" value={revisionsAllowed} onChange={(e) => setRevisionsAllowed(e.target.value)} min="0" />
            </div>

            <div>
              <Label>Commercial responsable</Label>
              <select value={commercialId} onChange={(e) => setCommercialId(e.target.value)}>
                <option value="">Aucun</option>
                {commercials.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2">
              <Label>Description générale</Label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="resize-none" />
            </div>

            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="resize-none" />
            </div>
          </div>
        </section>

        {/* Sibling videos from the same client order */}
        {orderSiblings.length > 0 && (
          <section>
            <SectionTitle>Autres vidéos de cette commande ({orderSiblings.length})</SectionTitle>
            <div className="space-y-1.5">
              {orderSiblings.map((sibling) => (
                <button
                  key={sibling.id}
                  onClick={() => onSwitchProject?.(sibling.id)}
                  disabled={!onSwitchProject}
                  className="w-full flex items-center justify-between glass-sm rounded-xl px-3 py-2 text-left hover:bg-white/50 transition-colors disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {sibling.project_type && <Badge projectType={sibling.project_type} small />}
                    <span className="text-navy/70 text-xs truncate">{STAGE_LABELS[sibling.stage]}</span>
                  </div>
                  {sibling.deadline && <span className="text-navy/40 text-[11px] shrink-0">{sibling.deadline.slice(0, 10)}</span>}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Client contact */}
        <section>
          <SectionTitle>Coordonnées client</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Téléphone</Label>
              <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
            </div>
            <div>
              <Label>E-mail</Label>
              <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
            <div>
              <Label>Entreprise / Adresse</Label>
              <input type="text" value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Stage requirements */}
        <section>
          <SectionTitle>Attentes par étape</SectionTitle>
          <div className="space-y-3">
            {DELIVERABLE_STAGES.map((s) => (
              <div key={s}>
                <Label>{STAGE_LABELS[s]}</Label>
                <textarea
                  value={stageRequirements[s] ?? ''}
                  onChange={(e) => setStageRequirements((sr) => ({ ...sr, [s]: e.target.value }))}
                  rows={2}
                  className="resize-none"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Reference files */}
        <ProjectFilesSection project={project} />

        {/* Deliverable validation */}
        <DeliverablePanel project={project} />

        {/* Team — same roles offered at creation. The editor is assigned separately, only when the card reaches Editing. */}
        <section>
          <SectionTitle>Équipe</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TEAM_ROLES.map((role) => {
              const candidates = editors.filter((e) => (e.roles ?? []).includes(role))
              return (
                <div key={role}>
                  <Label>{TEAM_MEMBER_ROLE_LABELS[role]}</Label>
                  <select value={team[role] ?? ''} onChange={(e) => setTeam((t) => ({ ...t, [role]: e.target.value }))}>
                    <option value="">Aucun</option>
                    {candidates.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                  {candidates.length === 0 && (
                    <p className="text-navy/35 text-[11px] mt-1">Aucun membre {TEAM_MEMBER_ROLE_LABELS[role]}.</p>
                  )}
                </div>
              )
            })}
            <div>
              <Label>Visage / Figurant</Label>
              <input
                type="text"
                value={mediaFaceName}
                onChange={(e) => setMediaFaceName(e.target.value)}
                placeholder="Nom du figurant"
              />
            </div>
            {currentAssignment && (
              <div>
                <Label>Éditeur (montage)</Label>
                <select value={editorId} onChange={(e) => setEditorId(e.target.value)}>
                  {eligibleEditorsForCut.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
            )}
          </div>
        </section>

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-red-600 text-xs font-medium">
            {saveError}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {confirmDelete ? (
            <>
              <span className="text-red-500 text-xs mr-auto font-medium">Delete this project?</span>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-2 rounded-xl border border-silver text-navy/50 hover:text-navy text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm transition-colors"
              >
                Confirm Delete
              </button>
            </>
          ) : (
            <>
              <motion.button
                onClick={() => setConfirmDelete(true)}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                className="p-2 rounded-xl text-navy/30 hover:text-red-500 hover:bg-red-50 transition-colors mr-auto"
              >
                <Trash2 size={15} />
              </motion.button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-silver text-navy/55 hover:text-navy hover:bg-white/50 text-sm transition-colors"
              >
                Cancel
              </button>
              <motion.button
                onClick={handleSave}
                disabled={saving}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="px-4 py-2 rounded-xl bg-brand hover:bg-ocean text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-brand/25"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </motion.button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
