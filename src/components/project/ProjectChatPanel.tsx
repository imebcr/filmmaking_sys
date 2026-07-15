'use client'

import { useState, useRef, useEffect } from 'react'
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
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

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
    <section>
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
            messages.map((m) => (
              <div key={m.id} className="text-xs">
                <div className="flex items-baseline gap-2">
                  <span className="text-navy font-semibold">{m.senderName}</span>
                  <span className="text-navy/35 text-[10px]">{formatTime(m.createdAt)}</span>
                </div>
                <p className="text-navy/75 mt-0.5 break-words">{renderBody(m.body, participants)}</p>
              </div>
            ))
          )}
        </div>

        <div className="relative border-t border-white/50 p-2 flex items-center gap-2">
          {mentionCandidates.length > 0 && (
            <div className="absolute bottom-full left-2 mb-1 w-56 max-h-40 overflow-y-auto rounded-xl border border-white/65 z-10"
              style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(10,96,173,0.15)' }}
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
            </div>
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
