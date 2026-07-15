'use client'

import { AlertTriangle } from 'lucide-react'
import type { Project, ProjectStage } from '@/lib/types'
import { STAGE_LABELS } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import AdminDeliverableUpload from '@/components/deliverables/AdminDeliverableUpload'

interface Props {
  project: Project | null
  currentStage: ProjectStage | null
  onClose: () => void
  onUploaded: () => void
}

export default function StageGateModal({ project, currentStage, onClose, onUploaded }: Props) {
  if (!project || !currentStage) return null

  return (
    <Modal open onClose={onClose} title="Livrable manquant" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-amber-700 text-sm">
            <strong>{project.client_name}</strong> ne peut pas avancer : aucun livrable n’a encore été envoyé
            pour l’étape « {STAGE_LABELS[currentStage]} ».
          </p>
        </div>
        <p className="text-navy/50 text-xs">
          Vous pouvez l’envoyer vous-même ci-dessous — la carte pourra ensuite être déplacée normalement.
        </p>
        <AdminDeliverableUpload
          projectId={project.id}
          stage={currentStage}
          label="Envoyer le livrable maintenant"
          onUploaded={onUploaded}
          autoOpen
        />
        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl border border-silver text-navy/50 hover:text-navy hover:bg-white/50 text-sm transition-colors"
        >
          Fermer
        </button>
      </div>
    </Modal>
  )
}
