'use client'

import { useEffect, useState, use as usePromise } from 'react'
import { motion } from 'framer-motion'
import { Calendar, PlayCircle, Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { Deliverable, ProjectStage } from '@/lib/types'
import { STAGE_LABELS } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { useResumableUpload } from '@/lib/use-resumable-upload'

interface MemberProjectDetail {
  id: string
  client_name: string
  description: string
  stage_requirements: Record<string, string>
  stage: ProjectStage
  deadline: string | null
  revision_count: number
  revisions_allowed: number
  started_at: string | null
  myDeliverables: Deliverable[]
}

export default function MemberProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params)
  const [project, setProject] = useState<MemberProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const { uploading, progress, error: uploadError, upload } = useResumableUpload()

  const load = () => {
    fetch(`/api/member/projects/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setProject(d.project)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleStart = async () => {
    await fetch(`/api/member/projects/${id}/start`, { method: 'POST' })
    load()
  }

  const handleUpload = async () => {
    if (!file || !project) return
    const ok = await upload({ projectId: id, stage: project.stage, file, notes })
    if (ok) { setFile(null); setNotes(''); load() }
  }

  if (loading) return <div className="flex items-center justify-center py-24 text-navy/35 text-sm">Chargement…</div>
  if (error || !project) return <div className="p-6 text-red-500 text-sm">{error ?? 'Projet introuvable.'}</div>

  const rejectedHistory = project.myDeliverables.filter((d) => d.status === 'rejected')
  const currentStageDeliverable = project.myDeliverables.find((d) => d.stage === project.stage)
  const canUpload = !currentStageDeliverable || currentStageDeliverable.status === 'rejected'

  return (
    <div className="min-h-screen">
      <div className="px-6 py-5 border-b border-white/50 bg-white/20 backdrop-blur-sm">
        <h1 className="text-navy font-bold text-lg">{project.client_name}</h1>
        <p className="text-navy/45 text-xs mt-0.5">{STAGE_LABELS[project.stage]}</p>
      </div>

      <div className="p-6 space-y-6 max-w-2xl">
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              {project.deadline && (
                <span className="flex items-center gap-1.5 text-navy/60"><Calendar size={13} /> {formatDate(project.deadline)}</span>
              )}
              <span className="text-navy/60">Révisions : {project.revision_count}/{project.revisions_allowed}</span>
            </div>
            {!project.started_at && (
              <motion.button
                onClick={handleStart}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand hover:bg-ocean text-white text-xs font-semibold transition-colors shadow-sm shadow-brand/25"
              >
                <PlayCircle size={13} /> Je commence
              </motion.button>
            )}
          </div>

          {project.description && (
            <div>
              <p className="text-navy/50 text-xs font-medium mb-1">Description</p>
              <p className="text-navy/75 text-sm">{project.description}</p>
            </div>
          )}

          {project.stage_requirements?.[project.stage] && (
            <div>
              <p className="text-navy/50 text-xs font-medium mb-1">Attentes pour cette étape</p>
              <p className="text-navy/75 text-sm">{project.stage_requirements[project.stage]}</p>
            </div>
          )}
        </div>

        {/* Upload zone */}
        <section>
          <h2 className="text-navy font-semibold mb-3 flex items-center gap-2"><Upload size={15} /> Livrer un fichier</h2>
          {!canUpload ? (
            <div className="glass-sm rounded-2xl p-4 flex items-center gap-2 text-navy/50 text-sm">
              <CheckCircle2 size={15} className="text-emerald-500" /> Livraison déjà soumise pour cette étape — en attente de validation.
            </div>
          ) : (
            <div className="glass-sm rounded-2xl p-4 space-y-3">
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="resize-none text-xs" placeholder="Note (optionnel) — ex : changements de cette version" />
              {uploading && (
                <div className="h-1.5 rounded-full bg-navy/10 overflow-hidden">
                  <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
              {uploadError && (
                <p className="flex items-center gap-1.5 text-red-500 text-xs"><AlertCircle size={12} /> {uploadError}</p>
              )}
              <motion.button
                onClick={handleUpload}
                disabled={!file || uploading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-2 rounded-xl bg-brand hover:bg-ocean text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-brand/25"
              >
                {uploading ? `Envoi… ${progress}%` : 'Soumettre le livrable'}
              </motion.button>
            </div>
          )}
        </section>

        {/* Rejection history */}
        {rejectedHistory.length > 0 && (
          <section>
            <h2 className="text-navy font-semibold mb-3">Historique des rejets</h2>
            <div className="space-y-2">
              {rejectedHistory.map((d) => (
                <div key={d.id} className="glass-sm rounded-xl p-3 text-sm">
                  <p className="text-navy/50 text-xs">v{d.version} · {formatDate(d.submitted_at)}</p>
                  <p className="text-red-500 font-medium mt-1">{d.rejection_reason}</p>
                  {d.rejection_comment && <p className="text-navy/60 text-xs mt-0.5">{d.rejection_comment}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Version history */}
        {project.myDeliverables.length > 0 && (
          <section>
            <h2 className="text-navy font-semibold mb-3">Mes versions livrées</h2>
            <div className="space-y-2">
              {project.myDeliverables.map((d) => (
                <div key={d.id} className="glass-sm rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                  <span className="text-navy/60">{STAGE_LABELS[d.stage]} · v{d.version} · {formatDate(d.submitted_at)}</span>
                  <span className={
                    d.status === 'validated' ? 'text-emerald-600 font-semibold'
                    : d.status === 'rejected' ? 'text-red-500 font-semibold'
                    : 'text-navy/40'
                  }>
                    {d.status === 'validated' ? 'Validé' : d.status === 'rejected' ? 'Rejeté' : d.status === 'submitted' ? 'En attente' : d.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
