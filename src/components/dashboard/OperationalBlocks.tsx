'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Clock, Inbox, RotateCcw } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { STAGES, STAGE_LABELS } from '@/lib/types'

const DEADLINE_THRESHOLD_DAYS = 3

export default function OperationalBlocks() {
  const { projects } = useApp()

  const deadlinesProches = useMemo(() => {
    const now = Date.now()
    return projects
      .filter((p) => p.stage !== 'delivered' && p.deadline)
      .map((p) => ({
        project: p,
        daysLeft: Math.ceil((new Date(p.deadline as string).getTime() - now) / 86_400_000),
      }))
      .filter((p) => p.daysLeft <= DEADLINE_THRESHOLD_DAYS)
      .sort((a, b) => a.daysLeft - b.daysLeft)
  }, [projects])

  const livrablesEnAttente = useMemo(() => {
    return projects.flatMap((p) => (p.deliverables ?? []).filter((d) => d.status === 'submitted').map((d) => ({ project: p, deliverable: d })))
  }, [projects])

  const livrablesRejetesEnReprise = useMemo(() => {
    return projects.filter((p) => {
      const latest = (p.deliverables ?? [])
        .filter((d) => d.stage === p.stage)
        .sort((a, b) => b.version - a.version)[0]
      return latest?.status === 'rejected'
    })
  }, [projects])

  const percentComplete = (stage: string) => Math.round((STAGES.indexOf(stage as typeof STAGES[number]) / (STAGES.length - 1)) * 100)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Deadlines proches */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-amber-500" />
          <h3 className="text-navy font-semibold text-sm">Deadlines proches</h3>
          <span className="ml-auto text-navy/40 text-xs font-semibold">{deadlinesProches.length}</span>
        </div>
        {deadlinesProches.length === 0 ? (
          <p className="text-navy/35 text-xs py-4 text-center">Aucune échéance proche.</p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {deadlinesProches.map(({ project, daysLeft }) => (
              <div key={project.id} className="flex items-center justify-between text-xs glass-sm rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-navy font-medium truncate">{project.client_name}</p>
                  <p className="text-navy/40">{STAGE_LABELS[project.stage]} · {percentComplete(project.stage)}%</p>
                </div>
                <span className={`font-bold shrink-0 ml-2 ${daysLeft < 0 ? 'text-red-500' : daysLeft <= 1 ? 'text-red-500' : 'text-amber-500'}`}>
                  {daysLeft < 0 ? `${Math.abs(daysLeft)}j de retard` : `${daysLeft}j`}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Livrables en attente */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Inbox size={14} className="text-brand" />
          <h3 className="text-navy font-semibold text-sm">Livrables en attente</h3>
          <span className="ml-auto text-navy/40 text-xs font-semibold">{livrablesEnAttente.length}</span>
        </div>
        {livrablesEnAttente.length === 0 ? (
          <p className="text-navy/35 text-xs py-4 text-center">Aucune soumission à valider.</p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {livrablesEnAttente.map(({ project, deliverable }) => (
              <Link key={deliverable.id} href="/pipeline" className="flex items-center justify-between text-xs glass-sm rounded-lg px-3 py-2 hover:bg-white/50 transition-colors">
                <p className="text-navy font-medium truncate">{project.client_name}</p>
                <span className="text-brand font-semibold shrink-0 ml-2">v{deliverable.version}</span>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      {/* Livrables rejetés en reprise */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <RotateCcw size={14} className="text-red-500" />
          <h3 className="text-navy font-semibold text-sm">Livrables rejetés en reprise</h3>
          <span className="ml-auto text-navy/40 text-xs font-semibold">{livrablesRejetesEnReprise.length}</span>
        </div>
        {livrablesRejetesEnReprise.length === 0 ? (
          <p className="text-navy/35 text-xs py-4 text-center">Aucun livrable en reprise.</p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {livrablesRejetesEnReprise.map((project) => (
              <div key={project.id} className="flex items-center justify-between text-xs glass-sm rounded-lg px-3 py-2">
                <p className="text-navy font-medium truncate">{project.client_name}</p>
                <span className="text-red-500 font-semibold shrink-0 ml-2">{project.revision_count}/{project.revisions_allowed} rév.</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
