'use client'

import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, User, Trash2, X, Copy, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Project, ProjectStage } from '@/lib/types'
import { STAGE_LABELS, DELIVERABLE_STAGES } from '@/lib/types'
import { nextStageFor, prevStageFor } from '@/lib/stage-rules'
import Badge from '@/components/ui/Badge'
import { formatDZD, formatDate } from '@/lib/utils'
import { useApp } from '@/context/AppContext'

interface Props {
  project: Project
  onClick: () => void
  isDragOverlay?: boolean
  onRequestStageChange?: (project: Project, stage: ProjectStage) => void
}

export default function ProjectCard({ project, onClick, isDragOverlay, onRequestStageChange }: Props) {
  const { projects, deleteProject, duplicateProject } = useApp()
  const [confirming, setConfirming] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

  const orderSiblings = project.order_id ? projects.filter((p) => p.order_id === project.order_id) : []
  const orderIndex = orderSiblings.findIndex((p) => p.id === project.id)

  const prevStage = prevStageFor(project)
  const nextStage = nextStageFor(project)

  const handleMove = (e: React.MouseEvent, stage: ProjectStage) => {
    e.stopPropagation()
    onRequestStageChange?.(project, stage)
  }

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
    disabled: isDragOverlay || confirming,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
  }

  const editorAssignment = (project.editor_assignments ?? [])[0]
  const editorName = editorAssignment?.editor?.full_name || editorAssignment?.editor_name

  const isActiveStage = DELIVERABLE_STAGES.includes(project.stage)
  const pendingDeliverable = (project.deliverables ?? []).some((d) => d.stage === project.stage && d.status === 'submitted')

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteProject(project.id)
  }

  const handleConfirmClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(true)
  }

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(false)
  }

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setDuplicating(true)
    await duplicateProject(project.id)
    setDuplicating(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={isDragOverlay ? undefined : style}
      {...(isDragOverlay ? {} : listeners)}
      {...(isDragOverlay ? {} : attributes)}
    >
      <motion.div
        whileHover={!isDragging && !confirming && !isDragOverlay ? { y: -4, scale: 1.015 } : undefined}
        whileTap={!confirming ? { scale: 0.98 } : undefined}
        transition={{ type: 'spring' as const, stiffness: 500, damping: 28 }}
        onClick={(e) => { if (!confirming) { e.stopPropagation(); onClick() } }}
        className={`glass-sm rounded-2xl p-3.5 mb-2.5 select-none cursor-grab active:cursor-grabbing relative group ${
          isActiveStage ? 'border-l-4 border-l-brand' : ''
        }`}
      >
        {/* Confirm delete overlay */}
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-2 z-10"
            style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-navy text-xs font-semibold">Delete this project?</p>
            <div className="flex gap-2">
              <motion.button
                onClick={handleCancelClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-silver text-navy/60 hover:text-navy text-xs transition-colors"
              >
                <X size={11} /> Cancel
              </motion.button>
              <motion.button
                onClick={handleDelete}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs transition-colors"
              >
                <Trash2 size={11} /> Delete
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-navy font-semibold text-sm leading-snug line-clamp-1">
            {project.client_name}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <motion.button
              onClick={handleDuplicate}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              disabled={duplicating}
              className="opacity-0 group-hover:opacity-100 text-navy/30 hover:text-brand transition-all p-0.5 rounded-lg disabled:opacity-40"
              title="Duplicate project"
            >
              <Copy size={12} />
            </motion.button>
            <motion.button
              onClick={handleConfirmClick}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className="opacity-0 group-hover:opacity-100 text-navy/30 hover:text-red-500 transition-all p-0.5 rounded-lg"
              title="Delete project"
            >
              <Trash2 size={12} />
            </motion.button>
          </div>
        </div>

        {/* Badge */}
        <div className="mb-2 flex items-center gap-1.5 flex-wrap">
          <Badge projectType={project.project_type} small />
          {orderSiblings.length > 1 && (
            <span className="text-[9px] font-semibold rounded-full px-2 py-0.5 bg-navy/5 text-navy/50 border border-navy/10" title="Fait partie d'une commande à plusieurs vidéos">
              Vidéo {orderIndex + 1}/{orderSiblings.length}
            </span>
          )}
          {isActiveStage && (
            <span className="text-[9px] font-semibold rounded-full px-2 py-0.5 bg-brand/10 text-brand border border-brand/25">
              En cours
            </span>
          )}
          {pendingDeliverable && (
            <span className="text-[9px] font-semibold rounded-full px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 animate-pulse">
              À valider
            </span>
          )}
          {project.stage === 'delivered' && (
            <span className="text-[9px] font-semibold rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200">
              Livré · Rév. {project.revision_count}
            </span>
          )}
        </div>

        {/* Editor */}
        {(project.stage === 'editing' || project.stage === 'delivered') && editorName && (
          <div className="flex items-center gap-1 text-navy/50 text-xs mb-2">
            <User size={11} />
            <span className="truncate">{editorName}</span>
          </div>
        )}

        {/* Notes */}
        {project.notes && (
          <p className="text-navy/45 text-[11px] leading-relaxed mb-2 line-clamp-2">
            {project.notes}
          </p>
        )}

        {/* Quick-move arrows */}
        {!isDragOverlay && !confirming && (
          <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {prevStage ? (
              <motion.button
                onClick={(e) => handleMove(e, prevStage)}
                whileHover={{ scale: 1.08, x: -1 }} whileTap={{ scale: 0.93 }}
                className="flex items-center gap-0.5 text-[10px] text-navy/35 hover:text-brand transition-colors"
              >
                <ChevronLeft size={11} />
                <span>{STAGE_LABELS[prevStage]}</span>
              </motion.button>
            ) : <span />}
            {nextStage ? (
              <motion.button
                onClick={(e) => handleMove(e, nextStage)}
                whileHover={{ scale: 1.08, x: 1 }} whileTap={{ scale: 0.93 }}
                className="flex items-center gap-0.5 text-[10px] text-navy/35 hover:text-brand transition-colors"
              >
                <span>{STAGE_LABELS[nextStage]}</span>
                <ChevronRight size={11} />
              </motion.button>
            ) : <span />}
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-1 gap-2">
          <span className="text-navy font-bold text-xs">
            {formatDZD(project.deal_price || 0)}
          </span>
          {project.deadline && (
            <div className="flex items-center gap-1 text-navy/45 text-[11px]">
              <Calendar size={10} />
              <span>{formatDate(project.deadline)}</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
