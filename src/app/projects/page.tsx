'use client'

import { useMemo, useState } from 'react'
import { Search, Download } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import ProjectDetailModal from '@/components/project/ProjectDetailModal'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import { useApp } from '@/context/AppContext'
import { STAGE_LABELS, STAGE_COLORS, type Project, type ProjectStage } from '@/lib/types'
import { formatDate } from '@/lib/utils'

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function exportCsv(projects: Project[]) {
  const headers = ['Client', 'Type', 'Étape', 'Commercial', 'Téléphone', 'E-mail', 'Deadline', 'Prix (DA)', 'Révisions', 'Créé le']
  const rows = projects.map((p) => [
    p.client_name,
    p.project_type?.name ?? '',
    STAGE_LABELS[p.stage],
    p.commercial_id ?? '',
    p.client_phone,
    p.client_email,
    p.deadline ? formatDate(p.deadline) : '',
    String(p.deal_price ?? 0),
    `${p.revision_count}/${p.revisions_allowed}`,
    formatDate(p.created_at),
  ])
  const csv = [headers, ...rows].map((r) => r.map((c) => csvEscape(String(c))).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `projets-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ProjectsListPage() {
  const { projects, projectTypes, editors, loading, error } = useApp()
  const [search, setSearch] = useState('')
  const [filterTypeId, setFilterTypeId] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [detailProject, setDetailProject] = useState<Project | null>(null)

  const commercialName = (id: string | null) => editors.find((e) => e.id === id)?.full_name ?? '—'

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchSearch = !search || p.client_name.toLowerCase().includes(search.toLowerCase())
      const matchType = !filterTypeId || p.project_type_id === filterTypeId
      const matchStage = !filterStage || p.stage === filterStage
      return matchSearch && matchType && matchStage
    })
  }, [projects, search, filterTypeId, filterStage])

  return (
    <AppLayout>
      <div className="min-h-screen">
        <div className="px-6 py-5 border-b border-white/50 bg-white/20 backdrop-blur-sm flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-navy font-bold text-lg">Projets</h1>
            <p className="text-navy/45 text-xs mt-0.5">Vue tableau de tous les projets</p>
          </div>
          <button
            onClick={() => exportCsv(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand hover:bg-ocean text-white text-xs font-semibold transition-colors shadow-sm shadow-brand/25"
          >
            <Download size={13} /> Exporter en CSV
          </button>
        </div>

        <div className="px-6 pt-4 pb-1 flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/30 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher un client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2rem' }}
            />
          </div>
          <Select value={filterTypeId} onChange={setFilterTypeId} className="text-xs" style={{ width: 180 }}>
            <option value="">Tous les types</option>
            {projectTypes.map((t) => (
              <option key={t.id} value={t.id}>
                <span
                  className="inline-flex items-center rounded-full font-semibold text-[10px] px-2 py-0.5"
                  style={{ backgroundColor: t.color + '18', border: `1px solid ${t.color}35`, color: t.color }}
                >
                  {t.name}
                </span>
              </option>
            ))}
          </Select>
          <Select value={filterStage} onChange={setFilterStage} className="text-xs" style={{ width: 180 }}>
            <option value="">Toutes les étapes</option>
            {(Object.entries(STAGE_LABELS) as [ProjectStage, string][]).map(([s, label]) => (
              <option key={s} value={s}>
                <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border ${STAGE_COLORS[s]}`}>{label}</span>
              </option>
            ))}
          </Select>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-100 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-navy/35 text-sm">Loading…</div>
        ) : (
          <div className="p-6 pb-24 lg:pb-6 overflow-x-auto">
            <div className="glass rounded-2xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/50 text-navy/50">
                    <th className="text-left px-4 py-3 font-semibold">Client</th>
                    <th className="text-left px-4 py-3 font-semibold">Type</th>
                    <th className="text-left px-4 py-3 font-semibold">Étape</th>
                    <th className="text-left px-4 py-3 font-semibold">Commercial</th>
                    <th className="text-left px-4 py-3 font-semibold">Deadline</th>
                    <th className="text-center px-4 py-3 font-semibold">Révisions</th>
                    <th className="text-left px-4 py-3 font-semibold">Créé le</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setDetailProject(p)}
                      className="border-b border-white/30 hover:bg-white/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-navy font-medium">{p.client_name}</td>
                      <td className="px-4 py-3">
                        {p.project_type ? <Badge projectType={p.project_type} small /> : <span className="text-navy/60">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold rounded-full px-2.5 py-1 border ${STAGE_COLORS[p.stage]}`}>
                          {STAGE_LABELS[p.stage]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-navy/60">{commercialName(p.commercial_id)}</td>
                      <td className="px-4 py-3 text-navy/60">{p.deadline ? formatDate(p.deadline) : '—'}</td>
                      <td className="px-4 py-3 text-center text-navy/60">{p.revision_count}/{p.revisions_allowed}</td>
                      <td className="px-4 py-3 text-navy/45">{formatDate(p.created_at)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-navy/35">Aucun projet trouvé.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {detailProject && (
        <ProjectDetailModal project={detailProject} onClose={() => setDetailProject(null)} />
      )}
    </AppLayout>
  )
}
