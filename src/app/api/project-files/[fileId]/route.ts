import { NextResponse } from 'next/server'
import { createReadStream } from 'fs'
import { promises as fs } from 'fs'
import { Readable } from 'stream'
import { requireAdminOrCommercial } from '@/lib/admin-guard'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { memberHasAccessToProject } from '@/lib/member-access'

export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params
  const supabase = createServerSupabaseClient()
  const { data: file } = await supabase.from('project_files').select('*').eq('id', fileId).single()
  if (!file) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  let authorized = await requireAdminOrCommercial(request)
  if (!authorized) {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) authorized = await memberHasAccessToProject(session.user.id, file.project_id)
  }
  if (!authorized) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const stat = await fs.stat(file.file_path).catch(() => null)
  if (!stat) return NextResponse.json({ error: 'Fichier introuvable sur le disque.' }, { status: 404 })

  const stream = Readable.toWeb(createReadStream(file.file_path)) as ReadableStream
  return new NextResponse(stream, {
    headers: {
      'Content-Type': file.mime_type,
      'Content-Length': stat.size.toString(),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.file_name)}"`,
      'Cache-Control': 'private, max-age=0, no-cache',
    },
  })
}
