'use client'

import { useEffect, useState, use as usePromise } from 'react'
import { motion } from 'framer-motion'
import { Calendar, PlayCircle, Upload, AlertCircle, CheckCircle2, Download, Phone, Mail, Building2, Paperclip } from 'lucide-react'
import type { Deliverable, ProjectStage, ProjectFile } from '@/lib/types'
import { STAGE_LABELS, DELIVERABLE_STAGES } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { useResumableUpload } from '@/lib/use-resumable-upload'
import ProjectChatPanel from '@/components/project/ProjectChatPanel'

interface MemberProjectDetail {
  id: string
  client_name: string
  client_phone: string
  client_email: string
  client_company: string
  description: string
  stage_requirements: Record<string, string>
  stage: ProjectStage
  deadline: string | null
  revision_count: number
  revisions_allowed: number
  started_at: string | null
  myDeliverables: Deliverable[]
  allDeliverables: Deliverable[]
  participants: { id: string; name: string }[]
  project_files: ProjectFile[]
}

export default function MemberProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params)
  const [project, setProject] = useState<MemberProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [notes, setNotes] = useState('')
  const { uploading, progress, currentFileIndex, totalFiles, error: uploadError, uploadMultiple } = useResumableUpload()

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
    if (files.length === 0 || !project) return
    const ok = await uploadMultiple({ projectId: id, stage: project.stage, files, notes })
    if (ok) { setFiles([]); setNotes(''); load() }
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

          {(project.client_phone || project.client_email || project.client_company) && (
            <div>
              <p className="text-navy/50 text-xs font-medium mb-1.5">Client</p>
              <div className="flex flex-wrap gap-3 text-navy/75 text-xs">
                {project.client_phone && <span className="flex items-center gap-1"><Phone size={11} /> {project.client_phone}</span>}
                {project.client_email && <span className="flex items-center gap-1"><Mail size={11} /> {project.client_email}</span>}
                {project.client_company && <span className="flex items-center gap-1"><Building2 size={11} /> {project.client_company}</span>}
              </div>
            </div>
          )}

          {DELIVERABLE_STAGES.some((s) => project.stage_requirements?.[s]) && (
            <div>
              <p className="text-navy/50 text-xs font-medium mb-1.5">Attentes par étape</p>
              <div className="space-y-1.5">
                {DELIVERABLE_STAGES.filter((s) => project.stage_requirements?.[s]).map((s) => (
                  <div key={s} className="text-sm">
                    <span className={`text-xs font-semibold ${s === project.stage ? 'text-brand' : 'text-navy/45'}`}>{STAGE_LABELS[s]}</span>
                    <p className="text-navy/75">{project.stage_requirements[s]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {project.project_files.length > 0 && (
          <section>
            <h2 className="text-navy font-semibold mb-3 flex items-center gap-2"><Paperclip size={15} /> Fichiers du projet</h2>
            <div className="space-y-1.5">
              {project.project_files.map((f) => (
                <a
                  key={f.id}
                  href={`/api/project-files/${f.id}`}
                  className="flex items-center gap-2 glass-sm rounded-xl px-3 py-2 text-xs hover:bg-white/50 transition-colors"
                >
                  <span className="flex-1 min-w-0 truncate text-navy/70">{f.file_name}</span>
                  <Download size={13} className="text-navy/40 shrink-0" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Upload zone */}
        <section>
          <h2 className="text-navy font-semibold mb-3 flex items-center gap-2"><Upload size={15} /> Livrer un ou plusieurs fichiers</h2>
          {!canUpload ? (
            <div className="glass-sm rounded-2xl p-4 flex items-center gap-2 text-navy/50 text-sm">
              <CheckCircle2 size={15} className="text-emerald-500" /> Livraison déjà soumise pour cette étape — en attente de validation.
            </div>
          ) : (
            <div className="glass-sm rounded-2xl p-4 space-y-3">
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                className="text-xs"
              />
              {files.length > 0 && (
                <div className="space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-xs glass-sm rounded-lg px-2.5 py-1.5">
                      <span className="truncate text-navy/70">{f.name}</span>
                      <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="text-navy/40 hover:text-red-500 ml-2">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="resize-none text-xs" placeholder="Note (optionnel) — ex : changements de cette version" />
              {uploading && (
                <div>
                  <div className="h-1.5 rounded-full bg-navy/10 overflow-hidden">
                    <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  {totalFiles > 1 && (
                    <p className="text-navy/40 text-[10px] mt-1">Fichier {currentFileIndex}/{totalFiles}</p>
                  )}
                </div>
              )}
              {uploadError && (
                <p className="flex items-center gap-1.5 text-red-500 text-xs"><AlertCircle size={12} /> {uploadError}</p>
              )}
              <motion.button
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-2 rounded-xl bg-brand hover:bg-ocean text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-brand/25"
              >
                {uploading ? `Envoi… ${progress}%` : files.length > 1 ? `Soumettre ${files.length} livrables` : 'Soumettre le livrable'}
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

        {/* Full project history — every stage, every role, even after this project moved on */}
        {project.allDeliverables.length > 0 && (
          <section>
            <h2 className="text-navy font-semibold mb-3">Livrables du projet</h2>
            <div className="space-y-3">
              {DELIVERABLE_STAGES.filter((s) => project.allDeliverables.some((d) => d.stage === s)).map((s) => (
                <div key={s} className="glass-sm rounded-xl p-3">
                  <p className="text-navy/50 text-xs font-semibold mb-2">{STAGE_LABELS[s]}</p>
                  <div className="space-y-1.5">
                    {project.allDeliverables.filter((d) => d.stage === s).map((d) => (
                      <div key={d.id} className="flex items-center justify-between text-xs">
                        <span className="text-navy/60">v{d.version} · {formatDate(d.submitted_at)}</span>
                        <div className="flex items-center gap-2">
                          <span className={
                            d.status === 'validated' ? 'text-emerald-600 font-semibold'
                            : d.status === 'rejected' ? 'text-red-500 font-semibold'
                            : 'text-navy/40'
                          }>
                            {d.status === 'validated' ? 'Validé' : d.status === 'rejected' ? 'Rejeté' : d.status === 'submitted' ? 'En attente' : d.status}
                          </span>
                          <a href={`/api/deliverables/${d.id}/file?download=1${d.download_token ? `&download_token=${d.download_token}` : ''}`} className="p-1 text-navy/40 hover:text-brand transition-colors" title="Télécharger">
                            <Download size={12} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
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

        <ProjectChatPanel projectId={project.id} participants={project.participants} />
      </div>
    </div>
  )
}
