'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isToday, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isSameDay,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import type { MemberProjectListItem } from '@/lib/member-types'
import { STAGE_LABELS } from '@/lib/types'

type ViewMode = 'month' | 'week' | 'day'

function statusColor(p: MemberProjectListItem): string {
  if (p.isRejected) return 'bg-red-400'
  if (p.stage === 'delivered') return 'bg-emerald-400'
  if (p.deadline) {
    const hoursLeft = (new Date(p.deadline).getTime() - Date.now()) / 3_600_000
    if (hoursLeft < 24 && hoursLeft > -999999) return 'bg-amber-400'
  }
  if (p.started_at) return 'bg-blue-400'
  return 'bg-gray-400'
}

export default function MemberCalendarPage() {
  const [projects, setProjects] = useState<MemberProjectListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [anchor, setAnchor] = useState(new Date())
  const [view, setView] = useState<ViewMode>('month')

  useEffect(() => {
    fetch('/api/member/projects').then((r) => r.json()).then((d) => setProjects(d.projects ?? [])).finally(() => setLoading(false))
  }, [])

  const projectsOnDay = (day: Date) => projects.filter((p) => p.deadline && isSameDay(new Date(p.deadline), day))

  const goPrev = () => setAnchor((d) => (view === 'month' ? subMonths(d, 1) : view === 'week' ? subWeeks(d, 1) : subDays(d, 1)))
  const goNext = () => setAnchor((d) => (view === 'month' ? addMonths(d, 1) : view === 'week' ? addWeeks(d, 1) : addDays(d, 1)))

  const label = view === 'month'
    ? format(anchor, 'MMMM yyyy', { locale: fr })
    : view === 'week'
      ? `${format(startOfWeek(anchor, { weekStartsOn: 1 }), 'd MMM', { locale: fr })} – ${format(endOfWeek(anchor, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: fr })}`
      : format(anchor, 'EEEE d MMMM yyyy', { locale: fr })

  const monthStart = startOfMonth(anchor)
  const monthEnd = endOfMonth(anchor)
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const monthDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd })

  const weekDays = eachDayOfInterval({
    start: startOfWeek(anchor, { weekStartsOn: 1 }),
    end: endOfWeek(anchor, { weekStartsOn: 1 }),
  })

  return (
    <div className="min-h-screen">
      <div className="px-6 py-5 border-b border-white/50 bg-white/20 backdrop-blur-sm flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-navy font-bold text-lg">Calendrier</h1>
          <p className="text-navy/45 text-xs mt-0.5">Échéances de vos projets</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/40 rounded-xl p-1">
            {(['month', 'week', 'day'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${view === v ? 'bg-brand text-white' : 'text-navy/50 hover:text-navy'}`}
              >
                {v === 'month' ? 'Mois' : v === 'week' ? 'Semaine' : 'Jour'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="p-1.5 rounded-xl hover:bg-white/50 text-navy/50 hover:text-navy transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-navy font-semibold text-sm w-40 text-center capitalize">{label}</span>
            <button onClick={goNext} className="p-1.5 rounded-xl hover:bg-white/50 text-navy/50 hover:text-navy transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-navy/35 text-sm">Chargement…</div>
      ) : (
        <div className="p-6">
          {view === 'month' && (
            <div className="glass rounded-2xl p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                  <div key={d} className="text-navy/40 text-[10px] font-semibold text-center py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day) => {
                  const dayProjects = projectsOnDay(day)
                  return (
                    <motion.div
                      key={day.toISOString()}
                      className={`rounded-xl p-1.5 min-h-16 text-xs ${isSameMonth(day, anchor) ? 'bg-white/30' : 'bg-white/10 opacity-40'} ${isToday(day) ? 'ring-2 ring-brand' : ''}`}
                    >
                      <span className="text-navy/50 font-medium">{format(day, 'd')}</span>
                      <div className="space-y-0.5 mt-1">
                        {dayProjects.slice(0, 3).map((p) => (
                          <div key={p.id} className="flex items-center gap-1 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor(p)}`} />
                            <span className="text-navy/70 text-[10px] truncate">{p.client_name}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {view === 'week' && (
            <div className="glass rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dayProjects = projectsOnDay(day)
                return (
                  <div
                    key={day.toISOString()}
                    className={`rounded-xl p-2.5 min-h-32 ${isToday(day) ? 'ring-2 ring-brand' : ''} bg-white/30`}
                  >
                    <p className="text-navy/50 text-[10px] font-semibold uppercase">{format(day, 'EEE', { locale: fr })}</p>
                    <p className="text-navy font-bold text-sm mb-2">{format(day, 'd MMM', { locale: fr })}</p>
                    <div className="space-y-1">
                      {dayProjects.length === 0 && <p className="text-navy/25 text-[11px]">—</p>}
                      {dayProjects.map((p) => (
                        <div key={p.id} className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor(p)}`} />
                          <span className="text-navy/70 text-[11px] truncate">{p.client_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {view === 'day' && (
            <div className="glass rounded-2xl p-5">
              {projectsOnDay(anchor).length === 0 ? (
                <p className="text-navy/35 text-sm text-center py-10">Aucune échéance ce jour-là.</p>
              ) : (
                <div className="space-y-2">
                  {projectsOnDay(anchor).map((p) => (
                    <div key={p.id} className="flex items-center gap-3 glass-sm rounded-xl p-3">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColor(p)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-navy font-semibold text-sm truncate">{p.client_name}</p>
                        <p className="text-navy/45 text-xs">{STAGE_LABELS[p.stage]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 mt-4 text-[11px] text-navy/50 flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400" /> Assigné</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> Démarré</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Deadline &lt; 24h</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Rejeté / en retard</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Validé</span>
          </div>
        </div>
      )}
    </div>
  )
}
