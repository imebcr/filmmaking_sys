import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { requireAdminOrCommercial } from '@/lib/admin-guard'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { ensureProjectFilesDir, storedFileName, MAX_PROJECT_FILE_BYTES } from '@/lib/project-files-storage'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminOrCommercial(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  const { id } = await params

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 })
  if (file.size > MAX_PROJECT_FILE_BYTES) return NextResponse.json({ error: 'Fichier trop volumineux (max 200 Mo).' }, { status: 413 })

  const dir = await ensureProjectFilesDir(id)
  const filename = storedFileName(file.name)
  const filePath = path.join(dir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filePath, buffer)

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('project_files')
    .insert({
      project_id: id,
      file_name: file.name,
      file_path: filePath,
      size_bytes: file.size,
      mime_type: file.type || 'application/octet-stream',
    })
    .select()
    .single()

  if (error) {
    await fs.unlink(filePath).catch(() => {})
    return NextResponse.json({ error: 'Impossible d’enregistrer le fichier.' }, { status: 500 })
  }

  return NextResponse.json({ file: data })
}
