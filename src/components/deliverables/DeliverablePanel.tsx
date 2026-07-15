'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Eye, FileText, Music, Video, Image as ImageIcon, Link2, Copy, Ban, AlertTriangle, Download } from 'lucide-react'
import type { Project, Deliverable, ProjectStage } from '@/lib/types'
import { DELIVERABLE_STAGES, STAGE_LABELS } from '@/lib/types'
import { adminFetch } from '@/lib/admin-fetch'
import { formatDate } from '@/lib/utils'

const REJECTION_REASONS = ['Qualité technique', 'Non conforme au brief', 'Fichier corrompu', 'Autre']

function fileIcon(mime: string) {
  if (mime.startsWith('video/')) return Video
  if (mime.startsWith('audio/')) return Music
  if (mime.startsWith('image/')) return ImageIcon
  return FileText
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 o'
  const units = ['o', 'Ko', 'Mo', 'Go']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function downloadHref(deliverableId: string): string {
  return `/api/deliverables/${deliverableId}/file?download=1`
}

// navigator.clipboard is only available in secure contexts (HTTPS or localhost) — this
// server runs over plain HTTP, so it falls back to the legacy execCommand approach.
async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through to legacy method
    }
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

function CopyDownloadLink({ deliverableId }: { deliverableId: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    const url = `${window.location.origin}${downloadHref(deliverableId)}`
    const ok = await copyToClipboard(url)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }
  return (
    <div className="flex items-center gap-1 shrink-0">
      <a
        href={downloadHref(deliverableId)}
        className="p-1.5 rounded-lg text-navy/40 hover:text-brand hover:bg-brand/10 transition-colors"
        title="Télécharger"
      >
        <Download size={13} />
      </a>
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-lg text-navy/40 hover:text-brand hover:bg-brand/10 transition-colors"
        title="Copier le lien de téléchargement"
      >
        <Copy size={13} />
      </button>
      {copied && <span className="text-[10px] text-emerald-600 font-medium">Copié !</span>}
    </div>
  )
}

function statusBadge(status: Deliverable['status']) {
  const label = status === 'submitted' ? 'À valider' : status === 'validated' ? 'Validé' : status === 'rejected' ? 'Rejeté' : status
  const cls = status === 'submitted' ? 'bg-amber-50 text-amber-600 border-amber-200'
    : status === 'validated' ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
    : status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200'
    : 'bg-gray-100 text-gray-500 border-gray-200'
  return <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border shrink-0 ${cls}`}>{label}</span>
}

// Read-only history block for a stage the project has already moved past (or hasn't reached yet
// as the active stage) — download links stay available even after the project is fully delivered.
function PastStageBlock({ stage, deliverables }: { stage: ProjectStage; deliverables: Deliverable[] }) {
  const sorted = [...deliverables].sort((a, b) => b.version - a.version)
  return (
    <div className="glass-sm rounded-xl p-3">
      <p className="text-navy/50 text-xs font-semibold mb-2">{STAGE_LABELS[stage]}</p>
      <div className="space-y-1.5">
        {sorted.map((d) => {
          const Icon = fileIcon(d.mime_type)
          return (
            <div key={d.id} className="flex items-center gap-2 text-xs">
              <Icon size={13} className="text-navy/35 shrink-0" />
              <span className="text-navy/60 flex-1 min-w-0 truncate">
                v{d.version} · {formatBytes(d.size_bytes)} · {formatDate(d.submitted_at)}
              </span>
              {statusBadge(d.status)}
              <CopyDownloadLink deliverableId={d.id} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DeliverablePanel({ project }: { project: Project }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState(REJECTION_REASONS[0])
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeStage = DELIVERABLE_STAGES.includes(project.stage) ? project.stage : null
  const byStage = (stage: ProjectStage) => (project.deliverables ?? []).filter((d) => d.stage === stage)
  const otherStages = DELIVERABLE_STAGES.filter((s) => s !== activeStage && byStage(s).length > 0)

  const stageDeliverables = activeStage ? byStage(activeStage).sort((a, b) => b.version - a.version) : []
  const current = stageDeliverables[0]
  const history = stageDeliverables.slice(1)

  const nearLimit = project.revisions_allowed > 0 && project.revision_count >= project.revisions_allowed

  const handleDecision = async (decision: 'validate' | 'reject') => {
    if (!current) return
    setBusy(true)
    setError(null)
    const res = await adminFetch(`/api/admin/deliverables/${current.id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision,
        rejection_reason: decision === 'reject' ? reason : undefined,
        rejection_comment: decision === 'reject' ? comment : undefined,
      }),
    })
    const result = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(result?.error ?? 'Échec de la décision.'); return }
    setRejecting(false)
    setComment('')
  }

  const handleShare = async () => {
    if (!current) return
    setBusy(true)
    const res = await adminFetch(`/api/admin/deliverables/${current.id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: 30 }),
    })
    const result = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.ok) setShareUrl(result.url)
  }

  const handleRevoke = async () => {
    if (!current) return
    setBusy(true)
    await adminFetch(`/api/admin/deliverables/${current.id}/share`, { method: 'DELETE' })
    setBusy(false)
    setShareUrl(null)
  }

  if (!activeStage && otherStages.length === 0) return null

  const Icon = current ? fileIcon(current.mime_type) : FileText

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-bold text-navy/40 uppercase tracking-wider">Livrables</h3>

      {activeStage && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-navy/50 text-xs font-semibold">{STAGE_LABELS[activeStage]} (étape en cours)</p>
            {nearLimit && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-red-500">
                <AlertTriangle size={11} /> Limite de révisions atteinte ({project.revision_count}/{project.revisions_allowed})
              </span>
            )}
          </div>

          {!current ? (
            <p className="text-navy/40 text-sm glass-sm rounded-xl p-4">Aucune soumission pour cette étape pour le moment.</p>
          ) : (
            <div className="glass-sm rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-navy font-semibold text-sm">Version {current.version}</p>
                  <p className="text-navy/45 text-xs mt-0.5">
                    {formatBytes(current.size_bytes)} · {current.mime_type}
                    {current.duration_seconds ? ` · ${Math.round(current.duration_seconds)}s` : ''} · {formatDate(current.submitted_at)}
                  </p>
                  {current.notes && <p className="text-navy/55 text-xs mt-1.5 italic">« {current.notes} »</p>}
                </div>
                {statusBadge(current.status)}
              </div>

              <div className="flex items-center justify-end">
                <CopyDownloadLink deliverableId={current.id} />
              </div>

              {/* Preview */}
              {current.mime_type.startsWith('video/') && (
                <video controls className="w-full rounded-lg max-h-64 bg-black" src={`/api/deliverables/${current.id}/file`} poster={current.thumbnail_path ? `/api/deliverables/${current.id}/file?variant=thumbnail` : undefined} />
              )}
              {current.mime_type.startsWith('audio/') && (
                <audio controls className="w-full" src={`/api/deliverables/${current.id}/file`} />
              )}
              {current.mime_type.startsWith('image/') && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/deliverables/${current.id}/file`} alt="Aperçu" className="w-full rounded-lg max-h-64 object-contain bg-navy/5" />
              )}
              {!current.mime_type.startsWith('video/') && !current.mime_type.startsWith('audio/') && !current.mime_type.startsWith('image/') && (
                <a href={`/api/deliverables/${current.id}/file`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-brand text-xs font-semibold hover:text-ocean">
                  <Eye size={13} /> Ouvrir le fichier
                </a>
              )}

              {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

              {current.status === 'submitted' && (
                <>
                  {rejecting ? (
                    <div className="space-y-2 pt-1">
                      <select value={reason} onChange={(e) => setReason(e.target.value)} className="text-xs">
                        {REJECTION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="resize-none text-xs" placeholder="Commentaire (optionnel)" />
                      <div className="flex gap-2">
                        <button onClick={() => setRejecting(false)} className="flex-1 py-1.5 rounded-xl border border-silver text-navy/50 hover:text-navy text-xs transition-colors">Annuler</button>
                        <button onClick={() => handleDecision('reject')} disabled={busy} className="flex-1 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors disabled:opacity-50">
                          Confirmer le rejet
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setRejecting(true)} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-50">
                        <X size={13} /> Rejeter
                      </button>
                      <motion.button
                        onClick={() => handleDecision('validate')} disabled={busy}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand hover:bg-ocean text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-brand/25"
                      >
                        <Check size={13} /> Valider
                      </motion.button>
                    </div>
                  )}
                </>
              )}

              {current.status === 'validated' && (
                <div className="pt-1">
                  {current.client_share_token && !shareUrl ? (
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-xs text-navy/50 truncate">Lien client actif{current.client_share_expires_at ? ` · expire ${formatDate(current.client_share_expires_at)}` : ''}</span>
                      <button onClick={handleRevoke} disabled={busy} className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 font-semibold disabled:opacity-50">
                        <Ban size={11} /> Révoquer
                      </button>
                    </div>
                  ) : shareUrl ? (
                    <div className="flex items-center gap-2">
                      <input readOnly value={shareUrl} className="text-xs flex-1" />
                      <button onClick={() => copyToClipboard(shareUrl)} className="p-2 rounded-xl text-navy/40 hover:text-brand hover:bg-brand/10 transition-colors">
                        <Copy size={13} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleShare} disabled={busy} className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-ocean disabled:opacity-50">
                      <Link2 size={13} /> Générer lien client
                    </button>
                  )}
                </div>
              )}

              {current.status === 'rejected' && (
                <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  <strong>{current.rejection_reason}</strong>{current.rejection_comment ? ` — ${current.rejection_comment}` : ''}
                </div>
              )}
            </div>
          )}

          {history.length > 0 && (
            <details className="mt-2">
              <summary className="text-navy/40 text-xs font-medium cursor-pointer hover:text-navy/60">Historique des versions ({history.length})</summary>
              <div className="mt-2 space-y-1.5">
                {history.map((d: Deliverable) => (
                  <div key={d.id} className="flex items-center justify-between text-xs glass-sm rounded-lg px-3 py-2">
                    <span className="text-navy/60">v{d.version} · {formatDate(d.submitted_at)}</span>
                    <div className="flex items-center gap-2">
                      {statusBadge(d.status)}
                      <CopyDownloadLink deliverableId={d.id} />
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Deliverables from stages already completed (or not the active one) — visible even once delivered. */}
      {otherStages.length > 0 && (
        <div className="space-y-2">
          {otherStages.map((stage) => (
            <PastStageBlock key={stage} stage={stage} deliverables={byStage(stage)} />
          ))}
        </div>
      )}
    </section>
  )
}
