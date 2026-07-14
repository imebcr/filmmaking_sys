'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Plus, Minus, Paperclip, X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { syncAssignments } from '@/lib/sync-assignments'
import { adminFetch } from '@/lib/admin-fetch'
import Modal from '@/components/ui/Modal'
import { DELIVERABLE_STAGES, STAGE_LABELS, ROLE_TO_STAKEHOLDER, TEAM_MEMBER_ROLE_LABELS, type TeamMemberRole } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-navy/50 text-xs mb-1.5 font-medium">{children}</label>
)

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-bold text-navy/40 uppercase tracking-wider mb-3 mt-2">{children}</h3>
)

// Team roles that make sense to assign once for the whole client order, up front.
// Editors are assigned per-video later (each video reaches Editing on its own schedule).
const TEAM_ROLES: TeamMemberRole[] = ['filmmaker', 'script_writer', 'voice_over']

interface VideoRow {
  project_type_id: string
  deadline: string
  deal_price: string
}

function emptyVideoRow(): VideoRow {
  return { project_type_id: '', deadline: '', deal_price: '' }
}

export default function NewProjectModal({ open, onClose }: Props) {
  const { projectTypes, editors, createProjectBatch } = useApp()
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [commercialId, setCommercialId] = useState('')
  const [description, setDescription] = useState('')
  const [stageRequirements, setStageRequirements] = useState<Record<string, string>>({})
  const [revisionsAllowed, setRevisionsAllowed] = useState('2')
  const [quantity, setQuantity] = useState(1)
  const [videos, setVideos] = useState<VideoRow[]>([emptyVideoRow()])
  const [team, setTeam] = useState<Record<string, string>>({})
  const [mediaFaceName, setMediaFaceName] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)

  // project.commercial_id is a FK into editors, not contacts — must be a team member with the Commercial role.
  const commercials = editors.filter((e) => (e.roles ?? []).includes('commercial'))

  const setQuantityClamped = (n: number) => {
    const clamped = Math.min(Math.max(n, 1), 20)
    setQuantity(clamped)
    setVideos((prev) => {
      if (clamped > prev.length) {
        const last = prev[prev.length - 1] ?? emptyVideoRow()
        return [...prev, ...Array.from({ length: clamped - prev.length }, () => ({ ...last }))]
      }
      return prev.slice(0, clamped)
    })
  }

  const updateVideo = (index: number, field: keyof VideoRow, value: string) => {
    setVideos((prev) => prev.map((v, i) => {
      if (i !== index) return v
      const next = { ...v, [field]: value }
      if (field === 'project_type_id') {
        const type = projectTypes.find((t) => t.id === value)
        if (type) next.deal_price = type.default_price ? type.default_price.toString() : next.deal_price
      }
      return next
    }))
  }

  const reset = () => {
    setClientName(''); setClientPhone(''); setClientEmail(''); setClientCompany(''); setCommercialId('')
    setDescription(''); setStageRequirements({}); setRevisionsAllowed('2')
    setQuantity(1); setVideos([emptyVideoRow()]); setTeam({}); setMediaFaceName(''); setAttachedFiles([])
  }

  const handleCreate = async () => {
    if (!clientName.trim()) return
    setSaving(true)

    const sharedStakeholders: Array<{ role: 'filmmaker' | 'scriptwriter' | 'voiceover' | 'media_face'; editor_id: string | null; name: string }> = TEAM_ROLES
      .map((role) => {
        const memberId = team[role]
        if (!memberId) return null
        const member = editors.find((e) => e.id === memberId)
        if (!member) return null
        return { role: ROLE_TO_STAKEHOLDER[role]!, editor_id: member.id, name: member.full_name }
      })
      .filter((s): s is { role: 'filmmaker' | 'scriptwriter' | 'voiceover'; editor_id: string; name: string } => s !== null)

    if (mediaFaceName.trim()) {
      sharedStakeholders.push({ role: 'media_face', editor_id: null, name: mediaFaceName.trim() })
    }

    const created = await createProjectBatch({
      clientName: clientName.trim(),
      clientPhone,
      clientEmail,
      clientCompany,
      commercialId: commercialId || null,
      description,
      stageRequirements,
      revisionsAllowed: parseInt(revisionsAllowed) || 0,
      videos: videos.map((v) => ({
        project_type_id: v.project_type_id || null,
        deadline: v.deadline || null,
        deal_price: v.deal_price ? parseFloat(v.deal_price) : 0,
      })),
      sharedStakeholders,
    })

    const memberIds = sharedStakeholders.map((s) => s.editor_id).filter((id): id is string => id !== null)
    if (created && memberIds.length > 0) {
      created.forEach((p) => syncAssignments(p.id, memberIds, []))
    }

    if (created && attachedFiles.length > 0) {
      for (const project of created) {
        for (const file of attachedFiles) {
          const form = new FormData()
          form.append('file', file)
          await adminFetch(`/api/admin/projects/${project.id}/files`, { method: 'POST', body: form })
        }
      }
    }

    setSaving(false)
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Nouveau Projet" size="lg">
      <div className="space-y-4">
        <SectionTitle>Général</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Nom client *</Label>
            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nom du client" />
          </div>
          <div>
            <Label>Nombre de vidéos</Label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setQuantityClamped(quantity - 1)} className="p-2 rounded-xl border border-silver text-navy/50 hover:text-navy hover:bg-white/50 transition-colors">
                <Minus size={13} />
              </button>
              <input
                type="number" value={quantity} min={1} max={20}
                onChange={(e) => setQuantityClamped(parseInt(e.target.value) || 1)}
                className="text-center"
              />
              <button type="button" onClick={() => setQuantityClamped(quantity + 1)} className="p-2 rounded-xl border border-silver text-navy/50 hover:text-navy hover:bg-white/50 transition-colors">
                <Plus size={13} />
              </button>
            </div>
          </div>
          <div>
            <Label>Révisions autorisées (par vidéo)</Label>
            <input type="number" value={revisionsAllowed} onChange={(e) => setRevisionsAllowed(e.target.value)} min="0" />
          </div>
          <div>
            <Label>Commercial responsable</Label>
            <select value={commercialId} onChange={(e) => setCommercialId(e.target.value)}>
              <option value="">Aucun</option>
              {commercials.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            {commercials.length === 0 && (
              <p className="text-navy/35 text-[11px] mt-1">Aucun membre avec le rôle Commercial pour l’instant.</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <Label>Description générale</Label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="resize-none" placeholder="Contexte du projet, objectifs…" />
          </div>
        </div>

        <SectionTitle>Vidéos {quantity > 1 && <span className="text-navy/35 normal-case font-normal">— type, deadline et prix par vidéo</span>}</SectionTitle>
        <div className="space-y-2">
          {videos.map((v, i) => (
            <div key={i} className="glass-sm rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {quantity > 1 && <p className="sm:col-span-3 text-navy/45 text-xs font-semibold">Vidéo {i + 1}</p>}
              <div>
                <Label>Type</Label>
                <select value={v.project_type_id} onChange={(e) => updateVideo(i, 'project_type_id', e.target.value)} className="text-xs">
                  <option value="">Sélectionner…</option>
                  {projectTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Deadline</Label>
                <input type="date" value={v.deadline} onChange={(e) => updateVideo(i, 'deadline', e.target.value)} className="text-xs" />
              </div>
              <div>
                <Label>Prix (DA)</Label>
                <input type="number" value={v.deal_price} onChange={(e) => updateVideo(i, 'deal_price', e.target.value)} min="0" className="text-xs" />
              </div>
            </div>
          ))}
        </div>

        <SectionTitle>Équipe {quantity > 1 && <span className="text-navy/35 normal-case font-normal">— assignée à toutes les vidéos de cette commande</span>}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TEAM_ROLES.map((role) => {
            const stakeholderRole = ROLE_TO_STAKEHOLDER[role]
            const candidates = editors.filter((e) => (e.roles ?? []).includes(role))
            return (
              <div key={role}>
                <Label>{TEAM_MEMBER_ROLE_LABELS[role]}</Label>
                <select value={team[role] ?? ''} onChange={(e) => setTeam((t) => ({ ...t, [role]: e.target.value }))}>
                  <option value="">Aucun</option>
                  {candidates.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
                {candidates.length === 0 && (
                  <p className="text-navy/35 text-[11px] mt-1">Aucun membre {stakeholderRole ?? ''}.</p>
                )}
              </div>
            )
          })}
          <div>
            <Label>Visage / Figurant</Label>
            <input
              type="text"
              value={mediaFaceName}
              onChange={(e) => setMediaFaceName(e.target.value)}
              placeholder="Nom du figurant"
            />
          </div>
        </div>

        <SectionTitle>Coordonnées client</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Téléphone</Label>
            <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+213…" />
          </div>
          <div>
            <Label>E-mail</Label>
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@exemple.com" />
          </div>
          <div>
            <Label>Entreprise / Adresse</Label>
            <input type="text" value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} placeholder="Optionnel" />
          </div>
        </div>

        <SectionTitle>Attentes par étape {quantity > 1 && <span className="text-navy/35 normal-case font-normal">— partagées par toutes les vidéos</span>}</SectionTitle>
        <div className="space-y-3">
          {DELIVERABLE_STAGES.map((stage) => (
            <div key={stage}>
              <Label>{STAGE_LABELS[stage]}</Label>
              <textarea
                value={stageRequirements[stage] ?? ''}
                onChange={(e) => setStageRequirements((s) => ({ ...s, [stage]: e.target.value }))}
                rows={2}
                className="resize-none"
                placeholder={`Ce qui est attendu à l’étape ${STAGE_LABELS[stage]}…`}
              />
            </div>
          ))}
        </div>

        <SectionTitle>Fichiers {quantity > 1 && <span className="text-navy/35 normal-case font-normal">— joints à toutes les vidéos</span>}</SectionTitle>
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-ocean"
          >
            <Paperclip size={13} /> Ajouter des fichiers
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
          />
          {attachedFiles.length > 0 && (
            <div className="mt-2 space-y-1">
              {attachedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 glass-sm rounded-lg px-3 py-1.5 text-xs">
                  <span className="flex-1 min-w-0 truncate text-navy/70">{f.name}</span>
                  <button type="button" onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))} className="text-navy/40 hover:text-red-500">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => { reset(); onClose() }}
            className="flex-1 py-2 rounded-xl border border-silver text-navy/50 hover:text-navy hover:bg-white/50 text-sm transition-colors"
          >
            Annuler
          </button>
          <motion.button
            onClick={handleCreate}
            disabled={!clientName.trim() || saving}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex-1 py-2 rounded-xl bg-brand hover:bg-ocean text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-brand/25"
          >
            {saving ? 'Création…' : quantity > 1 ? `Créer ${quantity} vidéos` : 'Créer le projet'}
          </motion.button>
        </div>
      </div>
    </Modal>
  )
}
