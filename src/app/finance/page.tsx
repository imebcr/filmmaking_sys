'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import FinanceTable from '@/components/finance/FinanceTable'
import FinanceCards from '@/components/finance/FinanceCards'
import { useApp } from '@/context/AppContext'
import { useAdminIdentity } from '@/lib/use-admin-identity'

export default function FinancePage() {
  const { loading, error, projects } = useApp()
  const { isAdmin, loading: identityLoading } = useAdminIdentity()
  const router = useRouter()

  useEffect(() => {
    if (!identityLoading && !isAdmin) router.replace('/dashboard')
  }, [identityLoading, isAdmin, router])

  if (!identityLoading && !isAdmin) return null

  const totalPipeline = projects.reduce((s, p) => s + (p.deal_price ?? 0), 0)
  const totalCosts = projects.reduce((s, p) => {
    const cost = (p.stakeholders ?? []).reduce((c, sh) => c + (sh.cost || 0), 0)
    return s + cost
  }, 0)

  return (
    <AppLayout>
      <div className="min-h-screen">
        <div className="px-6 py-5 border-b border-white/50 bg-white/20 backdrop-blur-sm">
          <h1 className="text-navy font-bold text-lg">Finance</h1>
          <p className="text-navy/45 text-xs mt-0.5">Stakeholder costs and project margins</p>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-100 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-navy/35 text-sm">Loading…</div>
        ) : (
          <div className="p-6 pb-24 lg:pb-6">
            {/* Desktop */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Total Pipeline', value: totalPipeline },
                  { label: 'Total Costs', value: totalCosts },
                  { label: 'Total Margin', value: totalPipeline - totalCosts },
                ].map(({ label, value }) => (
                  <div key={label} className="glass rounded-2xl p-4">
                    <p className="text-navy/50 text-xs mb-1 font-medium">{label}</p>
                    <p className="text-navy font-bold text-xl">
                      {Math.round(value).toLocaleString('fr-DZ')} DA
                    </p>
                  </div>
                ))}
              </div>
              <FinanceTable />
            </div>

            {/* Mobile */}
            <div className="lg:hidden">
              <FinanceCards />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
