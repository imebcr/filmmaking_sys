'use client'

import { useState, useCallback } from 'react'

const CHUNK_SIZE = 4 * 1024 * 1024 // 4MB chunks

interface UploadParams {
  projectId: string
  stage: string
  file: File
  notes: string
  batchId?: string
}

interface UploadState {
  uploading: boolean
  progress: number // 0-100
  error: string | null
  currentFileIndex: number
  totalFiles: number
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

// crypto.randomUUID() requires a secure context (HTTPS/localhost) — this app runs over
// plain HTTP, so it's unavailable. crypto.getRandomValues() has no such restriction.
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * Offset-based resumable upload against /api/member/deliverables/*.
 * Retries the current chunk on transient network failure, re-syncing the
 * offset via GET first — this is what satisfies CDC §7.3/§12.1's "resumes
 * automatically after a 60s cutout" requirement without a full tus.io stack.
 *
 * Accepts a custom fetcher so admin (Supabase Auth, no session cookie on these
 * routes) can pass adminFetch to attach a Bearer token; team members and
 * commercials (NextAuth cookie session) can just use the default plain fetch.
 */
export function useResumableUpload(fetcher: Fetcher = fetch) {
  const [state, setState] = useState<UploadState>({ uploading: false, progress: 0, error: null, currentFileIndex: 0, totalFiles: 0 })

  const upload = useCallback(async ({ projectId, stage, file, notes, batchId }: UploadParams): Promise<boolean> => {
    setState((s) => ({ ...s, uploading: true, progress: 0, error: null }))
    try {
      const initRes = await fetcher('/api/member/deliverables/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          stage,
          filename: file.name,
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
          notes,
          batch_id: batchId ?? generateId(),
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
            const res = await fetcher(`/api/member/deliverables/${deliverableId}/chunk`, {
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
            const syncRes = await fetcher(`/api/member/deliverables/${deliverableId}/chunk`)
            const syncData = await syncRes.json().catch(() => ({}))
            if (syncRes.ok) offset = syncData.offset
          }
        }

        setState((s) => ({ ...s, progress: Math.round((offset / file.size) * 100) }))
      }

      const completeRes = await fetcher(`/api/member/deliverables/${deliverableId}/complete`, { method: 'POST' })
      const completeData = await completeRes.json().catch(() => ({}))
      if (!completeRes.ok) throw new Error(completeData?.error ?? 'Impossible de finaliser l’upload.')

      setState((s) => ({ ...s, uploading: false, progress: 100, error: null }))
      return true
    } catch (err) {
      setState((s) => ({ ...s, uploading: false, error: err instanceof Error ? err.message : 'Erreur inconnue.' }))
      return false
    }
  }, [fetcher])

  // Uploads several files as one batch — one deliverable (its own version) per file, but all
  // sharing a batch_id so the admin reviews them together and the project only advances once
  // every file in the batch has been decided on.
  const uploadMultiple = useCallback(async ({ projectId, stage, files, notes }: Omit<UploadParams, 'file' | 'batchId'> & { files: File[] }): Promise<boolean> => {
    const batchId = generateId()
    let allOk = true
    for (let i = 0; i < files.length; i++) {
      setState((s) => ({ ...s, currentFileIndex: i + 1, totalFiles: files.length }))
      const ok = await upload({ projectId, stage, file: files[i], notes, batchId })
      if (!ok) allOk = false
    }
    setState((s) => ({ ...s, currentFileIndex: 0, totalFiles: 0 }))
    return allOk
  }, [upload])

  return { ...state, upload, uploadMultiple }
}
