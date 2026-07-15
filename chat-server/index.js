require('./env').loadEnv()

const http = require('http')
const crypto = require('crypto')
const { WebSocketServer } = require('ws')
const { resolveIdentity, memberHasProjectAccess, getProjectParticipants, supabase } = require('./auth')
const { parseMentions } = require('./mentions')
const store = require('./store')

const PORT = process.env.CHAT_SERVER_PORT || 4001

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('chat-server ok')
})

const wss = new WebSocketServer({ noServer: true })

// projectId -> Set<ws>
const rooms = new Map()

function joinRoom(projectId, ws) {
  if (!rooms.has(projectId)) rooms.set(projectId, new Set())
  rooms.get(projectId).add(ws)
}

function leaveRoom(projectId, ws) {
  rooms.get(projectId)?.delete(ws)
  if (rooms.get(projectId)?.size === 0) rooms.delete(projectId)
}

function broadcast(projectId, payload) {
  const clients = rooms.get(projectId)
  if (!clients) return
  const json = JSON.stringify(payload)
  for (const client of clients) {
    if (client.readyState === client.OPEN) client.send(json)
  }
}

server.on('upgrade', async (request, socket, head) => {
  if (!request.url.startsWith('/ws/chat')) {
    socket.destroy()
    return
  }
  const identity = await resolveIdentity(request)
  if (!identity) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
    return
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    ws.identity = identity
    ws.currentProjectId = null
    wss.emit('connection', ws, request)
  })
})

wss.on('connection', (ws) => {
  ws.on('message', async (raw) => {
    let msg
    try { msg = JSON.parse(raw.toString()) } catch { return }

    if (msg.type === 'join') {
      const projectId = String(msg.projectId || '')
      if (!projectId) return

      if (!ws.identity.privileged) {
        const allowed = await memberHasProjectAccess(ws.identity.editorId, projectId)
        if (!allowed) {
          ws.send(JSON.stringify({ type: 'error', error: 'Accès refusé à ce projet.' }))
          return
        }
      }

      if (ws.currentProjectId) leaveRoom(ws.currentProjectId, ws)
      ws.currentProjectId = projectId
      joinRoom(projectId, ws)

      const history = store.getHistory(projectId)
      ws.send(JSON.stringify({ type: 'history', messages: history }))
      return
    }

    if (msg.type === 'message') {
      const projectId = ws.currentProjectId
      const body = typeof msg.body === 'string' ? msg.body.trim() : ''
      if (!projectId || !body) return

      if (!ws.identity.privileged) {
        const allowed = await memberHasProjectAccess(ws.identity.editorId, projectId)
        if (!allowed) return
      }

      const participants = await getProjectParticipants(projectId)
      const mentions = parseMentions(body, participants)

      const message = {
        id: crypto.randomUUID(),
        projectId,
        senderId: ws.identity.editorId,
        senderName: ws.identity.name,
        body,
        mentions,
        createdAt: new Date().toISOString(),
      }
      store.insertMessage(message)
      broadcast(projectId, { type: 'message', message })
      return
    }
  })

  ws.on('close', () => {
    if (ws.currentProjectId) leaveRoom(ws.currentProjectId, ws)
  })
})

// Every project that's currently 'delivered' gets its 24h countdown started (or
// left alone if already tracked); anything no longer 'delivered' has its countdown
// cancelled; anything past 24h gets its chat history wiped.
async function sweepDeliveredProjects() {
  try {
    const { data: delivered, error } = await supabase.from('projects').select('id').eq('stage', 'delivered')
    if (error) throw error
    const deliveredIds = new Set((delivered ?? []).map((p) => p.id))

    for (const id of deliveredIds) store.markDeliveredIfNew(id)

    // A project that left 'delivered' (e.g. reopened for a revision) cancels its countdown.
    for (const trackedId of store.getTrackedProjectIds()) {
      if (!deliveredIds.has(trackedId)) store.clearDeliveredMark(trackedId)
    }

    const purged = store.purgeExpiredSessions()
    if (purged.length > 0) console.log(`[chat-server] purged chat history for ${purged.length} project(s) 24h+ after delivery`)
  } catch (err) {
    console.error('[chat-server] sweep failed:', err.message)
  }
}

setInterval(sweepDeliveredProjects, 10 * 60 * 1000)
sweepDeliveredProjects()

server.listen(PORT, () => {
  console.log(`[chat-server] listening on port ${PORT}`)
})
