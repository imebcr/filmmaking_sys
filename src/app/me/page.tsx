'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, AlertCircle, CheckCircle2, Calendar } from 'lucide-react'
import type { MemberProjectListItem } from '@/lib/member-types'
import { STAGE_LABELS } from '@/lib/types'
import { formatDate } from '@/lib/utils'

export default function MemberDashboardPage() {
  const [projects, setProjects] = useState<MemberProjectListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [doneRange, setDoneRange] = useState<'week' | 'month'>('week')

  useEffect(() => {
    fetch('/api/member/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .finally(() => setLoading(false))
  }, [])

  const active = projects.filter((p) => p.stage !== 'delivered')
  const rejected = projects.filter((p) => p.isRejected)
  const now = new Date()
  const rangeStart = new Date(now)
  if (doneRange === 'week') rangeStart.setDate(now.getDate() - 7)
  else rangeStart.setMonth(now.getMonth() - 1)
  const done = projects.filter((p) => p.stage === 'delivered' && new Date(p.updated_at) >= rangeStart)

  // Mutually-exclusive groups for the list below: rejected first, then pending validation,
  // then everything else in progress, then completed projects tucked into their own
  // checklist-style section.
  const rejectedList = rejected
  const pendingList = projects.filter((p) => p.stage !== 'delivered' && !p.isRejected && p.isPendingReview)
  const activeList = projects.filter((p) => p.stage !== 'delivered' && !p.isRejected && !p.isPendingReview)
  const completedList = projects.filter((p) => p.stage === 'delivered')

  return (
    <div className="min-h-screen">
      <div className="px-6 py-5 border-b border-white/50 bg-white/20 backdrop-blur-sm">
        <h1 className="text-navy font-bold text-lg">Mon espace</h1>
        <p className="text-navy/45 text-xs mt-0.5">Vos projets Zidny en un coup d’œil</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-navy/35 text-sm">Chargement…</div>
      ) : (
        <div className="p-6 space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 text-navy/50 text-xs font-medium mb-2">
                <Clock size={13} /> File d’attente
              </div>
              <p className="text-navy font-bold text-2xl">{active.length}</p>
            </div>
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 text-navy/50 text-xs font-medium mb-2">
                <AlertCircle size={13} className={rejected.length > 0 ? 'text-red-500' : ''} /> Livraisons rejetées
              </div>
              <p className={`font-bold text-2xl ${rejected.length > 0 ? 'text-red-500' : 'text-navy'}`}>{rejected.length}</p>
            </div>
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-navy/50 text-xs font-medium">
                  <CheckCircle2 size={13} /> Terminés
                </div>
                <div className="flex gap-1 text-[10px]">
                  {(['week', 'month'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setDoneRange(r)}
                      className={`px-2 py-0.5 rounded-full font-semibold transition-colors ${doneRange === r ? 'bg-brand text-white' : 'text-navy/40 hover:text-navy'}`}
                    >
                      {r === 'week' ? 'Semaine' : 'Mois'}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-navy font-bold text-2xl">{done.length}</p>
            </div>
          </div>

          {/* Project list — rejected first, then everything in progress, completed tucked below */}
          {projects.length === 0 ? (
            <section>
              <h2 className="text-navy font-semibold mb-3">Mes projets</h2>
              <p className="text-navy/40 text-sm glass-sm rounded-2xl p-6 text-center">Aucun projet assigné pour le moment.</p>
            </section>
          ) : (
            <>
              {rejectedList.length > 0 && (
                <section>
                  <h2 className="text-navy font-semibold mb-3">Rejetés — à reprendre</h2>
                  <div className="space-y-2">
                    {rejectedList.map((p, i) => <ProjectRow key={p.id} p={p} delay={i * 0.03} />)}
                  </div>
                </section>
              )}

              {pendingList.length > 0 && (
                <section>
                  <h2 className="text-navy font-semibold mb-3">En attente de validation</h2>
                  <div className="space-y-2">
                    {pendingList.map((p, i) => <ProjectRow key={p.id} p={p} delay={i * 0.03} />)}
                  </div>
                </section>
              )}

              {activeList.length > 0 && (
                <section>
                  <h2 className="text-navy font-semibold mb-3">En cours</h2>
                  <div className="space-y-2">
                    {activeList.map((p, i) => <ProjectRow key={p.id} p={p} delay={i * 0.03} />)}
                  </div>
                </section>
              )}

              {completedList.length > 0 && (
                <section>
                  <h2 className="text-navy font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-500" /> Terminés ({completedList.length})
                  </h2>
                  <div className="space-y-1.5">
                    {completedList.map((p) => (
                      <Link key={p.id} href={`/me/projects/${p.id}`}>
                        <div className="glass-sm rounded-xl px-4 py-2.5 flex items-center gap-3 hover:bg-white/50 transition-colors opacity-70">
                          <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                          <span className="flex-1 min-w-0 truncate text-navy text-sm">{p.client_name}</span>
                          {p.project_type && (
                            <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 shrink-0" style={{ background: p.project_type.color + '18', color: p.project_type.color, border: `1px solid ${p.project_type.color}35` }}>
                              {p.project_type.name}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ProjectRow({ p, delay }: { p: MemberProjectListItem; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Link href={`/me/projects/${p.id}`}>
        <div className={`glass-sm rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-white/50 transition-colors ${p.isRejected ? 'border-l-4 border-l-red-400' : p.isPendingReview ? 'border-l-4 border-l-amber-400' : ''}`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-navy font-semibold text-sm">{p.client_name}</p>
              {p.project_type && (
                <span className="text-[10px] font-semibold rounded-full px-2 py-0.5" style={{ background: p.project_type.color + '18', color: p.project_type.color, border: `1px solid ${p.project_type.color}35` }}>
                  {p.project_type.name}
                </span>
              )}
              {p.isRejected && (
                <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-red-50 text-red-600 border border-red-200">Rejeté — à reprendre</span>
              )}
              {!p.isRejected && p.isPendingReview && (
                <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200">En attente de validation</span>
              )}
            </div>
            {p.description && <p className="text-navy/50 text-xs mt-1 line-clamp-1">{p.description}</p>}
            <div className="flex items-center gap-3 mt-1 text-navy/45 text-xs">
              <span>{STAGE_LABELS[p.stage]}</span>
              {p.deadline && (
                <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(p.deadline)}</span>
              )}
            </div>
          </div>
          <div className="w-16 shrink-0">
            <div className="h-1.5 rounded-full bg-navy/10 overflow-hidden">
              <div className="h-full bg-brand rounded-full" style={{ width: `${p.percentComplete}%` }} />
            </div>
            <p className="text-navy/35 text-[10px] text-right mt-1">{p.percentComplete}%</p>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
