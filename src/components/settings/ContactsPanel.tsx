'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Pencil, Trash2, Check, X, Camera } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Contact, ContactType } from '@/lib/types'
import { useApp } from '@/context/AppContext'
import { adminFetch } from '@/lib/admin-fetch'

interface FormState { full_name: string; phone: string; email: string; daily_rate: string; notes: string }
const defaultForm: FormState = { full_name: '', phone: '', email: '', daily_rate: '0', notes: '' }

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-navy/50 text-xs mb-1 font-medium">{children}</label>
)

function ContactForm({ type, initial, contact, onSave, onCancel }: {
  type: ContactType
  initial: FormState
  contact?: Contact
  onSave: (d: FormState) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.full_name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const handlePhotoChange = async (file: File | null) => {
    if (!file || !contact) return
    setPhotoUploading(true)
    const body = new FormData()
    body.append('photo', file)
    await adminFetch(`/api/admin/contacts/${contact.id}/photo`, { method: 'POST', body })
    setPhotoUploading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring' as const, stiffness: 400, damping: 28 }}
      className="glass rounded-2xl p-4 space-y-3"
    >
      {type === 'FIGURANT' && contact && (
        <div className="flex items-center gap-3 pb-2">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-brand/10 flex items-center justify-center shrink-0">
            {contact.photo_url ? (
              <Image src={contact.photo_url} alt={contact.full_name} width={48} height={48} className="object-cover w-full h-full" />
            ) : (
              <Camera size={16} className="text-brand/50" />
            )}
          </div>
          <label className="text-brand text-xs font-semibold cursor-pointer hover:text-ocean">
            {photoUploading ? 'Envoi…' : contact.photo_url ? 'Changer la photo' : 'Ajouter une photo *'}
            <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Nom *</Label>
          <input type="text" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Nom complet" />
        </div>
        <div>
          <Label>Téléphone</Label>
          <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+213…" />
        </div>
        {type === 'FIGURANT' ? (
          <div>
            <Label>Tarif journalier (DA)</Label>
            <input type="number" value={form.daily_rate} onChange={(e) => set('daily_rate', e.target.value)} min="0" />
          </div>
        ) : (
          <div>
            <Label>E-mail</Label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="contact@exemple.com" />
          </div>
        )}
        {type === 'FIGURANT' && (
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <input type="text" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Remarques" />
          </div>
        )}
      </div>
      {type === 'FIGURANT' && !contact && (
        <p className="text-navy/40 text-[11px]">Enregistrez d’abord le figurant pour pouvoir ajouter sa photo.</p>
      )}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-silver text-navy/50 hover:text-navy text-xs transition-colors">
          <X size={12} /> Annuler
        </button>
        <motion.button
          onClick={handleSave} disabled={!form.full_name.trim() || saving}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand hover:bg-ocean text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-brand/25"
        >
          <Check size={12} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
        </motion.button>
      </div>
    </motion.div>
  )
}

function ContactList({ type }: { type: ContactType }) {
  const { contacts, createContact, updateContact, deleteContact } = useApp()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const list = contacts.filter((c) => c.type === type)

  const toForm = (c?: Contact): FormState => ({
    full_name: c?.full_name ?? '', phone: c?.phone ?? '', email: c?.email ?? '',
    daily_rate: (c?.daily_rate ?? 0).toString(), notes: c?.notes ?? '',
  })

  const handleCreate = async (data: FormState) => {
    await createContact({
      type, full_name: data.full_name.trim(), phone: data.phone,
      email: data.email, daily_rate: parseFloat(data.daily_rate) || 0, notes: data.notes,
    })
    setShowNew(false)
  }

  const handleUpdate = async (id: string, data: FormState) => {
    await updateContact(id, {
      full_name: data.full_name.trim(), phone: data.phone,
      email: data.email, daily_rate: parseFloat(data.daily_rate) || 0, notes: data.notes,
    })
    setEditingId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-navy font-bold">{type === 'FIGURANT' ? 'Figurants' : 'Commerciaux'} ({list.length})</h2>
        <motion.button
          onClick={() => setShowNew(true)}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand hover:bg-ocean text-white text-xs font-semibold transition-colors shadow-sm shadow-brand/25"
        >
          <Plus size={13} /> Ajouter
        </motion.button>
      </div>

      <AnimatePresence>
        {showNew && (
          <div className="mb-3">
            <ContactForm type={type} initial={toForm()} onSave={handleCreate} onCancel={() => setShowNew(false)} />
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {list.length === 0 && !showNew && (
          <p className="text-navy/35 text-sm text-center py-8">Aucun contact pour l’instant.</p>
        )}
        <AnimatePresence>
          {list.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.04, type: 'spring' as const, stiffness: 400, damping: 28 }}
            >
              {editingId === c.id ? (
                <ContactForm type={type} initial={toForm(c)} contact={c} onSave={(data) => handleUpdate(c.id, data)} onCancel={() => setEditingId(null)} />
              ) : (
                <div className="glass-sm rounded-2xl px-4 py-3 flex items-center gap-3">
                  {type === 'FIGURANT' && (
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-brand/10 flex items-center justify-center shrink-0">
                      {c.photo_url ? (
                        <Image src={c.photo_url} alt={c.full_name} width={36} height={36} className="object-cover w-full h-full" />
                      ) : (
                        <Camera size={14} className="text-brand/40" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-navy font-semibold text-sm">{c.full_name}</p>
                    <p className="text-navy/45 text-xs mt-0.5 truncate">
                      {type === 'FIGURANT'
                        ? [c.phone, c.daily_rate ? `${c.daily_rate.toLocaleString('fr-DZ')} DA/j` : null, c.notes].filter(Boolean).join(' · ')
                        : [c.phone, c.email].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <motion.button onClick={() => setEditingId(c.id)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-1.5 rounded-xl text-navy/35 hover:text-navy hover:bg-white/50 transition-colors">
                      <Pencil size={13} />
                    </motion.button>
                    {confirmDelete === c.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={async () => { await deleteContact(c.id); setConfirmDelete(null) }} className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-medium">Confirmer</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 rounded-lg border border-silver text-navy/50 text-xs">Annuler</button>
                      </div>
                    ) : (
                      <motion.button onClick={() => setConfirmDelete(c.id)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-1.5 rounded-xl text-navy/35 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </motion.button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function ContactsPanel() {
  const [subTab, setSubTab] = useState<ContactType>('FIGURANT')

  return (
    <div>
      <div className="flex gap-1 mb-5 glass-sm rounded-xl p-1 w-fit">
        {(['FIGURANT', 'COMMERCIAL'] as ContactType[]).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${subTab === t ? 'bg-brand text-white' : 'text-navy/55 hover:text-navy'}`}
          >
            {t === 'FIGURANT' ? 'Figurants' : 'Commerciaux'}
          </button>
        ))}
      </div>
      <ContactList type={subTab} />
    </div>
  )
}
