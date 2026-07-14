'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts'
import { subMonths, startOfMonth, format, isWithinInterval, endOfMonth, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useApp } from '@/context/AppContext'
import { STAGES, STAGE_LABELS } from '@/lib/types'
import { formatDZD } from '@/lib/utils'

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
  const [period, setPeriod] = useState<'month' | 'quarter'>('month')

  // ── Donut: CA par type de projet ──
  const revenueByType = useMemo(() => {
    const now = new Date()
    const start = period === 'month' ? startOfMonth(now) : subMonths(startOfMonth(now), 2)
    const map = new Map<string, { name: string; value: number; color: string }>()
    projects.forEach((p) => {
      if (!p.project_type) return
      const updated = new Date(p.updated_at)
      if (!isWithinInterval(updated, { start, end: now }) || p.stage !== 'delivered') return
      const key = p.project_type.id
      const existing = map.get(key)
      if (existing) existing.value += p.deal_price ?? 0
      else map.set(key, { name: p.project_type.name, value: p.deal_price ?? 0, color: p.project_type.color })
    })
    return Array.from(map.values()).filter((d) => d.value > 0)
  }, [projects, period])

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

  // ── Courbe: revenu mensuel (12 derniers mois) ──
  const monthlyRevenue = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => startOfMonth(subMonths(new Date(), 11 - i)))
    return months.map((m) => {
      const end = endOfMonth(m)
      const delivered = projects.filter((p) => p.stage === 'delivered' && isWithinInterval(new Date(p.updated_at), { start: m, end }))
      return {
        month: format(m, 'MMM', { locale: fr }),
        revenue: delivered.reduce((s, p) => s + (p.deal_price ?? 0), 0),
        count: delivered.length,
      }
    })
  }, [projects])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="CA par type de projet">
        <div className="flex justify-end mb-2 gap-1">
          {(['month', 'quarter'] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${period === p ? 'bg-brand text-white' : 'text-navy/40 hover:text-navy'}`}>
              {p === 'month' ? 'Mois' : 'Trimestre'}
            </button>
          ))}
        </div>
        {revenueByType.length === 0 ? (
          <p className="text-navy/35 text-xs py-12 text-center">Aucune donnée sur la période.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={revenueByType} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                {revenueByType.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatDZD(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

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

      <ChartCard title="Revenu mensuel (12 derniers mois)">
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={monthlyRevenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(12,34,75,0.08)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#0C224B99' }} />
            <YAxis tick={{ fontSize: 10, fill: '#0C224B99' }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatDZD(v)} />
            <Line type="monotone" dataKey="revenue" stroke="#2AA4E7" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={60}>
          <BarChart data={monthlyRevenue}>
            <XAxis dataKey="month" hide />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v} projet(s) livré(s)`} />
            <Bar dataKey="count" radius={[3, 3, 0, 0]} fill="#A9EFFB" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-navy/35 text-[10px] text-center -mt-1">Nombre de projets livrés par mois</p>
      </ChartCard>
    </div>
  )
}
