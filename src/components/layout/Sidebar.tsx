'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Kanban, Calendar, Settings, LayoutDashboard, LogOut, Table2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAdminIdentity } from '@/lib/use-admin-identity'
import LogoutConfirmModal from '@/components/ui/LogoutConfirmModal'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/projects', label: 'Projets', icon: Table2 },
  { href: '/availability', label: 'Availability', icon: Calendar },
  { href: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
]

const navVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}
const linkVariant = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 28 } },
}

export default function Sidebar() {
  const pathname = usePathname()
  const { isAdmin, signOut } = useAdminIdentity()
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const visibleLinks = links.filter((l) => isAdmin || !l.adminOnly)

  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen glass-sidebar fixed left-0 top-0 bottom-0 z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/40">
        <div className="flex items-center h-9">
          <Image
            src="/logo.png"
            alt="Zidny"
            width={96}
            height={36}
            className="object-contain object-left"
            style={{ height: 'auto' }}
            priority
          />
        </div>
      </div>

      {/* Nav */}
      <motion.nav
        className="flex-1 py-4 px-3 space-y-1"
        variants={navVariants}
        initial="hidden"
        animate="show"
      >
        {visibleLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <motion.div key={href} variants={linkVariant} whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}>
              <Link
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-brand/15 text-brand border border-brand/25 shadow-sm shadow-brand/10'
                    : 'text-navy/55 hover:text-navy hover:bg-white/50',
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            </motion.div>
          )
        })}
      </motion.nav>

      <div className="px-3 py-4 border-t border-white/40 space-y-3">
        <div className="px-2">
          <p className="text-navy/35 text-[10px] font-medium">Zidny Agency</p>
          <p className="text-navy/25 text-[10px]">V1.0</p>
        </div>
        <motion.button
          onClick={() => setConfirmingLogout(true)}
          whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-navy/45 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={15} />
          Sign Out
        </motion.button>
      </div>

      <LogoutConfirmModal
        open={confirmingLogout}
        onClose={() => setConfirmingLogout(false)}
        onConfirm={signOut}
      />
    </aside>
  )
}
