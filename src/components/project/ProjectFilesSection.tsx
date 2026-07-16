'use client'

import { useRef, useState } from 'react'
import { Paperclip, Trash2, Download, AlertTriangle } from 'lucide-react'
import type { Project, ProjectFile } from '@/lib/types'
import { adminFetch } from '@/lib/admin-fetch'
import Modal from '@/components/ui/Modal'

function formatBytes(bytes: number): string {
  if (!bytes) return '0 o'
  const units = ['o', 'Ko', 'Mo', 'Go']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export default function ProjectFilesSection({ project }: { project: Project }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProjectFile | null>(null)
  const [deleting, setDeleting] = useState(false)
  const files = project.project_files ?? []

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    setError(null)
    for (const file of Array.from(fileList)) {
      const form = new FormData()
      form.append('file', file)
      const res = await adminFetch(`/api/admin/projects/${project.id}/files`, { method: 'POST', body: form })
      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        setError(result?.error ?? `Échec de l’envoi de ${file.name}.`)
      }
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  // A plain <a href> never carries the admin's Supabase Bearer token (only attached by
  // adminFetch), so a pure-admin account (no NextAuth session/cookie) got "Accès refusé"
  // on every click. Fetching the file through adminFetch and downloading the blob instead
  // sends the token like every other admin request does.
  const handleDownload = async (f: ProjectFile) => {
    setDownloadingId(f.id)
    setError(null)
    const res = await adminFetch(`/api/project-files/${f.id}`)
    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      setError(result?.error ?? 'Échec du téléchargement.')
      setDownloadingId(null)
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = f.file_name
    a.click()
    URL.revokeObjectURL(url)
    setDownloadingId(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await adminFetch(`/api/admin/projects/${project.id}/files/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) {
      const result = await res.json().catch(() => ({}))
      setError(result?.error ?? 'Échec de la suppression.')
      return
    }
    setDeleteTarget(null)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-navy/40 uppercase tracking-wider">Fichiers du projet</h3>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-ocean disabled:opacity-50"
        >
          <Paperclip size={13} /> {uploading ? 'Envoi…' : 'Ajouter des fichiers'}
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => handleUpload(e.target.files)} />
      </div>

      {error && <p className="text-red-500 text-xs font-medium mb-2">{error}</p>}

      {files.length === 0 ? (
        <p className="text-navy/35 text-xs glass-sm rounded-xl p-3">Aucun fichier joint.</p>
      ) : (
        <div className="space-y-1.5">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-2 glass-sm rounded-lg px-3 py-2 text-xs">
              <span className="flex-1 min-w-0 truncate text-navy/70">{f.file_name}</span>
              <span className="text-navy/35 shrink-0">{formatBytes(f.size_bytes)}</span>
              <button
                onClick={() => handleDownload(f)}
                disabled={downloadingId === f.id}
                className="p-1 rounded text-navy/40 hover:text-brand transition-colors disabled:opacity-40"
                title="Télécharger"
              >
                <Download size={13} />
              </button>
              <button onClick={() => setDeleteTarget(f)} className="p-1 rounded text-navy/40 hover:text-red-500 transition-colors" title="Supprimer">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Supprimer ce fichier ?" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 text-navy/70 text-sm">
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <p>
              Vous êtes sur le point de supprimer <strong className="text-navy">{deleteTarget?.file_name}</strong>.
              Cette action est définitive et le fichier ne pourra pas être récupéré.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 py-2 rounded-xl border border-silver text-navy/50 hover:text-navy hover:bg-white/50 text-sm transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
