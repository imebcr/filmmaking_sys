'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export default function ResetAdminPasswordPage() {
  const { updatePassword } = useAuth()
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // The recovery link may have already been processed before this listener attached.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    const timeout = setTimeout(() => setExpired(true), 5000)
    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    setLoading(true)
    const err = await updatePassword(password)
    setLoading(false)
    if (err) setError(err)
    else setSuccess(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #E9FCFF 0%, #A9EFFB 45%, #E8EBEF 100%)' }}>
      <div className="blob blob-1" aria-hidden />
      <div className="blob blob-2" aria-hidden />
      <div className="blob blob-3" aria-hidden />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass rounded-3xl p-8 shadow-xl shadow-brand/10 space-y-6">
          <div>
            <p className="text-navy/50 text-xs font-medium uppercase tracking-wider">Réinitialisation</p>
            <h1 className="text-navy font-bold text-2xl mt-2">Nouveau mot de passe</h1>
            <p className="text-navy/45 text-sm mt-1">Définissez un nouveau mot de passe pour votre compte admin.</p>
          </div>

          {success ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 text-sm font-medium">
                <CheckCircle2 size={16} />
                Mot de passe mis à jour.
              </div>
              <Link href="/login" className="block text-center text-brand text-sm font-semibold hover:text-ocean transition-colors">
                Retour à la connexion
              </Link>
            </div>
          ) : expired && !ready ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm font-medium">
                <AlertCircle size={16} />
                Ce lien est invalide ou a expiré. Demandez-en un nouveau depuis la page de connexion.
              </div>
              <Link href="/login" className="block text-center text-brand text-sm font-semibold hover:text-ocean transition-colors">
                Retour à la connexion
              </Link>
            </div>
          ) : !ready ? (
            <p className="text-navy/40 text-sm text-center py-4">Vérification du lien…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-navy/50 text-xs mb-1.5 font-medium">Nouveau mot de passe</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Au moins 8 caractères" required />
              </div>
              <div>
                <label className="block text-navy/50 text-xs mb-1.5 font-medium">Confirmer le mot de passe</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Répétez le mot de passe" required />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm font-medium">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 rounded-xl bg-brand hover:bg-ocean text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-brand/25"
              >
                {loading ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
              </motion.button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
