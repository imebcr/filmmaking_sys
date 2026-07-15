import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { resolveUploaderIdentity } from '@/lib/upload-identity'

export async function GET(request: Request) {
  const identity = await resolveUploaderIdentity(request)
  if (!identity?.editorId) return NextResponse.json({ notifications: [], unreadCount: 0 })

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', identity.editorId)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: 'Impossible de charger les notifications.' }, { status: 500 })

  const notifications = data ?? []
  const unreadCount = notifications.filter((n) => !n.read_at).length
  return NextResponse.json({ notifications, unreadCount })
}
