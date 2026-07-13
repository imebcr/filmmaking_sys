'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ProjectType } from '@/lib/types'
import { useApp } from '@/context/AppContext'

const PRESET_COLORS = ['#3B82F6', '#8B5CF6', '#F97316', '#10B981', '#EC4899', '#F59E0B', '#6366F1', '#2AA4E7']

interface FormState { name: string; default_duration_hours: string; color: string; default_price: string; default_revisions: string }
const defaultForm: FormState = { name: '', default_duration_hours: '24', color: '#2AA4E7', default_price: '0', default_revisions: '2' }

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-navy/50 text-xs mb-1 font-medium">{children}</label>
)

function TypeForm({ initial, onSave, onCancel }: {
  initial: FormState
  onSave: (d: FormState) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring' as const, stiffness: 400, damping: 28 }}
      className="glass rounded-2xl p-4 space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label>Name *</Label>
          <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Project type name" />
        </div>
        <div>
          <Label>Default Duration (hours)</Label>
          <input type="number" value={form.default_duration_hours} onChange={(e) => set('default_duration_hours', e.target.value)} min="1" />
        </div>
        <div>
          <Label>Tarif par défaut (DA)</Label>
          <input type="number" value={form.default_price} onChange={(e) => set('default_price', e.target.value)} min="0" />
        </div>
        <div>
          <Label>Révisions incluses</Label>
          <input type="number" value={form.default_revisions} onChange={(e) => set('default_revisions', e.target.value)} min="0" />
        </div>
        <div>
          <Label>Badge Color</Label>
          <div className="flex gap-1.5 flex-wrap mt-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => set('color', c)}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: c, borderColor: form.color === c ? '#0C224B' : 'transparent' }}
              />
            ))}
            <input
              type="color"
              value={form.color}
              onChange={(e) => set('color', e.target.value)}
              className="w-6 h-6 rounded-full cursor-pointer"
              style={{ padding: 0, border: '1px solid rgba(42,164,231,0.3)' }}
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-2">
        <span className="text-navy/45 text-xs font-medium">Preview:</span>
        <span
          className="inline-flex items-center rounded-full text-xs px-2.5 py-0.5 font-semibold"
          style={{ backgroundColor: form.color + '18', border: `1px solid ${form.color}35`, color: form.color }}
        >
          {form.name || 'Type Name'}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-silver text-navy/50 hover:text-navy text-xs transition-colors"
        >
          <X size={12} /> Cancel
        </button>
        <motion.button
          onClick={handleSave}
          disabled={!form.name.trim() || saving}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand hover:bg-ocean text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-brand/25"
        >
          <Check size={12} /> {saving ? 'Saving…' : 'Save'}
        </motion.button>
      </div>
    </motion.div>
  )
}

export default function ProjectTypes() {
  const { projectTypes, createProjectType, updateProjectType, deleteProjectType } = useApp()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleCreate = async (data: FormState) => {
    await createProjectType({
      name: data.name.trim(),
      default_duration_hours: parseInt(data.default_duration_hours) || 24,
      color: data.color,
      default_price: parseInt(data.default_price) || 0,
      default_revisions: parseInt(data.default_revisions) || 0,
    })
    setShowNew(false)
  }

  const handleUpdate = async (id: string, data: FormState) => {
    await updateProjectType(id, {
      name: data.name.trim(),
      default_duration_hours: parseInt(data.default_duration_hours) || 24,
      color: data.color,
      default_price: parseInt(data.default_price) || 0,
      default_revisions: parseInt(data.default_revisions) || 0,
    })
    setEditingId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-navy font-bold">Project Types ({projectTypes.length})</h2>
        <motion.button
          onClick={() => setShowNew(true)}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand hover:bg-ocean text-white text-xs font-semibold transition-colors shadow-sm shadow-brand/25"
        >
          <Plus size={13} /> Add Type
        </motion.button>
      </div>

      <AnimatePresence>
        {showNew && (
          <div className="mb-3">
            <TypeForm initial={defaultForm} onSave={handleCreate} onCancel={() => setShowNew(false)} />
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <AnimatePresence>
          {projectTypes.map((type, i) => (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.04, type: 'spring' as const, stiffness: 400, damping: 28 }}
            >
              {editingId === type.id ? (
                <TypeForm
                  initial={{
                    name: type.name,
                    default_duration_hours: type.default_duration_hours.toString(),
                    color: type.color,
                    default_price: (type.default_price ?? 0).toString(),
                    default_revisions: (type.default_revisions ?? 0).toString(),
                  }}
                  onSave={(data) => handleUpdate(type.id, data)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="glass-sm rounded-2xl px-4 py-3 flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: type.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-navy font-semibold text-sm">{type.name}</p>
                      <span
                        className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                        style={{ background: 'rgba(42,164,231,0.1)', color: '#0A60AD', border: '1px solid rgba(42,164,231,0.2)' }}
                      >
                        {type.default_duration_hours}h default
                      </span>
                    </div>
                    <p className="text-navy/45 text-xs mt-0.5">
                      {(type.default_price ?? 0).toLocaleString('fr-DZ')} DA · {type.default_revisions ?? 0} révision(s) incluse(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <motion.button
                      onClick={() => setEditingId(type.id)}
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      className="p-1.5 rounded-xl text-navy/35 hover:text-navy hover:bg-white/50 transition-colors"
                    >
                      <Pencil size={13} />
                    </motion.button>
                    {confirmDelete === type.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={async () => { await deleteProjectType(type.id); setConfirmDelete(null) }}
                          className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-medium"
                        >
                          Confirm
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 rounded-lg border border-silver text-navy/50 text-xs">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <motion.button
                        onClick={() => setConfirmDelete(type.id)}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        className="p-1.5 rounded-xl text-navy/35 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
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
