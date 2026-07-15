'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { user, signIn, requestPasswordReset } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'forgot'>('signin')
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    if (user) router.replace('/dashboard')
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = await signIn(email.trim(), password)
    if (err) {
      setError('Invalid email or password.')
      setLoading(false)
    } else {
      router.replace('/dashboard')
    }
  }

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const err = await requestPasswordReset(email.trim())
    setLoading(false)
    if (err) setError(err)
    else setResetSent(true)
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
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.png"
              alt="Zidny"
              width={120}
              height={44}
              className="object-contain"
              style={{ height: 'auto' }}
              priority
            />
          </div>

          {mode === 'signin' ? (
            <>
              <h1 className="text-navy font-bold text-xl text-center mb-1">Welcome back</h1>
              <p className="text-navy/45 text-sm text-center mb-7">Sign in to your agency dashboard</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-navy/50 text-xs mb-1.5 font-medium">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-navy/50 text-xs mb-1.5 font-medium">Password</label>
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
                  {loading ? 'Signing in…' : 'Sign In'}
                </motion.button>
              </form>

              <button
                onClick={() => { setMode('forgot'); setError(null); setResetSent(false) }}
                className="block w-full text-center text-navy/45 hover:text-brand text-xs mt-5 transition-colors"
              >
                Forgot password?
              </button>
            </>
          ) : (
            <>
              <h1 className="text-navy font-bold text-xl text-center mb-1">Reset password</h1>
              <p className="text-navy/45 text-sm text-center mb-7">We’ll email you a link to set a new password</p>

              {resetSent ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm text-center">
                  Check your inbox — if that email has an account, a reset link is on its way.
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-navy/50 text-xs mb-1.5 font-medium">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
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
                    disabled={loading || !email}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2.5 rounded-xl bg-brand hover:bg-ocean text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-brand/25 mt-2"
                  >
                    {loading ? 'Sending…' : 'Send reset link'}
                  </motion.button>
                </form>
              )}

              <button
                onClick={() => { setMode('signin'); setError(null) }}
                className="block w-full text-center text-navy/45 hover:text-brand text-xs mt-5 transition-colors"
              >
                Back to sign in
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
