'use client'

import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Project, Stakeholder, StakeholderRole, ProjectStage, TeamMemberRole } from '@/lib/types'
import { STAGES, STAGE_LABELS, STAKEHOLDER_LABELS, DELIVERABLE_STAGES, ROLE_TO_STAKEHOLDER, TEAM_MEMBER_ROLES } from '@/lib/types'
import { useApp } from '@/context/AppContext'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import DeliverablePanel from '@/components/deliverables/DeliverablePanel'
import { formatDZD, calcMargin, marginBg } from '@/lib/utils'
import { syncAssignments } from '@/lib/sync-assignments'

// Which team-member role (if any) can fill a given stakeholder role via a linked account
const STAKEHOLDER_TO_MEMBER_ROLE: Partial<Record<StakeholderRole, TeamMemberRole>> = Object.fromEntries(
  TEAM_MEMBER_ROLES
    .filter((r) => ROLE_TO_STAKEHOLDER[r])
    .map((r) => [ROLE_TO_STAKEHOLDER[r] as StakeholderRole, r]),
)

interface Props {
  project: Project
  onClose: () => void
  onSwitchProject?: (id: string) => void
}

type StakeholderDraft = {
  role: StakeholderRole
  name: string
  editor_id: string | null
  cost: string
}

const ROLES: StakeholderRole[] = ['filmmaker', 'media_face', 'voiceover', 'scriptwriter', 'editor']

function defaultDraft(role: StakeholderRole, existing?: Stakeholder): StakeholderDraft {
  return {
    role,
    name: existing?.name ?? '',
    editor_id: existing?.editor_id ?? null,
    cost: existing?.cost?.toString() ?? '',
  }
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-navy/50 text-xs mb-1 font-medium">{children}</label>
)

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-bold text-navy/40 uppercase tracking-wider mb-3">{children}</h3>
)

export default function ProjectDetailModal({ project, onClose, onSwitchProject }: Props) {
  const { projects, projectTypes, editors, updateProject, deleteProject, saveStakeholders } = useApp()
  const orderSiblings = project.order_id ? projects.filter((p) => p.id !== project.id && p.order_id === project.order_id) : []

  const [clientName, setClientName] = useState(project.client_name)
  const [projectTypeId, setProjectTypeId] = useState(project.project_type_id ?? '')
  const [dealPrice, setDealPrice] = useState(project.deal_price?.toString() ?? '')
  const [deadline, setDeadline] = useState(project.deadline?.slice(0, 10) ?? '')
  const [stage, setStage] = useState<ProjectStage>(project.stage)
  const [notes, setNotes] = useState(project.notes ?? '')
  const [description, setDescription] = useState(project.description ?? '')
  const [clientPhone, setClientPhone] = useState(project.client_phone ?? '')
  const [clientEmail, setClientEmail] = useState(project.client_email ?? '')
  const [clientCompany, setClientCompany] = useState(project.client_company ?? '')
  const [commercialId, setCommercialId] = useState(project.commercial_id ?? '')
  const [stageRequirements, setStageRequirements] = useState<Record<string, string>>(project.stage_requirements ?? {})
  const [revisionsAllowed, setRevisionsAllowed] = useState((project.revisions_allowed ?? 0).toString())
  const [drafts, setDrafts] = useState<StakeholderDraft[]>(() =>
    ROLES.map((role) => {
      const existing = (project.stakeholders ?? []).find((s) => s.role === role)
      return defaultDraft(role, existing)
    }),
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // project.commercial_id is a FK into editors, not contacts — must be a team member with the Commercial role.
  const commercials = editors.filter((e) => (e.roles ?? []).includes('commercial'))

  useEffect(() => {
    setClientName(project.client_name)
    setProjectTypeId(project.project_type_id ?? '')
    setDealPrice(project.deal_price?.toString() ?? '')
    setDeadline(project.deadline?.slice(0, 10) ?? '')
    setStage(project.stage)
    setNotes(project.notes ?? '')
    setDescription(project.description ?? '')
    setClientPhone(project.client_phone ?? '')
    setClientEmail(project.client_email ?? '')
    setClientCompany(project.client_company ?? '')
    setCommercialId(project.commercial_id ?? '')
    setStageRequirements(project.stage_requirements ?? {})
    setRevisionsAllowed((project.revisions_allowed ?? 0).toString())
    setDrafts(
      ROLES.map((role) => {
        const existing = (project.stakeholders ?? []).find((s) => s.role === role)
        return defaultDraft(role, existing)
      }),
    )
  }, [project.id])

  const updateDraft = (role: StakeholderRole, field: keyof StakeholderDraft, value: string) => {
    setDrafts((prev) => prev.map((d) => (d.role === role ? { ...d, [field]: value } : d)))
  }

  const price = parseFloat(dealPrice) || 0
  const totalCost = drafts.reduce((sum, d) => sum + (parseFloat(d.cost) || 0), 0)
  const { margin, marginPct } = calcMargin(price, totalCost)

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    const projectUpdateError = await updateProject(project.id, {
      client_name: clientName.trim() || project.client_name,
      project_type_id: projectTypeId || null,
      deal_price: price,
      deadline: deadline || null,
      stage,
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
    const stakeholdersToSave = drafts
      .filter((d) => d.name.trim() || parseFloat(d.cost) > 0)
      .map((d) => ({
        role: d.role,
        name: d.name.trim(),
        editor_id: STAKEHOLDER_TO_MEMBER_ROLE[d.role] ? (d.editor_id || null) : null,
        cost: parseFloat(d.cost) || 0,
      }))
    const err = await saveStakeholders(project.id, stakeholdersToSave)
    setSaving(false)
    if (err) {
      setSaveError('Failed to save stakeholders. Run the SQL migration in Supabase to add the scriptwriter role.')
      return
    }

    const previousMemberIds = new Set((project.stakeholders ?? []).map((s) => s.editor_id).filter(Boolean) as string[])
    const newMemberIds = new Set(stakeholdersToSave.map((s) => s.editor_id).filter(Boolean) as string[])
    const added = [...newMemberIds].filter((id) => !previousMemberIds.has(id))
    const removed = [...previousMemberIds].filter((id) => !newMemberIds.has(id))
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
          <SectionTitle>General</SectionTitle>
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
              <Label>Stage</Label>
              <select value={stage} onChange={(e) => setStage(e.target.value as ProjectStage)}>
                {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
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

        {/* Deliverable validation */}
        <DeliverablePanel project={project} />

        {/* Stakeholders */}
        <section>
          <SectionTitle>Stakeholders</SectionTitle>
          <div className="space-y-3">
            {drafts.map((draft) => (
              <div key={draft.role} className="glass-sm rounded-xl p-3">
                <p className="text-navy font-semibold text-xs mb-2">{STAKEHOLDER_LABELS[draft.role]}</p>
                <div className="grid grid-cols-2 gap-2">
                  {STAKEHOLDER_TO_MEMBER_ROLE[draft.role] ? (
                    <select
                      value={draft.editor_id ?? ''}
                      onChange={(e) => {
                        const editor = editors.find((ed) => ed.id === e.target.value)
                        updateDraft(draft.role, 'editor_id', e.target.value)
                        if (editor) updateDraft(draft.role, 'name', editor.full_name)
                      }}
                      className="text-xs"
                    >
                      <option value="">Sélectionner un membre…</option>
                      {editors
                        .filter((ed) => (ed.roles ?? []).includes(STAKEHOLDER_TO_MEMBER_ROLE[draft.role]!))
                        .map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(e) => updateDraft(draft.role, 'name', e.target.value)}
                      placeholder="Name"
                      className="text-xs"
                    />
                  )}
                  <input
                    type="number"
                    value={draft.cost}
                    onChange={(e) => updateDraft(draft.role, 'cost', e.target.value)}
                    placeholder="Cost (DA)"
                    min="0"
                    className="text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Finance Summary */}
        <section>
          <SectionTitle>Finance</SectionTitle>
          <div className="glass-sm rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-navy/50">Deal Price</span>
              <span className="text-navy font-semibold">{formatDZD(price)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-navy/50">Total Stakeholder Cost</span>
              <span className="text-navy font-semibold">{formatDZD(totalCost)}</span>
            </div>
            <div className="border-t border-white/50 pt-2 flex justify-between text-sm">
              <span className="text-navy/50">Margin</span>
              <span className="text-navy font-bold">{formatDZD(margin)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-navy/50 text-sm">Margin %</span>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${marginBg(marginPct)}`}>
                {Math.round(marginPct)}%
              </span>
            </div>
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
