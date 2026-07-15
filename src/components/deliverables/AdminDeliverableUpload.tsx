'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { UploadCloud, AlertCircle } from 'lucide-react'
import { useResumableUpload } from '@/lib/use-resumable-upload'
import { adminFetch } from '@/lib/admin-fetch'
import type { ProjectStage } from '@/lib/types'

interface Props {
  projectId: string
  stage: ProjectStage
  onUploaded?: () => void
  label?: string
  autoOpen?: boolean
}

// Lets admin/commercial submit a deliverable on anyone's behalf, at any stage —
// same chunked-upload pipeline team members use, just authenticated via adminFetch.
export default function AdminDeliverableUpload({ projectId, stage, onUploaded, label, autoOpen }: Props) {
  const [open, setOpen] = useState(Boolean(autoOpen))
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const { uploading, progress, error, upload } = useResumableUpload(adminFetch)

  const handleUpload = async () => {
    if (!file) return
    const ok = await upload({ projectId, stage, file, notes })
    if (ok) {
      setFile(null)
      setNotes('')
      setOpen(false)
      onUploaded?.()
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-ocean"
      >
        <UploadCloud size={13} /> {label ?? 'Envoyer un livrable'}
      </button>
    )
  }

  return (
    <div className="glass-sm rounded-xl p-3 space-y-2">
      <input id={`admin-upload-${projectId}-${stage}`} type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <label
        htmlFor={`admin-upload-${projectId}-${stage}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-silver text-navy/60 hover:text-navy hover:bg-white/50 text-xs font-semibold cursor-pointer transition-colors"
      >
        <UploadCloud size={13} /> {file ? file.name : 'Choisir un fichier'}
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="resize-none text-xs"
        placeholder="Note (optionnel)"
      />
      {uploading && (
        <div className="h-1.5 rounded-full bg-navy/10 overflow-hidden">
          <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && (
        <p className="flex items-center gap-1.5 text-red-500 text-xs"><AlertCircle size={12} /> {error}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => { setOpen(false); setFile(null) }}
          className="flex-1 py-1.5 rounded-xl border border-silver text-navy/50 hover:text-navy text-xs transition-colors"
        >
          Annuler
        </button>
        <motion.button
          onClick={handleUpload}
          disabled={!file || uploading}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="flex-1 py-1.5 rounded-xl bg-brand hover:bg-ocean text-white text-xs font-semibold transition-colors disabled:opacity-50"
        >
          {uploading ? `Envoi… ${progress}%` : 'Envoyer'}
        </motion.button>
      </div>
    </div>
  )
}
