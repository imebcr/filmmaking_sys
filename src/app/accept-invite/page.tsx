'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteForm />
    </Suspense>
  )
}

function AcceptInviteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Le lien d’invitation est incomplet.')
    }
  }, [token])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const response = await fetch('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        password,
        confirmPassword,
        cguAccepted: accepted,
      }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result?.error ?? 'Impossible d’activer le compte.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.replace('/member-login'), 1200)
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
            <p className="text-navy/50 text-xs font-medium uppercase tracking-wider">Activation du compte</p>
            <h1 className="text-navy font-bold text-2xl mt-2">Définissez votre mot de passe</h1>
            <p className="text-navy/45 text-sm mt-1">Validez vos CGU internes puis activez votre espace Zidny.</p>
          </div>

          {success ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 text-sm font-medium">
              <CheckCircle2 size={16} />
              Compte activé. Redirection vers la connexion…
            </div>
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

              <label className="flex items-start gap-2 rounded-2xl border border-white/60 bg-white/35 p-4 text-sm text-navy/70">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-silver text-brand focus:ring-brand" />
                <span>J’accepte les CGU internes de Zidny et j’autorise la création de mon compte.</span>
              </label>

              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 text-sm font-medium">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <motion.button
                type="submit"
                disabled={loading || !token || !accepted}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2.5 rounded-xl bg-brand hover:bg-ocean text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-brand/25"
              >
                {loading ? 'Activation…' : 'Activer mon compte'}
              </motion.button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}