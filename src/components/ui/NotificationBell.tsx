'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotifications, notificationText } from '@/lib/use-notifications'
import { useAdminIdentity } from '@/lib/use-admin-identity'

const PANEL_WIDTH = 320

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'à l’instant'
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  return `il y a ${Math.round(hours / 24)}j`
}

// team members go straight to their project page; admin/commercial deep-link into
// the board which opens that project's modal (see Pipeline's ?project= handling).
// `chat` additionally scrolls straight to the discussion (used for @mentions).
function linkFor(projectId: string | undefined, isMemberPortal: boolean, chat = false): string {
  if (!projectId) return isMemberPortal ? '/me' : '/pipeline'
  if (isMemberPortal) return chat ? `/me/projects/${projectId}#chat` : `/me/projects/${projectId}`
  return chat ? `/pipeline?project=${projectId}&chat=1` : `/pipeline?project=${projectId}`
}

export default function NotificationBell({ isMemberPortal = false }: { isMemberPortal?: boolean }) {
  const { isCommercial } = useAdminIdentity()
  const { notifications, mentions, unreadCount, markAllRead } = useNotifications({ isMemberPortal, isCommercial })
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const updatePosition = () => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (!r) return
    // Right-align to the bell, but never let it run off either edge of the viewport
    // (the bell lives in a narrow 224px sidebar — a naive right:0 anchor pushed the
    // 320px panel off the left edge of the screen entirely).
    const left = Math.min(Math.max(8, r.right - PANEL_WIDTH), window.innerWidth - PANEL_WIDTH - 8)
    setRect({ top: r.bottom + 8, left })
  }

  useLayoutEffect(() => {
    if (open) updatePosition()
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
        && panelRef.current && !panelRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    const handleReposition = () => updatePosition()
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
  }, [open])

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
      // Members only ever see actual @mentions here; admin/commercial see every message
      // in their projects too, so "mentioned you" wouldn't always be accurate for them.
      text: `${m.senderName} : ${m.body}`,
      href: linkFor(m.projectId, isMemberPortal, true),
      createdAt: m.createdAt,
      read: m.read,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl text-navy/50 hover:text-navy hover:bg-white/50 transition-colors"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
              className="fixed z-[9999] rounded-2xl border border-white/65 flex flex-col"
              style={{
                top: rect.top, left: rect.left, width: PANEL_WIDTH, maxHeight: 420,
                background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 12px 40px rgba(10,96,173,0.18)',
              }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/50 shrink-0">
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
                <div className="overflow-y-auto flex-1 divide-y divide-white/40">
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
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
