import { adminFetch } from '@/lib/admin-fetch'

/**
 * Notifies newly-assigned/unassigned members for a project. Logs failures to
 * the console instead of swallowing them — a 401 (stale admin session) or 500
 * here used to fail completely silently, which made "no email arrived" bugs
 * impossible to diagnose from the browser.
 */
export async function syncAssignments(projectId: string, added: string[], removed: string[]): Promise<void> {
  if (added.length === 0 && removed.length === 0) return

  try {
    const res = await adminFetch(`/api/admin/projects/${projectId}/sync-assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ added, removed }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error(`[sync-assignments] request failed (${res.status}):`, body?.error ?? res.statusText)
    } else {
      console.log(`[sync-assignments] ok — added: [${added.join(', ')}], removed: [${removed.join(', ')}]`)
    }
  } catch (err) {
    console.error('[sync-assignments] network error:', err)
  }
}
