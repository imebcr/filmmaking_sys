'use client'

import AppLayout from '@/components/layout/AppLayout'
import KPICards from '@/components/dashboard/KPICards'
import EditorStats from '@/components/dashboard/EditorStats'
import OperationalBlocks from '@/components/dashboard/OperationalBlocks'
import StatsCharts from '@/components/dashboard/StatsCharts'
import { useApp } from '@/context/AppContext'

export default function DashboardPage() {
  const { loading, error } = useApp()

  return (
    <AppLayout>
      <div className="min-h-screen">
        <div className="px-6 py-5 border-b border-white/50 bg-white/20 backdrop-blur-sm">
          <h1 className="text-navy font-bold text-lg">Dashboard</h1>
          <p className="text-navy/45 text-xs mt-0.5">Agency performance overview</p>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-100 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-navy/35 text-sm">Loading…</div>
        ) : (
          <div className="p-6 space-y-8">
            <KPICards />
            <section>
              <h2 className="text-navy font-semibold mb-4">Suivi opérationnel</h2>
              <OperationalBlocks />
            </section>
            <section>
              <h2 className="text-navy font-semibold mb-4">Statistiques</h2>
              <StatsCharts />
            </section>
            <section>
              <h2 className="text-navy font-semibold mb-4">Editor Performance</h2>
              <EditorStats />
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
