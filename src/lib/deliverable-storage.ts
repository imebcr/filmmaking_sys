import { promises as fs } from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import type { TeamMemberRole } from '@/lib/types'

/**
 * Local-disk stand-in for the VPS mount described in CDC §7.2
 * (/var/zidny/deliverables/{project_id}/{stage}/{version}/{filename}).
 * Point DELIVERABLES_ROOT at the real mounted volume in production.
 */
export const DELIVERABLES_ROOT = process.env.DELIVERABLES_ROOT
  ? path.resolve(process.env.DELIVERABLES_ROOT)
  : path.join(process.cwd(), 'storage', 'deliverables')

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024 // 5 GB, per CDC §7.3

// 'commercial' never uploads deliverables, so it's intentionally absent here.
const MIME_BY_ROLE: Partial<Record<TeamMemberRole, string[]>> = {
  editeur: ['video/mp4', 'video/quicktime', 'video/x-prores', 'video/prores'],
  filmmaker: ['video/mp4', 'video/quicktime', 'video/x-prores', 'video/prores'],
  voice_over: ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3'],
  script_writer: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
}
const IMAGE_MIMES = ['image/jpeg', 'image/png']

export function allowedMimeTypesForRoles(roles: string[]): string[] {
  const set = new Set<string>(IMAGE_MIMES)
  for (const role of roles) {
    const allowed = MIME_BY_ROLE[role as TeamMemberRole]
    if (allowed) allowed.forEach((m) => set.add(m))
  }
  return Array.from(set)
}

export function deliverableDir(projectId: string, stage: string, version: number): string {
  return path.join(DELIVERABLES_ROOT, projectId, stage, String(version))
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}

export async function partFileSize(partPath: string): Promise<number> {
  try {
    const stat = await fs.stat(partPath)
    return stat.size
  } catch {
    return 0
  }
}

function hasFfmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version'])
    proc.on('error', () => resolve(false))
    proc.on('exit', (code) => resolve(code === 0))
  })
}

function run(cmd: string, args: string[]): Promise<{ ok: boolean; stdout: string }> {
  return new Promise((resolve) => {
    let stdout = ''
    const proc = spawn(cmd, args)
    proc.stdout?.on('data', (d) => { stdout += d.toString() })
    proc.on('error', () => resolve({ ok: false, stdout }))
    proc.on('exit', (code) => resolve({ ok: code === 0, stdout }))
  })
}

/**
 * Best-effort thumbnail + duration extraction (CDC §7.2: ffmpeg extracts a
 * thumbnail + metadata post-upload). Silently skipped if ffmpeg/ffprobe
 * aren't installed on this machine — real deployments run this on the VPS.
 */
export async function extractVideoMetadata(filePath: string, dir: string): Promise<{ thumbnailPath: string | null; durationSeconds: number | null }> {
  if (!(await hasFfmpeg())) return { thumbnailPath: null, durationSeconds: null }

  const thumbPath = path.join(dir, 'thumbnail.jpg')
  await run('ffmpeg', ['-y', '-i', filePath, '-ss', '00:00:01', '-vframes', '1', thumbPath])

  const probe = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath])
  const duration = parseFloat(probe.stdout.trim())

  const thumbExists = await fs.access(thumbPath).then(() => true).catch(() => false)
  return {
    thumbnailPath: thumbExists ? thumbPath : null,
    durationSeconds: Number.isFinite(duration) ? Math.round(duration) : null,
  }
}
