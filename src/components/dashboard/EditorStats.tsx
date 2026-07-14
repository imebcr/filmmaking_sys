'use client'

import { useMemo } from 'react'
import {
  startOfDay, subDays, addDays, isAfter, isBefore, max, min, differenceInDays, format,
} from 'date-fns'
import { motion } from 'framer-motion'
import { useApp } from '@/context/AppContext'
import type { EditorAssignment } from '@/lib/types'
import { SPECIALTY_LABELS } from '@/lib/types'

const PERIOD_DAYS = 30

function calcUtilization(editorId: string, assignments: EditorAssignment[]): number {
  const today = startOfDay(new Date())
  const periodStart = subDays(today, PERIOD_DAYS - 1)
  const occupiedDays = new Set<string>()
  for (const a of assignments) {
    if (a.editor_id !== editorId) continue
    const aStart = max([startOfDay(new Date(a.start_date)), periodStart])
    const aEnd = min([startOfDay(new Date(a.end_date)), today])
    if (aStart > aEnd) continue
    const count = differenceInDays(aEnd, aStart) + 1
    for (let i = 0; i < count; i++) {
      occupiedDays.add(format(addDays(aStart, i), 'yyyy-MM-dd'))
    }
  }
  return Math.min((occupiedDays.size / PERIOD_DAYS) * 100, 100)
}

function barColor(pct: number) {
  if (pct >= 80) return '#ef4444'
  if (pct >= 50) return '#f59e0b'
  return '#10b981'
}

export default function EditorStats() {
  const { editors, editorAssignments, projects } = useApp()

  const rows = useMemo(() => {
    return editors.map((editor) => {
      const myAssignments = editorAssignments.filter((a) => a.editor_id === editor.id)
      const projectIds = [...new Set(myAssignments.map((a) => a.project_id))]
      const myProjects = projects.filter((p) => projectIds.includes(p.id))
      const now = new Date()
      const active = myAssignments.find(
        (a) => isBefore(new Date(a.start_date), now) && isAfter(new Date(a.end_date), now),
      )
      const activeProject = active ? projects.find((p) => p.id === active.project_id) : null
      const utilization = calcUtilization(editor.id, editorAssignments)
      return { editor, projectCount: myProjects.length, utilization, activeProject }
    })
  }, [editors, editorAssignments, projects])

  if (rows.length === 0) {
    return (
      <div className="glass rounded-2xl py-16 text-center text-navy/40 text-sm">
        No editors yet. Add editors in Settings.
      </div>
    )
  }

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto glass rounded-2xl">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/50 text-navy/50">
              <th className="text-left px-5 py-3.5 font-semibold">Editor</th>
              <th className="text-left px-4 py-3.5 font-semibold">Specialty</th>
              <th className="text-center px-4 py-3.5 font-semibold">Projects</th>
              <th className="text-left px-4 py-3.5 font-semibold w-44">Utilization (30d)</th>
              <th className="text-left px-4 py-3.5 font-semibold">Working On</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ editor, projectCount, utilization, activeProject }, i) => (
              <motion.tr
                key={editor.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, type: 'spring' as const, stiffness: 400, damping: 30 }}
                className="border-b border-white/30 hover:bg-white/30 transition-colors"
              >
                <td className="px-5 py-4">
                  <p className="text-navy font-semibold">{editor.full_name}</p>
                  {editor.notes && <p className="text-navy/40 text-[10px] mt-0.5">{editor.notes}</p>}
                </td>
                <td className="px-4 py-4 text-navy/55">{SPECIALTY_LABELS[editor.specialty]}</td>
                <td className="px-4 py-4 text-center">
                  <span className="text-navy font-bold text-base">{projectCount}</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-silver/60 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: barColor(utilization) }}
                        initial={{ width: 0 }}
                        animate={{ width: `${utilization}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05 + 0.3, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-navy text-xs w-8 text-right font-medium">{Math.round(utilization)}%</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  {activeProject ? (
                    <span className="text-ocean text-xs bg-brand/10 border border-brand/25 px-2.5 py-1 rounded-full font-medium">
                      {activeProject.client_name}
                    </span>
                  ) : (
                    <span className="text-emerald-600 text-xs font-medium">Available</span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {rows.map(({ editor, projectCount, utilization, activeProject }, i) => (
          <motion.div
            key={editor.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: 'spring' as const, stiffness: 400, damping: 28 }}
            className="glass rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-navy font-semibold">{editor.full_name}</p>
                <p className="text-navy/50 text-xs">{SPECIALTY_LABELS[editor.specialty]}</p>
              </div>
              {activeProject ? (
                <span className="text-ocean text-[10px] bg-brand/10 border border-brand/25 px-2 py-1 rounded-full font-medium">
                  {activeProject.client_name}
                </span>
              ) : (
                <span className="text-emerald-600 text-xs font-semibold">Free</span>
              )}
            </div>

            <div>
              <div className="flex justify-between text-xs text-navy/50 mb-1.5">
                <span>Utilization (30d)</span>
                <span className="text-navy font-semibold">{Math.round(utilization)}%</span>
              </div>
              <div className="bg-silver/60 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: barColor(utilization) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${utilization}%` }}
                  transition={{ duration: 0.8, delay: i * 0.06 + 0.3 }}
                />
              </div>
            </div>

            <div className="text-center">
              <p className="text-navy/45 text-[10px] uppercase font-semibold">Projects</p>
              <p className="text-navy font-bold text-lg">{projectCount}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
