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

// Returns { editorId, name, privileged, isAdmin } or null if unauthenticated.
// privileged = admin OR a team member with the commercial role (both bypass the
// per-project access check). isAdmin further distinguishes the two — a true admin
// sees every project's chat activity in their bell, while a commercial only sees
// the projects they're actually responsible for.
async function resolveIdentity(request) {
  const cookies = parseCookies(request.headers.cookie)
  const sessionCookie = cookies['next-auth.session-token'] || cookies['__Secure-next-auth.session-token']

  if (sessionCookie) {
    try {
      const token = await decode({ token: sessionCookie, secret: process.env.NEXTAUTH_SECRET })
      if (token?.id) {
        const roles = Array.isArray(token.roles) ? token.roles : []
        return { editorId: token.id, name: token.name || 'Membre', privileged: roles.includes('commercial'), isAdmin: false }
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
      if (!error && data?.user?.email) {
        // The admin gets an editors row auto-provisioned on login (see
        // /api/admin/ensure-commercial-identity) — reuse its id here too, so mentions
        // and notifications work for admin the same way they do for anyone else.
        const { data: editor } = await supabase.from('editors').select('id, full_name').eq('email', data.user.email).maybeSingle()
        return { editorId: editor?.id ?? null, name: editor?.full_name ?? 'Admin', privileged: true, isAdmin: true }
      }
    } catch (err) {
      console.warn('[chat-server] failed to validate Supabase token:', err.message)
    }
  }

  return null
}

// Project ids a commercial is actually responsible for — scopes their "every message"
// bell feed so they don't see chat activity from projects they have nothing to do with.
async function getCommercialProjectIds(editorId) {
  const { data } = await supabase.from('projects').select('id').eq('commercial_id', editorId)
  return (data ?? []).map((p) => p.id)
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

// Mirrors STAGE_LABELS in src/lib/types.ts — duplicated since this process can't import
// across the Next.js build boundary.
const STAGE_LABELS = {
  incoming: 'Incoming',
  'pre-production': 'Pré-production',
  shooting: 'Tournage',
  editing: 'Montage',
  delivered: 'Livré',
}

async function getProjectInfo(projectId) {
  const { data } = await supabase.from('projects').select('client_name, stage').eq('id', projectId).single()
  return {
    name: data?.client_name ?? 'un projet',
    stageLabel: data?.stage ? (STAGE_LABELS[data.stage] ?? data.stage) : null,
  }
}

// Telegram chat id + preference for each mentioned editor, so the server can notify them.
async function getTelegramTargets(editorIds) {
  if (editorIds.length === 0) return []
  const { data } = await supabase
    .from('editors')
    .select('id, telegram_chat_id, notification_preferences')
    .in('id', editorIds)
  return (data ?? [])
    .filter((e) => e.telegram_chat_id && e.notification_preferences?.telegram !== false)
    .map((e) => ({ id: e.id, chatId: e.telegram_chat_id }))
}

module.exports = { resolveIdentity, memberHasProjectAccess, getProjectParticipants, getProjectInfo, getTelegramTargets, getCommercialProjectIds, supabase }
