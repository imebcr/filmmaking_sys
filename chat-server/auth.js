// Resolves who's connecting — same two identity systems the rest of the app uses:
// NextAuth (team members/commercials, session cookie) and Supabase Auth (admin,
// bearer token). This process is standalone, so both are verified by hand here
// rather than via Next.js's request helpers.
const { decode } = require('next-auth/jwt')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function parseCookies(cookieHeader) {
  const out = {}
  if (!cookieHeader) return out
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim())
  }
  return out
}

// Returns { editorId, name, privileged } or null if unauthenticated.
async function resolveIdentity(request) {
  const cookies = parseCookies(request.headers.cookie)
  const sessionCookie = cookies['next-auth.session-token'] || cookies['__Secure-next-auth.session-token']

  if (sessionCookie) {
    try {
      const token = await decode({ token: sessionCookie, secret: process.env.NEXTAUTH_SECRET })
      if (token?.id) {
        const roles = Array.isArray(token.roles) ? token.roles : []
        return { editorId: token.id, name: token.name || 'Membre', privileged: roles.includes('commercial') }
      }
    } catch (err) {
      console.warn('[chat-server] failed to decode NextAuth session cookie:', err.message)
    }
  }

  const url = new URL(request.url, 'http://localhost')
  const supabaseToken = url.searchParams.get('supabase_token')
  if (supabaseToken) {
    try {
      const { data, error } = await supabase.auth.getUser(supabaseToken)
      if (!error && data?.user) {
        return { editorId: null, name: 'Admin', privileged: true }
      }
    } catch (err) {
      console.warn('[chat-server] failed to validate Supabase token:', err.message)
    }
  }

  return null
}

async function memberHasProjectAccess(editorId, projectId) {
  const [stakeholderRes, assignmentRes] = await Promise.all([
    supabase.from('project_stakeholders').select('project_id').eq('editor_id', editorId).eq('project_id', projectId),
    supabase.from('editor_assignments').select('project_id').eq('editor_id', editorId).eq('project_id', projectId),
  ])
  return (stakeholderRes.data?.length ?? 0) > 0 || (assignmentRes.data?.length ?? 0) > 0
}

// Names of everyone currently attached to a project — used to resolve @mentions.
async function getProjectParticipants(projectId) {
  const [stakeholderRes, assignmentRes, projectRes] = await Promise.all([
    supabase.from('project_stakeholders').select('editor_id, name').eq('project_id', projectId),
    supabase.from('editor_assignments').select('editor_id, editor_name').eq('project_id', projectId),
    supabase.from('projects').select('commercial_id').eq('id', projectId).single(),
  ])

  const participants = new Map()
  for (const s of stakeholderRes.data ?? []) {
    if (s.editor_id && s.name) participants.set(s.editor_id, s.name)
  }
  for (const a of assignmentRes.data ?? []) {
    if (a.editor_id && a.editor_name) participants.set(a.editor_id, a.editor_name)
  }
  const commercialId = projectRes.data?.commercial_id
  if (commercialId && !participants.has(commercialId)) {
    const { data: commercial } = await supabase.from('editors').select('id, full_name').eq('id', commercialId).single()
    if (commercial) participants.set(commercial.id, commercial.full_name)
  }

  return Array.from(participants.entries()).map(([id, name]) => ({ id, name }))
}

module.exports = { resolveIdentity, memberHasProjectAccess, getProjectParticipants, supabase }
