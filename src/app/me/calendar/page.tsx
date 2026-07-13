'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isToday, addMonths, subMonths, isSameDay,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import type { MemberProjectListItem } from '@/lib/member-types'

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
  const [month, setMonth] = useState(new Date())

  useEffect(() => {
    fetch('/api/member/projects').then((r) => r.json()).then((d) => setProjects(d.projects ?? [])).finally(() => setLoading(false))
  }, [])

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const projectsOnDay = (day: Date) => projects.filter((p) => p.deadline && isSameDay(new Date(p.deadline), day))

  return (
    <div className="min-h-screen">
      <div className="px-6 py-5 border-b border-white/50 bg-white/20 backdrop-blur-sm flex items-center justify-between">
        <div>
          <h1 className="text-navy font-bold text-lg">Calendrier</h1>
          <p className="text-navy/45 text-xs mt-0.5">Échéances de vos projets</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth((m) => subMonths(m, 1))} className="p-1.5 rounded-xl hover:bg-white/50 text-navy/50 hover:text-navy transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-navy font-semibold text-sm w-28 text-center capitalize">{format(month, 'MMMM yyyy', { locale: fr })}</span>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} className="p-1.5 rounded-xl hover:bg-white/50 text-navy/50 hover:text-navy transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-navy/35 text-sm">Chargement…</div>
      ) : (
        <div className="p-6">
          <div className="glass rounded-2xl p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                <div key={d} className="text-navy/40 text-[10px] font-semibold text-center py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const dayProjects = projectsOnDay(day)
                return (
                  <motion.div
                    key={day.toISOString()}
                    className={`rounded-xl p-1.5 min-h-16 text-xs ${isSameMonth(day, month) ? 'bg-white/30' : 'bg-white/10 opacity-40'} ${isToday(day) ? 'ring-2 ring-brand' : ''}`}
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
