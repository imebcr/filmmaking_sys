'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { useAdminIdentity } from '@/lib/use-admin-identity'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { authenticated, loading } = useAdminIdentity()

  useEffect(() => {
    if (!loading && !authenticated) router.replace('/login')
  }, [authenticated, loading, router])

  if (loading || !authenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #E9FCFF 0%, #A9EFFB 45%, #E8EBEF 100%)' }}
      >
        <div className="blob blob-1" aria-hidden />
        <div className="blob blob-2" aria-hidden />
        <div className="blob blob-3" aria-hidden />
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="relative z-10 text-brand font-semibold text-sm"
        >
          Loading…
        </motion.div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #E9FCFF 0%, #A9EFFB 45%, #E8EBEF 100%)' }}
    >
      <div className="blob blob-1" aria-hidden />
      <div className="blob blob-2" aria-hidden />
      <div className="blob blob-3" aria-hidden />

      <Sidebar />
      <BottomNav />

      <main className="relative z-10 lg:pl-56 pb-16 lg:pb-0 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
