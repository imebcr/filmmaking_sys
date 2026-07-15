'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface ChatMessage {
  id: string
  projectId: string
  senderId: string | null
  senderName: string
  body: string
  mentions: string[]
  createdAt: string
}

interface ChatState {
  messages: ChatMessage[]
  connected: boolean
  error: string | null
}

// Chat runs on its own WebSocket server (chat-server/), independent of Supabase —
// nginx proxies /ws/chat to it. Auth: the NextAuth session cookie rides along with
// the WS upgrade request automatically; admin (Supabase Auth, no cookie for this)
// passes its access token explicitly via the connection URL.
export function useProjectChat(projectId: string | null) {
  const [state, setState] = useState<ChatState>({ messages: [], connected: false, error: null })
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false

    const connect = async () => {
      const { data } = await supabase.auth.getSession()
      const supabaseToken = data.session?.access_token
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const url = `${protocol}//${window.location.host}/ws/chat${supabaseToken ? `?supabase_token=${encodeURIComponent(supabaseToken)}` : ''}`

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (cancelled) return
        ws.send(JSON.stringify({ type: 'join', projectId }))
        setState((s) => ({ ...s, connected: true, error: null }))
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'history') {
          setState((s) => ({ ...s, messages: data.messages }))
        } else if (data.type === 'message') {
          setState((s) => ({ ...s, messages: [...s.messages, data.message] }))
        } else if (data.type === 'error') {
          setState((s) => ({ ...s, error: data.error }))
        }
      }

      ws.onclose = () => {
        if (cancelled) return
        setState((s) => ({ ...s, connected: false }))
        reconnectTimer.current = setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [projectId])

  const sendMessage = useCallback((body: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', body }))
    }
  }, [])

  return { ...state, sendMessage }
}
