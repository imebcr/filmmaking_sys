'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calendar } from 'lucide-react'
import type { MemberProjectListItem } from '@/lib/member-types'
import { STAGES, STAGE_LABELS } from '@/lib/types'
import { formatDate } from '@/lib/utils'

const STAGE_COLORS: Record<string, { dot: string; border: string; label: string }> = {
  incoming:       { dot: '#6B7280', border: 'rgba(107,114,128,0.3)', label: 'rgba(107,114,128,0.12)' },
  'pre-production': { dot: '#3B82F6', border: 'rgba(59,130,246,0.3)', label: 'rgba(59,130,246,0.12)' },
  shooting:       { dot: '#F59E0B', border: 'rgba(245,158,11,0.3)', label: 'rgba(245,158,11,0.12)' },
  editing:        { dot: '#8B5CF6', border: 'rgba(139,92,246,0.3)', label: 'rgba(139,92,246,0.12)' },
  delivered:      { dot: '#10B981', border: 'rgba(16,185,129,0.3)', label: 'rgba(16,185,129,0.12)' },
}

export default function MemberKanbanPage() {
  const [projects, setProjects] = useState<MemberProjectListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/member/projects').then((r) => r.json()).then((d) => setProjects(d.projects ?? [])).finally(() => setLoading(false))
  }, [])

  const byStage = (stage: string) => projects.filter((p) => p.stage === stage)

  return (
    <div className="min-h-screen">
      <div className="px-6 py-5 border-b border-white/50 bg-white/20 backdrop-blur-sm">
        <h1 className="text-navy font-bold text-lg">Kanban</h1>
        <p className="text-navy/45 text-xs mt-0.5">Suivi de vos projets, étape par étape (lecture seule)</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-navy/35 text-sm">Chargement…</div>
      ) : (
        <div className="flex gap-5 overflow-x-auto px-6 py-6 items-start">
          {STAGES.map((stage) => {
            const colors = STAGE_COLORS[stage]
            const stageProjects = byStage(stage)
            return (
              <div key={stage} className="flex flex-col w-72 shrink-0">
                <div className="mb-3 px-1 pb-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.dot }} />
                    <span className="text-navy font-semibold text-sm">{STAGE_LABELS[stage]}</span>
                    <span className="text-xs font-semibold rounded-full px-2 py-0.5" style={{ backgroundColor: colors.label, color: colors.dot }}>
                      {stageProjects.length}
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-h-[200px] rounded-2xl p-2 bg-white/15 space-y-2.5">
                  {stageProjects.map((p) => (
                    <Link key={p.id} href={`/me/projects/${p.id}`}>
                      <motion.div
                        whileHover={{ y: -3, scale: 1.015 }}
                        className={`glass-sm rounded-2xl p-3.5 ${p.isRejected ? 'border-l-4 border-l-red-400' : ''}`}
                      >
                        <p className="text-navy font-semibold text-sm truncate mb-1.5">{p.client_name}</p>
                        {p.project_type && (
                          <span
                            className="text-[9px] font-semibold rounded-full px-2 py-0.5 inline-block mb-1.5"
                            style={{ background: p.project_type.color + '18', color: p.project_type.color, border: `1px solid ${p.project_type.color}35` }}
                          >
                            {p.project_type.name}
                          </span>
                        )}
                        {p.description && (
                          <p className="text-navy/50 text-[11px] mb-1.5 line-clamp-2">{p.description}</p>
                        )}
                        {p.deadline && (
                          <div className="flex items-center gap-1 text-navy/45 text-[11px]">
                            <Calendar size={10} /> {formatDate(p.deadline)}
                          </div>
                        )}
                      </motion.div>
                    </Link>
                  ))}
                  {stageProjects.length === 0 && (
                    <div className="flex items-center justify-center h-16 text-navy/25 text-xs text-center">Aucun projet</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
