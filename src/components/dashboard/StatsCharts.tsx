'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { subMonths, startOfMonth, format, isWithinInterval, endOfMonth, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useApp } from '@/context/AppContext'
import { STAGES, STAGE_LABELS } from '@/lib/types'

const STAGE_CHART_COLORS: Record<string, string> = {
  incoming: '#94A3B8',
  'pre-production': '#2AA4E7',
  shooting: '#F59E0B',
  editing: '#8B5CF6',
  delivered: '#10B981',
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4">
      <h3 className="text-navy font-semibold text-sm mb-3">{title}</h3>
      {children}
    </motion.div>
  )
}

const tooltipStyle = {
  background: 'rgba(255,255,255,0.95)',
  border: '1px solid rgba(42,164,231,0.25)',
  borderRadius: 10,
  fontSize: 12,
  color: '#0C224B',
}

export default function StatsCharts() {
  const { projects } = useApp()

  // ── Donut: répartition du pipeline ──
  const pipelineSplit = useMemo(() => {
    return STAGES.map((s) => ({ name: STAGE_LABELS[s], value: projects.filter((p) => p.stage === s).length, color: STAGE_CHART_COLORS[s] }))
      .filter((d) => d.value > 0)
  }, [projects])

  // ── Barres: délai moyen de livraison par type ──
  const avgDeliveryByType = useMemo(() => {
    const map = new Map<string, { name: string; totalDays: number; count: number; color: string }>()
    projects.forEach((p) => {
      if (p.stage !== 'delivered' || !p.project_type) return
      const days = differenceInDays(new Date(p.updated_at), new Date(p.created_at))
      const key = p.project_type.id
      const existing = map.get(key)
      if (existing) { existing.totalDays += days; existing.count++ }
      else map.set(key, { name: p.project_type.name, totalDays: days, count: 1, color: p.project_type.color })
    })
    return Array.from(map.values()).map((d) => ({ name: d.name, days: Math.round(d.totalDays / d.count), color: d.color }))
  }, [projects])

  // ── Barres: livraisons mensuelles (12 derniers mois) ──
  const monthlyDeliveries = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => startOfMonth(subMonths(new Date(), 11 - i)))
    return months.map((m) => {
      const end = endOfMonth(m)
      const delivered = projects.filter((p) => p.stage === 'delivered' && isWithinInterval(new Date(p.updated_at), { start: m, end }))
      return {
        month: format(m, 'MMM', { locale: fr }),
        count: delivered.length,
      }
    })
  }, [projects])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="Répartition du pipeline">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={pipelineSplit} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
              {pipelineSplit.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Délai moyen de livraison par type">
        {avgDeliveryByType.length === 0 ? (
          <p className="text-navy/35 text-xs py-12 text-center">Aucun projet livré pour le moment.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={avgDeliveryByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(12,34,75,0.08)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#0C224B99' }} />
              <YAxis tick={{ fontSize: 10, fill: '#0C224B99' }} label={{ value: 'jours', angle: -90, position: 'insideLeft', fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v} j`} />
              <Bar dataKey="days" radius={[6, 6, 0, 0]}>
                {avgDeliveryByType.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Livraisons mensuelles (12 derniers mois)">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthlyDeliveries}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(12,34,75,0.08)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#0C224B99' }} />
            <YAxis tick={{ fontSize: 10, fill: '#0C224B99' }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v} projet(s) livré(s)`} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#2AA4E7" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
