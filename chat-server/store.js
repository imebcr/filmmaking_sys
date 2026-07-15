// Chat storage — deliberately independent of Supabase. A single SQLite file on
// the VPS, using Node's built-in node:sqlite (no native build step, no extra
// dependency). Scale here is a handful of messages per project, so the
// synchronous API is more than fast enough and much simpler to reason about.
const { DatabaseSync } = require('node:sqlite')
const path = require('path')
const fs = require('fs')

const DB_PATH = process.env.CHAT_DB_PATH || path.join(__dirname, '..', 'storage', 'chat.db')
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const db = new DatabaseSync(DB_PATH)

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    sender_id TEXT,
    sender_name TEXT NOT NULL,
    body TEXT NOT NULL,
    mentions TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id, created_at);

  CREATE TABLE IF NOT EXISTS chat_sessions (
    project_id TEXT PRIMARY KEY,
    delivered_since TEXT NOT NULL
  );
`)

function insertMessage(msg) {
  const stmt = db.prepare(
    'INSERT INTO messages (id, project_id, sender_id, sender_name, body, mentions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
  stmt.run(msg.id, msg.projectId, msg.senderId, msg.senderName, msg.body, JSON.stringify(msg.mentions), msg.createdAt)
}

function getHistory(projectId, limit = 200) {
  const stmt = db.prepare(
    'SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC LIMIT ?',
  )
  return stmt.all(projectId, limit).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    body: row.body,
    mentions: JSON.parse(row.mentions),
    createdAt: row.created_at,
  }))
}

function markDeliveredIfNew(projectId) {
  const existing = db.prepare('SELECT project_id FROM chat_sessions WHERE project_id = ?').get(projectId)
  if (!existing) {
    db.prepare('INSERT INTO chat_sessions (project_id, delivered_since) VALUES (?, ?)').run(projectId, new Date().toISOString())
  }
}

function clearDeliveredMark(projectId) {
  db.prepare('DELETE FROM chat_sessions WHERE project_id = ?').run(projectId)
}

function getTrackedProjectIds() {
  return db.prepare('SELECT project_id FROM chat_sessions').all().map((r) => r.project_id)
}

function purgeExpiredSessions() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const expired = db.prepare('SELECT project_id FROM chat_sessions WHERE delivered_since < ?').all(cutoff)
  for (const row of expired) {
    db.prepare('DELETE FROM messages WHERE project_id = ?').run(row.project_id)
    db.prepare('DELETE FROM chat_sessions WHERE project_id = ?').run(row.project_id)
  }
  return expired.map((r) => r.project_id)
}

module.exports = { insertMessage, getHistory, markDeliveredIfNew, clearDeliveredMark, getTrackedProjectIds, purgeExpiredSessions }
