'use client'

import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Project, ProjectStage } from '@/lib/types'
import { STAGE_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'
import ProjectCard from './ProjectCard'

interface Props {
  stage: ProjectStage
  projects: Project[]
  onCardClick: (project: Project) => void
  onAddProject?: () => void
  onRequestStageChange: (project: Project, stage: ProjectStage) => void
}

const STAGE_COLORS: Record<ProjectStage, { dot: string; border: string; label: string }> = {
  incoming:       { dot: '#6B7280', border: 'rgba(107,114,128,0.3)', label: 'rgba(107,114,128,0.12)' },
  'pre-production': { dot: '#3B82F6', border: 'rgba(59,130,246,0.3)', label: 'rgba(59,130,246,0.12)' },
  shooting:       { dot: '#F59E0B', border: 'rgba(245,158,11,0.3)', label: 'rgba(245,158,11,0.12)' },
  editing:        { dot: '#8B5CF6', border: 'rgba(139,92,246,0.3)', label: 'rgba(139,92,246,0.12)' },
  delivered:      { dot: '#10B981', border: 'rgba(16,185,129,0.3)', label: 'rgba(16,185,129,0.12)' },
}

export default function KanbanColumn({ stage, projects, onCardClick, onAddProject, onRequestStageChange }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const colors = STAGE_COLORS[stage]

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Header */}
      <div className="mb-3 px-1 pb-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.dot }} />
            <span className="text-navy font-semibold text-sm">{STAGE_LABELS[stage]}</span>
            <span
              className="text-xs font-semibold rounded-full px-2 py-0.5"
              style={{ backgroundColor: colors.label, color: colors.dot }}
            >
              {projects.length}
            </span>
          </div>
          {stage === 'incoming' && onAddProject && (
            <motion.button
              onClick={onAddProject}
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring' as const, stiffness: 500, damping: 25 }}
              className="text-navy/40 hover:text-brand hover:bg-brand/10 p-1 rounded-lg transition-colors"
            >
              <Plus size={14} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <motion.div
        ref={setNodeRef}
        animate={isOver ? { scale: 1.01 } : { scale: 1 }}
        transition={{ type: 'spring' as const, stiffness: 400, damping: 25 }}
        className={cn(
          'flex-1 min-h-[200px] rounded-2xl p-2 transition-all duration-200',
          isOver
            ? 'bg-brand/10 border-2 border-dashed border-brand/40'
            : 'bg-white/15',
        )}
      >
        <AnimatePresence mode="popLayout">
          {projects.map((project) => (
            <motion.div
              key={project.id}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
              transition={{ type: 'spring' as const, stiffness: 450, damping: 30 }}
            >
              <ProjectCard
                project={project}
                onClick={() => onCardClick(project)}
                onRequestStageChange={onRequestStageChange}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {projects.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-24 text-navy/25 text-xs text-center">
            Drop projects here
          </div>
        )}
      </motion.div>
    </div>
  )
}
