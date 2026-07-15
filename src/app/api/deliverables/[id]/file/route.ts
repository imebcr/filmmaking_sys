import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createReadStream } from 'fs'
import { promises as fs } from 'fs'
import { Readable } from 'stream'
import { authOptions } from '@/lib/auth-options'
import { requireAdmin } from '@/lib/admin-guard'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { memberHasAccessToProject } from '@/lib/member-access'

function anonymizeIp(ip: string | null): string | null {
  if (!ip) return null
  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`
  return ip.split(':')[0] + ':0'
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(request.url)
  const variant = url.searchParams.get('variant') === 'thumbnail' ? 'thumbnail' : 'original'
  const shareToken = url.searchParams.get('share_token')
  const downloadToken = url.searchParams.get('download_token')
  const forceDownload = url.searchParams.get('download') === '1'

  const supabase = createServerSupabaseClient()
  const { data: deliverable } = await supabase.from('deliverables').select('*').eq('id', id).single()
  if (!deliverable) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  let authorized = false
  let isClientShareAccess = false

  if (await requireAdmin(request)) {
    authorized = true
  } else {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      authorized = await memberHasAccessToProject(session.user.id, deliverable.project_id)
    }
  }

  if (!authorized && shareToken && deliverable.client_share_token === shareToken) {
    const notExpired = !deliverable.client_share_expires_at || new Date(deliverable.client_share_expires_at) > new Date()
    if (notExpired) {
      authorized = true
      isClientShareAccess = true
    }
  }

  // The "copy link" button generates this — a plain, non-expiring link meant to be
  // pasted anywhere (Slack/WhatsApp/etc.) and clicked without needing to be logged in
  // as any particular identity in that browser tab.
  if (!authorized && downloadToken && deliverable.download_token && deliverable.download_token === downloadToken) {
    authorized = true
  }

  if (!authorized) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const filePath = variant === 'thumbnail' ? deliverable.thumbnail_path : deliverable.file_path
  if (!filePath) return NextResponse.json({ error: 'Fichier indisponible.' }, { status: 404 })

  const stat = await fs.stat(filePath).catch(() => null)
  if (!stat) return NextResponse.json({ error: 'Fichier introuvable sur le disque.' }, { status: 404 })

  if (isClientShareAccess && variant === 'original') {
    const ip = anonymizeIp(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null)
    const log = Array.isArray(deliverable.client_share_access_log) ? deliverable.client_share_access_log : []
    await supabase
      .from('deliverables')
      .update({ client_share_access_log: [...log, { at: new Date().toISOString(), ip }] })
      .eq('id', id)
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream
  return new NextResponse(stream, {
    headers: {
      'Content-Type': variant === 'thumbnail' ? 'image/jpeg' : deliverable.mime_type,
      'Content-Length': stat.size.toString(),
      'Content-Disposition': variant === 'original'
        ? `${forceDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(deliverable.file_path.split(/[\\/]/).pop() ?? 'file')}"`
        : 'inline',
      'Cache-Control': 'private, max-age=0, no-cache',
    },
  })
}
