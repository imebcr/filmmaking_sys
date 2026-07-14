import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { requireAdminOrCommercial } from '@/lib/admin-guard'
import { createServerSupabaseClient } from '@/lib/server-supabase'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  if (!(await requireAdminOrCommercial(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  const { fileId } = await params

  const supabase = createServerSupabaseClient()
  const { data: file } = await supabase.from('project_files').select('file_path').eq('id', fileId).single()
  if (!file) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const { error } = await supabase.from('project_files').delete().eq('id', fileId)
  if (error) return NextResponse.json({ error: 'Suppression impossible.' }, { status: 500 })

  await fs.unlink(file.file_path).catch(() => {})
  return NextResponse.json({ ok: true })
}
