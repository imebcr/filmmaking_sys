'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { adminFetch } from '@/lib/admin-fetch'
import type { Notification } from '@/lib/types'

export interface MentionItem {
  id: string
  projectId: string
  senderName: string
  body: string
  createdAt: string
  read: boolean
}

interface State {
  notifications: Notification[]
  mentions: MentionItem[]
  unreadCount: number
  loading: boolean
}

const EVENT_LABELS: Record<string, (payload: Record<string, unknown>) => string> = {
  project_assigned: (p) => `Nouveau projet assigné : ${p.projectName}`,
  project_reassigned: (p) => (p.isNewAssignee ? `Projet assigné : ${p.projectName}` : `Retiré du projet : ${p.projectName}`),
  deadline_24h: (p) => `Échéance dans moins de 24h : ${p.projectName}`,
  deliverable_submitted: (p) => `${p.memberName ?? 'Un membre'} a soumis un livrable pour ${p.projectName}`,
  deliverable_validated: (p) => `Livraison validée pour ${p.projectName}`,
  deliverable_rejected: (p) => `Livraison rejetée pour ${p.projectName}`,
}

export function notificationText(n: Notification): string {
  const fn = EVENT_LABELS[n.event_type]
  return fn ? fn(n.payload) : n.event_type
}

async function chatFetch(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const sep = path.includes('?') ? '&' : '?'
  const url = token ? `${path}${sep}supabase_token=${encodeURIComponent(token)}` : path
  return fetch(url, init)
}

export function useNotifications() {
  const [state, setState] = useState<State>({ notifications: [], mentions: [], unreadCount: 0, loading: true })

  const load = useCallback(async () => {
    const [notifRes, mentionRes] = await Promise.all([
      adminFetch('/api/notifications').then((r) => r.json()).catch(() => ({ notifications: [], unreadCount: 0 })),
      chatFetch('/ws/chat/mentions').then((r) => r.json()).catch(() => ({ mentions: [] })),
    ])
    const notifications: Notification[] = notifRes.notifications ?? []
    const mentions: MentionItem[] = mentionRes.mentions ?? []
    const unreadCount = (notifRes.unreadCount ?? 0) + mentions.filter((m) => !m.read).length
    setState({ notifications, mentions, unreadCount, loading: false })
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  const markAllRead = useCallback(async () => {
    setState((s) => ({ ...s, unreadCount: 0, mentions: s.mentions.map((m) => ({ ...m, read: true })) }))
    await Promise.all([
      adminFetch('/api/notifications/read', { method: 'POST' }),
      chatFetch('/ws/chat/mentions/read', { method: 'POST' }),
    ])
  }, [])

  return { ...state, markAllRead, refresh: load }
}
