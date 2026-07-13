'use client'

import { LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
import Modal from './Modal'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function LogoutConfirmModal({ open, onClose, onConfirm }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Déconnexion" size="sm">
      <div className="space-y-4">
        <p className="text-navy/60 text-sm">Voulez-vous vraiment vous déconnecter ?</p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-silver text-navy/50 hover:text-navy hover:bg-white/50 text-sm transition-colors"
          >
            Annuler
          </button>
          <motion.button
            onClick={onConfirm}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
          >
            <LogOut size={14} /> Se déconnecter
          </motion.button>
        </div>
      </div>
    </Modal>
  )
}
