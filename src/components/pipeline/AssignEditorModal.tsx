'use client'

import { useState, useEffect } from 'react'
import { addHours, format } from 'date-fns'
import { AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Project } from '@/lib/types'
import { useApp } from '@/context/AppContext'
import Modal from '@/components/ui/Modal'
import { syncAssignments } from '@/lib/sync-assignments'

interface Props {
  open: boolean
  project: Project | null
  onClose: () => void
  onConfirm: () => void
}

export default function AssignEditorModal({ open, project, onClose, onConfirm }: Props) {
  const { editors, editorAssignments, projectTypes, updateProject, createAssignment } = useApp()
  const [editorId, setEditorId] = useState('')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [customHours, setCustomHours] = useState(24)
  const [saving, setSaving] = useState(false)

  const projectType = projectTypes.find((t) => t.id === project?.project_type_id)
  const defaultHours = projectType?.default_duration_hours ?? 24
  const eligibleEditors = editors.filter((e) => (e.roles ?? []).includes('editeur'))

  useEffect(() => {
    setCustomHours(defaultHours)
  }, [defaultHours, open])

  if (!project) return null

  const startDt = new Date(startDate + 'T08:00:00')
  const endDt = addHours(startDt, Math.max(customHours, 1))

  const hasConflict = editorId
    ? editorAssignments.some((a) => {
        if (a.editor_id !== editorId) return false
        const aStart = new Date(a.start_date)
        const aEnd = new Date(a.end_date)
        return startDt < aEnd && endDt > aStart
      })
    : false

  const handleConfirm = async () => {
    if (!editorId) return
    setSaving(true)
    try {
      await updateProject(project.id, { stage: 'editing' })
      await createAssignment({
        editor_id: editorId,
        project_id: project.id,
        start_date: startDt.toISOString(),
        end_date: endDt.toISOString(),
      })
      syncAssignments(project.id, [editorId], [])
      onConfirm()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Assign Editor" size="sm">
      <div className="space-y-4">
        <div>
          <p className="text-navy/50 text-xs mb-0.5 font-medium">Project</p>
          <p className="text-navy font-semibold">{project.client_name}</p>
          {projectType && (
            <p className="text-navy/45 text-xs mt-0.5">
              Type: {projectType.name} — default {defaultHours}h
            </p>
          )}
        </div>

        <div>
          <label className="block text-navy/50 text-xs mb-1.5 font-medium">Editor</label>
          <select value={editorId} onChange={(e) => setEditorId(e.target.value)}>
            <option value="">Select an editor…</option>
            {eligibleEditors.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
          {eligibleEditors.length === 0 && (
            <p className="text-navy/35 text-[11px] mt-1">No team members with the Éditeur role yet.</p>
          )}
        </div>

        <div>
          <label className="block text-navy/50 text-xs mb-1.5 font-medium">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div>
          <label className="block text-navy/50 text-xs mb-1.5 font-medium">
            Editing Duration (hours)
            {customHours !== defaultHours && (
              <button
                onClick={() => setCustomHours(defaultHours)}
                className="ml-2 text-brand hover:text-ocean text-[10px] font-semibold"
              >
                reset to default
              </button>
            )}
          </label>
          <input
            type="number"
            value={customHours}
            onChange={(e) => setCustomHours(Math.max(1, parseInt(e.target.value) || 1))}
            min="1"
          />
        </div>

        {/* Schedule summary */}
        <div className="glass-sm rounded-xl p-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-navy/50 font-medium">Start</span>
            <span className="text-navy font-semibold">{format(startDt, 'dd MMM yyyy, HH:mm')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-navy/50 font-medium">End</span>
            <span className="text-navy font-semibold">{format(endDt, 'dd MMM yyyy, HH:mm')}</span>
          </div>
          <div className="flex justify-between border-t border-white/50 pt-1.5">
            <span className="text-navy/50 font-medium">Duration</span>
            <span className="text-navy font-bold">{customHours}h</span>
          </div>
        </div>

        {hasConflict && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-amber-700 text-xs font-medium">
              This editor has an overlapping assignment. You can still proceed.
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-silver text-navy/50 hover:text-navy hover:bg-white/50 text-sm transition-colors"
          >
            Cancel
          </button>
          <motion.button
            onClick={handleConfirm}
            disabled={!editorId || saving}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex-1 py-2 rounded-xl bg-brand hover:bg-ocean text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-brand/25"
          >
            {saving ? 'Assigning…' : 'Assign'}
          </motion.button>
        </div>
      </div>
    </Modal>
  )
}
