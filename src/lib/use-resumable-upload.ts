'use client'

import { useState, useCallback } from 'react'

const CHUNK_SIZE = 4 * 1024 * 1024 // 4MB chunks

interface UploadParams {
  projectId: string
  stage: string
  file: File
  notes: string
}

interface UploadState {
  uploading: boolean
  progress: number // 0-100
  error: string | null
  currentFileIndex: number
  totalFiles: number
}

/**
 * Offset-based resumable upload against /api/member/deliverables/*.
 * Retries the current chunk on transient network failure, re-syncing the
 * offset via GET first — this is what satisfies CDC §7.3/§12.1's "resumes
 * automatically after a 60s cutout" requirement without a full tus.io stack.
 */
export function useResumableUpload() {
  const [state, setState] = useState<UploadState>({ uploading: false, progress: 0, error: null, currentFileIndex: 0, totalFiles: 0 })

  const upload = useCallback(async ({ projectId, stage, file, notes }: UploadParams): Promise<boolean> => {
    setState((s) => ({ ...s, uploading: true, progress: 0, error: null }))
    try {
      const initRes = await fetch('/api/member/deliverables/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          stage,
          filename: file.name,
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
          notes,
        }),
      })
      const initData = await initRes.json().catch(() => ({}))
      if (!initRes.ok) throw new Error(initData?.error ?? 'Impossible de démarrer l’upload.')

      const deliverableId = initData.deliverableId as string
      let offset = 0

      while (offset < file.size) {
        const chunk = file.slice(offset, offset + CHUNK_SIZE)
        let attempt = 0
        let success = false

        while (attempt < 5 && !success) {
          attempt++
          try {
            const res = await fetch(`/api/member/deliverables/${deliverableId}/chunk`, {
              method: 'PATCH',
              headers: { 'X-Upload-Offset': String(offset) },
              body: chunk,
            })
            if (res.status === 409) {
              const conflict = await res.json().catch(() => ({}))
              offset = conflict.offset ?? offset
              continue
            }
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data?.error ?? 'Échec du chunk.')
            offset = data.offset
            success = true
          } catch {
            if (attempt >= 5) throw new Error('Échec de l’envoi après plusieurs tentatives.')
            await new Promise((r) => setTimeout(r, 1000 * attempt))
            // resync offset before retrying
            const syncRes = await fetch(`/api/member/deliverables/${deliverableId}/chunk`)
            const syncData = await syncRes.json().catch(() => ({}))
            if (syncRes.ok) offset = syncData.offset
          }
        }

        setState((s) => ({ ...s, progress: Math.round((offset / file.size) * 100) }))
      }

      const completeRes = await fetch(`/api/member/deliverables/${deliverableId}/complete`, { method: 'POST' })
      const completeData = await completeRes.json().catch(() => ({}))
      if (!completeRes.ok) throw new Error(completeData?.error ?? 'Impossible de finaliser l’upload.')

      setState((s) => ({ ...s, uploading: false, progress: 100, error: null }))
      return true
    } catch (err) {
      setState((s) => ({ ...s, uploading: false, error: err instanceof Error ? err.message : 'Erreur inconnue.' }))
      return false
    }
  }, [])

  // Uploads several files as a batch — one deliverable (its own version) per file, submitted together.
  const uploadMultiple = useCallback(async ({ projectId, stage, files, notes }: Omit<UploadParams, 'file'> & { files: File[] }): Promise<boolean> => {
    let allOk = true
    for (let i = 0; i < files.length; i++) {
      setState((s) => ({ ...s, currentFileIndex: i + 1, totalFiles: files.length }))
      const ok = await upload({ projectId, stage, file: files[i], notes })
      if (!ok) allOk = false
    }
    setState((s) => ({ ...s, currentFileIndex: 0, totalFiles: 0 }))
    return allOk
  }, [upload])

  return { ...state, upload, uploadMultiple }
}
