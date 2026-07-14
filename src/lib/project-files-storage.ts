import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { DELIVERABLES_ROOT } from '@/lib/deliverable-storage'

// Sibling of DELIVERABLES_ROOT — reference documents (brief, contract, references…)
// attached to a project, separate from the deliverables review pipeline.
export const PROJECT_FILES_ROOT = path.join(path.dirname(DELIVERABLES_ROOT), 'project-files')

export const MAX_PROJECT_FILE_BYTES = 200 * 1024 * 1024 // 200 MB

export async function ensureProjectFilesDir(projectId: string): Promise<string> {
  const dir = path.join(PROJECT_FILES_ROOT, projectId)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export function storedFileName(originalName: string): string {
  const ext = path.extname(originalName)
  return `${randomUUID()}${ext}`
}
