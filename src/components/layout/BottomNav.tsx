'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Kanban, Calendar, Settings, LayoutDashboard, Table2, User, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAdminIdentity } from '@/lib/use-admin-identity'
import LogoutConfirmModal from '@/components/ui/LogoutConfirmModal'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/projects', label: 'Projets', icon: Table2 },
  { href: '/availability', label: 'Avail.', icon: Calendar },
  { href: '/profile', label: 'Profil', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
]

// The desktop sidebar's "Sign Out" button lives inside a `hidden lg:flex` container, so it
// never existed on mobile at all — this bottom nav needs its own, since it's the only nav
// mobile actually sees.
export default function BottomNav() {
  const pathname = usePathname()
  const { isAdmin, signOut } = useAdminIdentity()
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const visibleLinks = links.filter((l) => isAdmin || !l.adminOnly)
  const columns = visibleLinks.length + 1

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 glass-nav">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {visibleLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-1 py-3 relative">
                {active && (
                  <motion.div
                    layoutId="bottom-active"
                    className="absolute inset-x-2 inset-y-1 rounded-xl bg-brand/12"
                    transition={{ type: 'spring' as const, stiffness: 500, damping: 35 }}
                  />
                )}
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className={cn(
                    'relative flex flex-col items-center gap-1 transition-colors',
                    active ? 'text-brand' : 'text-navy/45',
                  )}
                >
                  <Icon size={18} />
                  <span className="text-[9px] font-medium">{label}</span>
                </motion.div>
              </Link>
            )
          })}
          <button type="button" onClick={() => setConfirmingLogout(true)} className="flex flex-col items-center gap-1 py-3 relative">
            <motion.div whileTap={{ scale: 0.85 }} className="relative flex flex-col items-center gap-1 text-navy/45">
              <LogOut size={18} />
              <span className="text-[9px] font-medium">Sign Out</span>
            </motion.div>
          </button>
        </div>
      </nav>

      <LogoutConfirmModal
        open={confirmingLogout}
        onClose={() => setConfirmingLogout(false)}
        onConfirm={signOut}
      />
    </>
  )
}
