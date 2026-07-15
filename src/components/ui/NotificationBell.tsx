'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotifications, notificationText } from '@/lib/use-notifications'

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'à l’instant'
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  return `il y a ${Math.round(hours / 24)}j`
}

// admin/commercial land on the board (no per-project deep link there yet);
// team members go straight to their project page.
function linkFor(projectId: string | undefined, isMemberPortal: boolean): string {
  if (!projectId) return isMemberPortal ? '/me' : '/pipeline'
  return isMemberPortal ? `/me/projects/${projectId}` : '/pipeline'
}

export default function NotificationBell({ isMemberPortal = false }: { isMemberPortal?: boolean }) {
  const { notifications, mentions, unreadCount, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const items = [
    ...notifications.map((n) => ({
      key: `n-${n.id}`,
      text: notificationText(n),
      href: linkFor(n.payload?.projectId as string | undefined, isMemberPortal),
      createdAt: n.created_at,
      read: Boolean(n.read_at),
    })),
    ...mentions.map((m) => ({
      key: `m-${m.id}`,
      text: `${m.senderName} vous a mentionné : ${m.body}`,
      href: linkFor(m.projectId, isMemberPortal),
      createdAt: m.createdAt,
      read: m.read,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        className="relative p-2 rounded-xl text-navy/50 hover:text-navy hover:bg-white/50 transition-colors"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
            className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border border-white/65 z-50"
            style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', boxShadow: '0 12px 40px rgba(10,96,173,0.18)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/50">
              <p className="text-navy font-semibold text-sm">Notifications</p>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[11px] text-brand hover:text-ocean font-medium">
                  Tout marquer comme lu
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="text-navy/35 text-xs text-center py-8">Aucune notification.</p>
            ) : (
              <div className="divide-y divide-white/40">
                {items.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 text-xs hover:bg-brand/5 transition-colors ${!item.read ? 'bg-brand/5' : ''}`}
                  >
                    <p className="text-navy/80 leading-snug">{item.text}</p>
                    <p className="text-navy/35 text-[10px] mt-1">{timeAgo(item.createdAt)}</p>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
