'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, Send, KeyRound, Ban, PlayCircle, UserMinus, UserCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { EditorSpecialty, TeamMemberRole, ContractType, TeamMemberAccountStatus } from '@/lib/types'
import { SPECIALTY_LABELS, TEAM_MEMBER_ROLES, TEAM_MEMBER_ROLE_LABELS } from '@/lib/types'
import { useApp } from '@/context/AppContext'
import { adminFetch } from '@/lib/admin-fetch'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface EditorFormState {
  full_name: string
  roles: TeamMemberRole[]
  specialty: EditorSpecialty
  contract_type: ContractType
  level: string
  email: string
  phone: string
  default_rate: string
  notes: string
}

const defaultForm: EditorFormState = {
  full_name: '', roles: [], specialty: 'both', contract_type: 'freelance',
  level: '', email: '', phone: '', default_rate: '0', notes: '',
}

const STATUS_LABELS: Record<TeamMemberAccountStatus, string> = {
  pending: 'Non invité', invited: 'Invité (en attente)', active: 'Actif', suspended: 'Suspendu',
}
const STATUS_STYLES: Record<TeamMemberAccountStatus, string> = {
  pending: 'bg-gray-100 text-gray-500 border-gray-200',
  invited: 'bg-amber-50 text-amber-600 border-amber-200',
  active: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  suspended: 'bg-red-50 text-red-600 border-red-200',
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-navy/50 text-xs mb-1 font-medium">{children}</label>
)

function EditorForm({ initial, onSave, onCancel }: {
  initial: EditorFormState
  onSave: (data: EditorFormState) => Promise<string | null>
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof EditorFormState>(key: K, value: EditorFormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const toggleRole = (role: TeamMemberRole) => {
    set('roles', form.roles.includes(role) ? form.roles.filter((r) => r !== role) : [...form.roles, role])
  }

  const handleSave = async () => {
    if (!form.full_name.trim()) return
    setSaving(true)
    setError(null)
    const err = await onSave(form)
    setSaving(false)
    if (err) setError(err)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring' as const, stiffness: 400, damping: 28 }}
      className="glass rounded-2xl p-4 space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Nom complet *</Label>
          <input type="text" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Nom du membre" />
        </div>
        <div>
          <Label>Type de contrat</Label>
          <select value={form.contract_type} onChange={(e) => set('contract_type', e.target.value as ContractType)}>
            <option value="freelance">Freelance</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        <div>
          <Label>Spécialité (montage)</Label>
          <select value={form.specialty} onChange={(e) => set('specialty', e.target.value as EditorSpecialty)}>
            {Object.entries(SPECIALTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <Label>Niveau</Label>
          <input type="text" value={form.level} onChange={(e) => set('level', e.target.value)} placeholder="Junior, Senior…" />
        </div>
        <div>
          <Label>E-mail</Label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="membre@exemple.com" />
        </div>
        <div>
          <Label>Téléphone</Label>
          <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+213…" />
        </div>
        <div>
          <Label>Tarif indicatif (DA)</Label>
          <input type="number" value={form.default_rate} onChange={(e) => set('default_rate', e.target.value)} min="0" />
        </div>
        <div>
          <Label>Notes</Label>
          <input type="text" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Remarques" />
        </div>
      </div>

      <div>
        <Label>Rôles</Label>
        <div className="flex flex-wrap gap-2">
          {TEAM_MEMBER_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => toggleRole(role)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                form.roles.includes(role)
                  ? 'bg-brand text-white border-brand shadow-sm shadow-brand/25'
                  : 'border-silver text-navy/55 hover:text-navy hover:bg-white/50'
              }`}
            >
              {TEAM_MEMBER_ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-600 text-xs font-medium">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-silver text-navy/50 hover:text-navy text-xs transition-colors"
        >
          <X size={12} /> Annuler
        </button>
        <motion.button
          onClick={handleSave}
          disabled={!form.full_name.trim() || saving}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand hover:bg-ocean text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-brand/25"
        >
          <Check size={12} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
        </motion.button>
      </div>
    </motion.div>
  )
}

export default function EditorRoster() {
  const { editors, inactiveEditors, createEditor, updateEditor, deleteEditor, setEditorActive } = useApp()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<TeamMemberRole | ''>('')
  const [showInactive, setShowInactive] = useState(false)
  const [actionState, setActionState] = useState<Record<string, string>>({})

  const setActionMsg = (id: string, msg: string) => {
    setActionState((s) => ({ ...s, [id]: msg }))
    setTimeout(() => setActionState((s) => { const next = { ...s }; delete next[id]; return next }), 3000)
  }

  const handleCreate = async (data: EditorFormState): Promise<string | null> => {
    const { error } = await createEditor({
      full_name: data.full_name,
      roles: data.roles,
      specialty: data.specialty,
      contract_type: data.contract_type,
      level: data.level,
      email: data.email || null,
      phone: data.phone,
      default_rate: parseFloat(data.default_rate) || 0,
      notes: data.notes,
    })
    if (error) return error
    setShowNew(false)
    return null
  }

  const handleUpdate = async (id: string, data: EditorFormState): Promise<string | null> => {
    const error = await updateEditor(id, {
      full_name: data.full_name,
      roles: data.roles,
      specialty: data.specialty,
      contract_type: data.contract_type,
      level: data.level,
      email: data.email || null,
      phone: data.phone,
      default_rate: parseFloat(data.default_rate) || 0,
      notes: data.notes,
    })
    if (error) return error
    setEditingId(null)
    return null
  }

  const handleDelete = async (id: string) => {
    const error = await deleteEditor(id)
    setConfirmDelete(null)
    if (error) setActionMsg(id, `Échec de la suppression : ${error}`)
  }

  const handleDeactivate = async (id: string) => {
    const error = await setEditorActive(id, false)
    setActionMsg(id, error ? `Échec : ${error}` : 'Membre désactivé')
  }

  const handleReactivate = async (id: string) => {
    const error = await setEditorActive(id, true)
    setActionMsg(id, error ? `Échec : ${error}` : 'Membre réactivé')
  }

  const handleInvite = async (id: string) => {
    const res = await adminFetch(`/api/admin/team-members/${id}/invite`, { method: 'POST' })
    const result = await res.json().catch(() => ({}))
    setActionMsg(id, res.ok ? 'Invitation envoyée' : (result?.error ?? 'Échec de l’invitation'))
  }

  const handleResetPassword = async (id: string) => {
    const res = await adminFetch(`/api/admin/team-members/${id}/reset-password`, { method: 'POST' })
    const result = await res.json().catch(() => ({}))
    setActionMsg(id, res.ok ? 'Lien de réinitialisation envoyé' : (result?.error ?? 'Échec'))
  }

  const handleToggleSuspend = async (id: string, suspend: boolean) => {
    const res = await adminFetch(`/api/admin/team-members/${id}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspend }),
    })
    setActionMsg(id, res.ok ? (suspend ? 'Membre suspendu' : 'Membre réactivé') : 'Échec')
  }

  const baseList = showInactive ? [...editors, ...inactiveEditors] : editors
  const filtered = roleFilter ? baseList.filter((e) => (e.roles ?? []).includes(roleFilter)) : baseList

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-navy font-bold">Team Members ({filtered.length})</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-navy/55 cursor-pointer select-none">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="w-auto" />
            Afficher les désactivés
          </label>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as TeamMemberRole | '')} className="text-xs" style={{ width: 'auto' }}>
            <option value="">Tous les rôles</option>
            {TEAM_MEMBER_ROLES.map((r) => <option key={r} value={r}>{TEAM_MEMBER_ROLE_LABELS[r]}</option>)}
          </select>
          <motion.button
            onClick={() => setShowNew(true)}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand hover:bg-ocean text-white text-xs font-semibold transition-colors shadow-sm shadow-brand/25"
          >
            <Plus size={13} /> Ajouter un membre
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showNew && (
          <div className="mb-3">
            <EditorForm initial={defaultForm} onSave={handleCreate} onCancel={() => setShowNew(false)} />
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {filtered.length === 0 && !showNew && (
          <p className="text-navy/35 text-sm text-center py-8">Aucun membre. Cliquez sur « Ajouter un membre » pour commencer.</p>
        )}

        <AnimatePresence>
          {filtered.map((editor, i) => (
            <motion.div
              key={editor.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.04, type: 'spring' as const, stiffness: 400, damping: 28 }}
            >
              {editingId === editor.id ? (
                <EditorForm
                  initial={{
                    full_name: editor.full_name,
                    roles: (editor.roles ?? []) as TeamMemberRole[],
                    specialty: editor.specialty,
                    contract_type: editor.contract_type ?? 'freelance',
                    level: editor.level ?? '',
                    email: editor.email ?? '',
                    phone: editor.phone ?? '',
                    default_rate: (editor.default_rate ?? 0).toString(),
                    notes: editor.notes,
                  }}
                  onSave={(data) => handleUpdate(editor.id, data)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="glass-sm rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-navy font-semibold text-sm">{editor.full_name}</p>
                        {!editor.is_active && (
                          <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-gray-200 text-gray-500 border border-gray-300">
                            Désactivé
                          </span>
                        )}
                        <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border ${STATUS_STYLES[editor.account_status]}`}>
                          {STATUS_LABELS[editor.account_status]}
                        </span>
                        {(editor.roles ?? []).map((r) => (
                          <span key={r} className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                            style={{ background: 'rgba(42,164,231,0.1)', color: '#0A60AD', border: '1px solid rgba(42,164,231,0.2)' }}>
                            {TEAM_MEMBER_ROLE_LABELS[r as TeamMemberRole] ?? r}
                          </span>
                        ))}
                      </div>
                      <p className="text-navy/45 text-xs mt-0.5 truncate">
                        {[editor.email, editor.phone, editor.level, editor.contract_type === 'staff' ? 'Staff' : 'Freelance'].filter(Boolean).join(' · ')}
                      </p>
                      {actionState[editor.id] && (
                        <p className="text-brand text-[11px] font-medium mt-1">{actionState[editor.id]}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {editor.email && editor.account_status !== 'active' && (
                        <motion.button
                          onClick={() => handleInvite(editor.id)}
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          title="Inviter"
                          className="p-1.5 rounded-xl text-navy/35 hover:text-brand hover:bg-brand/10 transition-colors"
                        >
                          <Send size={13} />
                        </motion.button>
                      )}
                      {editor.email && editor.account_status === 'active' && (
                        <motion.button
                          onClick={() => handleResetPassword(editor.id)}
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          title="Réinitialiser mot de passe"
                          className="p-1.5 rounded-xl text-navy/35 hover:text-brand hover:bg-brand/10 transition-colors"
                        >
                          <KeyRound size={13} />
                        </motion.button>
                      )}
                      {editor.account_status === 'suspended' ? (
                        <motion.button
                          onClick={() => handleToggleSuspend(editor.id, false)}
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          title="Réactiver"
                          className="p-1.5 rounded-xl text-navy/35 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <PlayCircle size={13} />
                        </motion.button>
                      ) : editor.account_status === 'active' && (
                        <motion.button
                          onClick={() => handleToggleSuspend(editor.id, true)}
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          title="Suspendre"
                          className="p-1.5 rounded-xl text-navy/35 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Ban size={13} />
                        </motion.button>
                      )}
                      {editor.is_active ? (
                        <motion.button
                          onClick={() => handleDeactivate(editor.id)}
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          title="Désactiver (masqué mais récupérable)"
                          className="p-1.5 rounded-xl text-navy/35 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <UserMinus size={13} />
                        </motion.button>
                      ) : (
                        <motion.button
                          onClick={() => handleReactivate(editor.id)}
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          title="Réactiver"
                          className="p-1.5 rounded-xl text-navy/35 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <UserCheck size={13} />
                        </motion.button>
                      )}
                      <motion.button
                        onClick={() => setEditingId(editor.id)}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        className="p-1.5 rounded-xl text-navy/35 hover:text-navy hover:bg-white/50 transition-colors"
                      >
                        <Pencil size={13} />
                      </motion.button>
                      <motion.button
                        onClick={() => setConfirmDelete(editor.id)}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        title="Supprimer définitivement"
                        className="p-1.5 rounded-xl text-navy/35 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <ConfirmModal
        open={confirmDelete !== null}
        title="Supprimer ce membre ?"
        message={`Cette action est définitive et irréversible : ${filtered.find((e) => e.id === confirmDelete)?.full_name ?? 'ce membre'} sera complètement supprimé de la base de données. Son nom restera visible sur les projets passés, mais son compte ne pourra pas être récupéré.`}
        confirmLabel="Supprimer définitivement"
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </div>
  )
}
