'use client'

import { useRef, useState } from 'react'
import { Paperclip, Trash2, Download } from 'lucide-react'
import type { Project } from '@/lib/types'
import { adminFetch } from '@/lib/admin-fetch'

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

  const handleDelete = async (fileId: string) => {
    await adminFetch(`/api/admin/projects/${project.id}/files/${fileId}`, { method: 'DELETE' })
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
              <a href={`/api/project-files/${f.id}`} className="p-1 rounded text-navy/40 hover:text-brand transition-colors" title="Télécharger">
                <Download size={13} />
              </a>
              <button onClick={() => handleDelete(f.id)} className="p-1 rounded text-navy/40 hover:text-red-500 transition-colors" title="Supprimer">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
