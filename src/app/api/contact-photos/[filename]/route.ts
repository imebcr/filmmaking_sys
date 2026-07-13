import { NextResponse } from 'next/server'
import { createReadStream, existsSync } from 'fs'
import { Readable } from 'stream'
import path from 'path'
import { DELIVERABLES_ROOT } from '@/lib/deliverable-storage'

const PHOTOS_DIR = path.join(path.dirname(DELIVERABLES_ROOT), 'contact-photos')
const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' }

export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params
  if (!/^[a-zA-Z0-9-]+\.(jpg|jpeg|png)$/.test(filename)) {
    return NextResponse.json({ error: 'Invalide.' }, { status: 400 })
  }

  const filePath = path.join(PHOTOS_DIR, filename)
  if (!existsSync(filePath)) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const ext = filename.split('.').pop() ?? ''
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream
  return new NextResponse(stream, {
    headers: { 'Content-Type': MIME[ext] ?? 'application/octet-stream', 'Cache-Control': 'private, max-age=3600' },
  })
}
