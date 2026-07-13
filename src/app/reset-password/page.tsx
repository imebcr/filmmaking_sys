'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const mode = useMemo(() => (token ? 'confirm' : 'request'), [token])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (mode === 'confirm' && !token) {
      setError('Le lien de réinitialisation est incomplet.')
    }
  }, [mode, token])

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const response = await fetch('/api/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result?.error ?? 'Impossible d’envoyer le lien.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const response = await fetch('/api/password-reset/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password, confirmPassword }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result?.error ?? 'Impossible de mettre à jour le mot de passe.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
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
            <h1 className="text-navy font-bold text-2xl mt-2">{mode === 'confirm' ? 'Nouveau mot de passe' : 'Recevoir un lien de réinitialisation'}</h1>
            <p className="text-navy/45 text-sm mt-1">{mode === 'confirm' ? 'Définissez un nouveau mot de passe pour votre compte Zidny.' : 'Saisissez votre adresse e-mail pour recevoir un lien sécurisé.'}</p>
          </div>

          {success ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 text-sm font-medium">
                <CheckCircle2 size={16} />
                Action effectuée.
              </div>
              <Link href="/member-login" className="block text-center text-brand text-sm font-semibold hover:text-ocean transition-colors">
                Retour à la connexion
              </Link>
            </div>
          ) : mode === 'confirm' ? (
            <form onSubmit={handleConfirm} className="space-y-4">
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
                disabled={loading || !token}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 rounded-xl bg-brand hover:bg-ocean text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-brand/25"
              >
                {loading ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="block text-navy/50 text-xs mb-1.5 font-medium">E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" required autoComplete="email" />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm font-medium">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              <motion.button
                type="submit"
                disabled={loading || !email}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 rounded-xl bg-brand hover:bg-ocean text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-brand/25"
              >
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </motion.button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}