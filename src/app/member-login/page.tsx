'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { signIn, useSession, getSession } from 'next-auth/react'

// Commercials get scoped admin-console access (Dashboard/Pipeline/Availability) instead
// of the member portal — everyone else lands on /me.
function destinationFor(roles: string[] | undefined): string {
  return roles?.includes('commercial') ? '/dashboard' : '/me'
}

export default function MemberLoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session) router.replace(destinationFor(session.user?.roles))
  }, [status, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await signIn('credentials', {
      email: email.trim(),
      password,
      redirect: false,
    })
    if (result?.error) {
      setError('E-mail ou mot de passe incorrect.')
      setLoading(false)
    } else {
      const freshSession = await getSession()
      router.replace(destinationFor(freshSession?.user?.roles))
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #E9FCFF 0%, #A9EFFB 45%, #E8EBEF 100%)' }}
    >
      <div className="blob blob-1" aria-hidden />
      <div className="blob blob-2" aria-hidden />
      <div className="blob blob-3" aria-hidden />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring' as const, stiffness: 340, damping: 28 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="glass rounded-3xl p-8 shadow-xl shadow-brand/10">
          <div className="flex justify-center mb-8">
            <Image src="/logo.png" alt="Zidny" width={120} height={44} className="object-contain" style={{ height: 'auto' }} priority />
          </div>

          <h1 className="text-navy font-bold text-xl text-center mb-1">Espace membre</h1>
          <p className="text-navy/45 text-sm text-center mb-7">Connectez-vous à votre espace Zidny</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-navy/50 text-xs mb-1.5 font-medium">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-navy/50 text-xs mb-1.5 font-medium">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5"
              >
                <AlertCircle size={13} className="text-red-500 shrink-0" />
                <p className="text-red-600 text-xs font-medium">{error}</p>
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading || !email || !password}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 rounded-xl bg-brand hover:bg-ocean text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-brand/25 mt-2"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </motion.button>
          </form>

          <Link
            href="/reset-password"
            className="block text-center text-navy/45 hover:text-brand text-xs mt-5 transition-colors"
          >
            Mot de passe oublié ?
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
