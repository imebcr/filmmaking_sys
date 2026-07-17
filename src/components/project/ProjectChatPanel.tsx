'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Send, MessageCircle } from 'lucide-react'
import { useProjectChat } from '@/lib/use-project-chat'

interface Participant {
  id: string
  name: string
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })
}

function formatDayLabel(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(date, today)) return "Aujourd'hui"
  if (sameDay(date, yesterday)) return 'Hier'
  return date.toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
}

// Renders "@Full Name" tokens in a message body as highlighted mentions.
function renderBody(body: string, participants: Participant[]) {
  if (participants.length === 0) return body
  const sorted = [...participants].sort((a, b) => b.name.length - a.name.length)
  const pattern = new RegExp(`(@(?:${sorted.map((p) => p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}))`, 'g')
  const parts = body.split(pattern)
  return parts.map((part, i) =>
    part.startsWith('@') && sorted.some((p) => `@${p.name}` === part)
      ? <span key={i} className="text-brand font-semibold">{part}</span>
      : <span key={i}>{part}</span>,
  )
}

export default function ProjectChatPanel({ projectId, participants }: { projectId: string; participants: Participant[] }) {
  const { messages, connected, error, sendMessage } = useProjectChat(projectId)
  const [draft, setDraft] = useState('')
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionRect, setMentionRect] = useState<{ bottom: number; left: number; width: number } | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputRowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  // Portaled to <body> — this popup lives inside ProjectDetailModal's scrollable body,
  // whose overflow-y-auto clips any `position: absolute` descendant that extends past it.
  useLayoutEffect(() => {
    if (mentionQuery === null) return
    const r = inputRowRef.current?.getBoundingClientRect()
    if (r) setMentionRect({ bottom: window.innerHeight - r.top + 4, left: r.left, width: Math.min(224, r.width) })
  }, [mentionQuery])

  const handleDraftChange = (value: string) => {
    setDraft(value)
    const cursor = inputRef.current?.selectionStart ?? value.length
    const upToCursor = value.slice(0, cursor)
    const at = upToCursor.lastIndexOf('@')
    if (at !== -1 && !/\s/.test(upToCursor.slice(at + 1))) {
      setMentionQuery(upToCursor.slice(at + 1))
    } else {
      setMentionQuery(null)
    }
  }

  const insertMention = (name: string) => {
    const cursor = inputRef.current?.selectionStart ?? draft.length
    const upToCursor = draft.slice(0, cursor)
    const at = upToCursor.lastIndexOf('@')
    const before = draft.slice(0, at)
    const after = draft.slice(cursor)
    const next = `${before}@${name} ${after}`
    setDraft(next)
    setMentionQuery(null)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const handleSend = () => {
    const body = draft.trim()
    if (!body) return
    sendMessage(body)
    setDraft('')
    setMentionQuery(null)
  }

  const mentionCandidates = mentionQuery !== null
    ? participants.filter((p) => p.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : []

  return (
    <section id="chat">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-navy/40 uppercase tracking-wider flex items-center gap-1.5">
          <MessageCircle size={13} /> Discussion
        </h3>
        <span className={`text-[10px] font-medium ${connected ? 'text-emerald-600' : 'text-navy/35'}`}>
          {connected ? 'En ligne' : 'Connexion…'}
        </span>
      </div>

      {error && <p className="text-red-500 text-xs font-medium mb-2">{error}</p>}

      <div className="glass-sm rounded-xl overflow-hidden">
        <div ref={listRef} className="max-h-72 overflow-y-auto p-3 space-y-2.5">
          {messages.length === 0 ? (
            <p className="text-navy/35 text-xs text-center py-6">Aucun message pour le moment.</p>
          ) : (
            messages.map((m, i) => {
              const prev = messages[i - 1]
              const showDayDivider = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()
              return (
                <div key={m.id}>
                  {showDayDivider && (
                    <div className="flex items-center gap-2 my-2 first:mt-0">
                      <div className="flex-1 h-px bg-navy/10" />
                      <span className="text-navy/35 text-[10px] font-medium shrink-0">{formatDayLabel(m.createdAt)}</span>
                      <div className="flex-1 h-px bg-navy/10" />
                    </div>
                  )}
                  <div className="text-xs">
                    <div className="flex items-baseline gap-2">
                      <span className="text-navy font-semibold">{m.senderName}</span>
                      <span className="text-navy/35 text-[10px]">{formatTime(m.createdAt)}</span>
                    </div>
                    <p className="text-navy/75 mt-0.5 break-words">{renderBody(m.body, participants)}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div ref={inputRowRef} className="relative border-t border-white/50 p-2 flex items-center gap-2">
          {mentionCandidates.length > 0 && mentionRect && typeof document !== 'undefined' && createPortal(
            <div
              className="fixed z-[9999] max-h-40 overflow-y-auto rounded-xl border border-white/65"
              style={{
                bottom: mentionRect.bottom, left: mentionRect.left, width: mentionRect.width,
                background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(10,96,173,0.15)',
              }}
            >
              {mentionCandidates.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => insertMention(p.name)}
                  className="w-full text-left px-3 py-2 text-xs text-navy hover:bg-brand/10 transition-colors"
                >
                  @{p.name}
                </button>
              ))}
            </div>,
            document.body,
          )}
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && mentionCandidates.length === 0) { e.preventDefault(); handleSend() } }}
            placeholder="Écrire un message… (@ pour mentionner)"
            className="text-xs flex-1"
          />
          <motion.button
            onClick={handleSend}
            disabled={!draft.trim()}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="p-2 rounded-xl bg-brand hover:bg-ocean text-white disabled:opacity-40 transition-colors shrink-0"
          >
            <Send size={13} />
          </motion.button>
        </div>
      </div>
    </section>
  )
}
