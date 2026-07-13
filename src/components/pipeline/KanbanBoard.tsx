'use client'

import { useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import type { Project, ProjectStage } from '@/lib/types'
import { STAGES } from '@/lib/types'
import { useApp } from '@/context/AppContext'
import KanbanColumn from './KanbanColumn'
import ProjectCard from './ProjectCard'
import AssignEditorModal from './AssignEditorModal'
import AssignStageModal from './AssignStageModal'
import ProjectDetailModal from '@/components/project/ProjectDetailModal'
import NewProjectModal from './NewProjectModal'

const STAGE_ASSIGN_MODAL: ProjectStage[] = ['pre-production', 'shooting']

export default function KanbanBoard() {
  const { projects, projectTypes, updateProject } = useApp()
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [detailProject, setDetailProject] = useState<Project | null>(null)
  const [pendingProject, setPendingProject] = useState<Project | null>(null)
  const [showAssign, setShowAssign] = useState(false)
  const [stageAssignTarget, setStageAssignTarget] = useState<ProjectStage | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
  const [filterTypeId, setFilterTypeId] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    const p = projects.find((p) => p.id === event.active.id)
    setActiveProject(p ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveProject(null)
    if (!over) return
    const newStage = over.id as ProjectStage
    const project = projects.find((p) => p.id === active.id)
    if (!project || project.stage === newStage) return
    if (newStage === 'editing') {
      setPendingProject(project)
      setShowAssign(true)
    } else if (STAGE_ASSIGN_MODAL.includes(newStage)) {
      setPendingProject(project)
      setStageAssignTarget(newStage)
    } else {
      updateProject(project.id, { stage: newStage })
    }
  }

  const filtered = projects.filter((p) => {
    const matchSearch = !search || p.client_name.toLowerCase().includes(search.toLowerCase())
    const matchType = !filterTypeId || p.project_type_id === filterTypeId
    return matchSearch && matchType
  })

  const byStage = (stage: ProjectStage) => filtered.filter((p) => p.stage === stage)

  return (
    <>
      {/* Search + filter bar */}
      <div className="px-6 pt-4 pb-1 flex gap-2 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/30 pointer-events-none" />
          <input
            type="text"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2rem' }}
          />
        </div>
        <select
          value={filterTypeId}
          onChange={(e) => setFilterTypeId(e.target.value)}
          className="text-xs"
          style={{ width: 'auto' }}
        >
          <option value="">All Types</option>
          {projectTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-5 overflow-x-auto px-6 py-6 min-h-[calc(100dvh-64px)] items-start">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              projects={byStage(stage)}
              onCardClick={(p) => setDetailProject(p)}
              onAddProject={stage === 'incoming' ? () => setShowNew(true) : undefined}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeProject && (
            <motion.div
              initial={{ scale: 1, rotate: 0 }}
              animate={{ scale: 1.05, rotate: 1.5 }}
              style={{ boxShadow: '0 20px 60px rgba(42,164,231,0.22), 0 8px 24px rgba(10,96,173,0.12)' }}
              transition={{ type: 'spring' as const, stiffness: 400, damping: 28 }}
            >
              <ProjectCard project={activeProject} onClick={() => {}} isDragOverlay />
            </motion.div>
          )}
        </DragOverlay>
      </DndContext>

      <AssignEditorModal
        open={showAssign}
        project={pendingProject}
        onClose={() => { setShowAssign(false); setPendingProject(null) }}
        onConfirm={() => setPendingProject(null)}
      />

      <AssignStageModal
        open={stageAssignTarget !== null}
        project={pendingProject}
        targetStage={stageAssignTarget}
        onClose={() => { setStageAssignTarget(null); setPendingProject(null) }}
        onConfirm={() => setPendingProject(null)}
      />

      {detailProject && (
        <ProjectDetailModal
          project={projects.find((p) => p.id === detailProject.id) ?? detailProject}
          onClose={() => setDetailProject(null)}
          onSwitchProject={(id) => {
            const target = projects.find((p) => p.id === id)
            if (target) setDetailProject(target)
          }}
        />
      )}

      <NewProjectModal open={showNew} onClose={() => setShowNew(false)} />
    </>
  )
}
