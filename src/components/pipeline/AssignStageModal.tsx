'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import type { Project, ProjectStage, Stakeholder, StakeholderRole, TeamMemberRole } from '@/lib/types'
import { STAGE_LABELS, STAKEHOLDER_LABELS, ROLE_TO_STAKEHOLDER } from '@/lib/types'
import { useApp } from '@/context/AppContext'
import { syncAssignments } from '@/lib/sync-assignments'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'

interface Props {
  open: boolean
  project: Project | null
  targetStage: ProjectStage | null
  onClose: () => void
  onConfirm: () => void
}

// Which team-member role(s) get assigned when a card moves into a given stage — CDC point: only
// script writers/voice over show for Pre-production, only filmmakers for Shooting (§4/#4 follow-up).
const STAGE_ROLES: Partial<Record<ProjectStage, TeamMemberRole[]>> = {
  'pre-production': ['script_writer', 'voice_over'],
  shooting: ['filmmaker'],
}

export default function AssignStageModal({ open, project, targetStage, onClose, onConfirm }: Props) {
  const { editors, updateProject, saveStakeholders } = useApp()
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [stageDeadline, setStageDeadline] = useState('')
  const [saving, setSaving] = useState(false)

  const relevantRoles = targetStage ? STAGE_ROLES[targetStage] ?? [] : []

  useEffect(() => {
    if (!open || !project) return
    const initial: Record<string, string> = {}
    for (const role of relevantRoles) {
      const stakeholderRole = ROLE_TO_STAKEHOLDER[role]
      const existing = (project.stakeholders ?? []).find((s) => s.role === stakeholderRole)
      if (existing?.editor_id) initial[role] = existing.editor_id
    }
    setSelections(initial)
    setStageDeadline(targetStage ? project.stage_deadlines?.[targetStage] ?? '' : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id])

  if (!project || !targetStage) return null

  // Kept within the project's own final deadline — there's no point promising a phase later
  // than the whole project is due.
  const deadlineExceeded = Boolean(stageDeadline && project.deadline && stageDeadline > project.deadline.slice(0, 10))

  const handleConfirm = async () => {
    if (deadlineExceeded) return
    setSaving(true)

    // Merge: replace/add stakeholder rows for the roles this modal manages, keep every other role untouched.
    const untouchedRoles = new Set(relevantRoles.map((r) => ROLE_TO_STAKEHOLDER[r]))
    const kept = (project.stakeholders ?? []).filter((s) => !untouchedRoles.has(s.role))
    const updated: Omit<Stakeholder, 'id' | 'project_id'>[] = kept.map((s) => ({ role: s.role, name: s.name, editor_id: s.editor_id, cost: s.cost }))

    for (const role of relevantRoles) {
      const memberId = selections[role]
      if (!memberId) continue
      const member = editors.find((e) => e.id === memberId)
      if (!member) continue
      updated.push({ role: ROLE_TO_STAKEHOLDER[role] as StakeholderRole, name: member.full_name, editor_id: member.id, cost: 0 })
    }

    await updateProject(project.id, {
      stage: targetStage,
      stage_deadlines: { ...(project.stage_deadlines ?? {}), [targetStage]: stageDeadline || '' },
    })
    await saveStakeholders(project.id, updated)

    const previousMemberIds = new Set(relevantRoles.map((r) => (project.stakeholders ?? []).find((s) => s.role === ROLE_TO_STAKEHOLDER[r])?.editor_id).filter(Boolean) as string[])
    const newMemberIds = new Set(Object.values(selections).filter(Boolean))
    const added = [...newMemberIds].filter((id) => !previousMemberIds.has(id))
    const removed = [...previousMemberIds].filter((id) => !newMemberIds.has(id))
    syncAssignments(project.id, added, removed)

    setSaving(false)
    onConfirm()
    onClose()
  }

  const hasAnySelection = relevantRoles.some((r) => selections[r])

  return (
    <Modal open={open} onClose={onClose} title={`Assigner — ${STAGE_LABELS[targetStage]}`} size="sm">
      <div className="space-y-4">
        <div>
          <p className="text-navy/50 text-xs mb-0.5 font-medium">Projet</p>
          <p className="text-navy font-semibold">{project.client_name}</p>
        </div>

        {relevantRoles.map((role) => {
          const stakeholderRole = ROLE_TO_STAKEHOLDER[role]
          if (!stakeholderRole) return null
          const candidates = editors.filter((e) => (e.roles ?? []).includes(role))
          return (
            <div key={role}>
              <label className="block text-navy/50 text-xs mb-1.5 font-medium">{STAKEHOLDER_LABELS[stakeholderRole]}</label>
              <Select
                value={selections[role] ?? ''}
                onChange={(v) => setSelections((s) => ({ ...s, [role]: v }))}
              >
                <option value="">Aucun</option>
                {candidates.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </Select>
              {candidates.length === 0 && (
                <p className="text-navy/35 text-[11px] mt-1">Aucun membre avec ce rôle pour l’instant.</p>
              )}
            </div>
          )
        })}

        <div>
          <label className="block text-navy/50 text-xs mb-1.5 font-medium">Échéance de cette étape (optionnel)</label>
          <DatePicker value={stageDeadline} onChange={setStageDeadline} />
          {project.deadline && (
            <p className="text-navy/35 text-[11px] mt-1">Doit rester au plus tard le {project.deadline.slice(0, 10)} (échéance finale du projet).</p>
          )}
          {deadlineExceeded && (
            <p className="flex items-center gap-1.5 text-red-500 text-[11px] mt-1 font-medium">
              <AlertTriangle size={11} /> Cette date dépasse l’échéance finale du projet.
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-silver text-navy/50 hover:text-navy hover:bg-white/50 text-sm transition-colors"
          >
            Annuler
          </button>
          <motion.button
            onClick={handleConfirm}
            disabled={!hasAnySelection || saving || deadlineExceeded}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex-1 py-2 rounded-xl bg-brand hover:bg-ocean text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-brand/25"
          >
            {saving ? 'Assignation…' : 'Assigner'}
          </motion.button>
        </div>
      </div>
    </Modal>
  )
}
