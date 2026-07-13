'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import AppLayout from '@/components/layout/AppLayout'
import EditorRoster from '@/components/settings/EditorRoster'
import ProjectTypes from '@/components/settings/ProjectTypes'
import ContactsPanel from '@/components/settings/ContactsPanel'
import { useApp } from '@/context/AppContext'
import { useAdminIdentity } from '@/lib/use-admin-identity'

type Tab = 'editors' | 'contacts' | 'types'

const TAB_LABELS: Record<Tab, string> = {
  editors: 'Team Members',
  contacts: 'Contacts',
  types: 'Project Types',
}

export default function SettingsPage() {
  const { loading } = useApp()
  const [tab, setTab] = useState<Tab>('editors')
  const { isAdmin, loading: identityLoading } = useAdminIdentity()
  const router = useRouter()

  useEffect(() => {
    if (!identityLoading && !isAdmin) router.replace('/dashboard')
  }, [identityLoading, isAdmin, router])

  if (!identityLoading && !isAdmin) return null

  return (
    <AppLayout>
      <div className="min-h-screen">
        <div className="px-6 py-5 border-b border-white/50 bg-white/20 backdrop-blur-sm">
          <h1 className="text-navy font-bold text-lg">Settings</h1>
          <p className="text-navy/45 text-xs mt-0.5">Manage editors and project types</p>
        </div>

        <div className="p-6">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 glass rounded-2xl p-1.5 w-fit">
            {(['editors', 'contacts', 'types'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="relative px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                {tab === t && (
                  <motion.div
                    layoutId="settings-tab"
                    className="absolute inset-0 rounded-xl bg-brand shadow-sm shadow-brand/20"
                    transition={{ type: 'spring' as const, stiffness: 500, damping: 35 }}
                  />
                )}
                <span className={`relative z-10 ${tab === t ? 'text-white' : 'text-navy/55 hover:text-navy'}`}>
                  {TAB_LABELS[t]}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-navy/35 text-sm">Loading…</div>
          ) : (
            <div className="max-w-3xl">
              {tab === 'editors' && <EditorRoster />}
              {tab === 'contacts' && <ContactsPanel />}
              {tab === 'types' && <ProjectTypes />}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
