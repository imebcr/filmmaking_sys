'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Calendar, User, LogOut, Kanban } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession, signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import LogoutConfirmModal from '@/components/ui/LogoutConfirmModal'
import NotificationBell from '@/components/ui/NotificationBell'

const links = [
  { href: '/me', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/me/kanban', label: 'Kanban', icon: Kanban, exact: false },
  { href: '/me/calendar', label: 'Calendrier', icon: Calendar, exact: false },
  { href: '/me/profile', label: 'Profil', icon: User, exact: false },
]

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { status } = useSession()
  const [confirmingLogout, setConfirmingLogout] = useState(false)

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E9FCFF 0%, #A9EFFB 45%, #E8EBEF 100%)' }}>
        <div className="blob blob-1" aria-hidden />
        <div className="blob blob-2" aria-hidden />
        <div className="blob blob-3" aria-hidden />
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} className="relative z-10 text-brand font-semibold text-sm">
          Chargement…
        </motion.div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.replace('/member-login')
    return null
  }

  const isActive = (href: string, exact: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + '/'))

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #E9FCFF 0%, #A9EFFB 45%, #E8EBEF 100%)' }}>
      <div className="blob blob-1" aria-hidden />
      <div className="blob blob-2" aria-hidden />
      <div className="blob blob-3" aria-hidden />

      <aside className="hidden lg:flex flex-col w-56 min-h-screen glass-sidebar fixed left-0 top-0 bottom-0 z-30">
        <div className="px-5 py-5 border-b border-white/40">
          <div className="flex items-center justify-between h-9">
            <Image src="/logo.png" alt="Zidny" width={96} height={36} className="object-contain object-left" style={{ height: 'auto' }} priority />
            <NotificationBell isMemberPortal />
          </div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {links.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active ? 'bg-brand/15 text-brand border border-brand/25 shadow-sm shadow-brand/10' : 'text-navy/55 hover:text-navy hover:bg-white/50',
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="px-3 py-4 border-t border-white/40 space-y-3">
          <div className="px-2">
            <p className="text-navy/35 text-[10px] font-medium">Espace membre Zidny</p>
          </div>
          <button
            onClick={() => setConfirmingLogout(true)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-navy/45 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} />
            Déconnexion
          </button>
        </div>
      </aside>

      <LogoutConfirmModal
        open={confirmingLogout}
        onClose={() => setConfirmingLogout(false)}
        onConfirm={() => signOut({ callbackUrl: '/member-login' })}
      />

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 glass-nav">
        <div className="grid grid-cols-4">
          {links.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact)
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-1 py-3 relative">
                {active && (
                  <motion.div layoutId="member-bottom-active" className="absolute inset-x-2 inset-y-1 rounded-xl bg-brand/12" transition={{ type: 'spring' as const, stiffness: 500, damping: 35 }} />
                )}
                <div className={cn('relative flex flex-col items-center gap-1', active ? 'text-brand' : 'text-navy/45')}>
                  <Icon size={18} />
                  <span className="text-[9px] font-medium">{label}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </nav>

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
