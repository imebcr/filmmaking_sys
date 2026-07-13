import { createHash, randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash)
}

export function createRandomToken(byteLength = 32) {
  return randomBytes(byteLength).toString('hex')
}

export function createSixCharacterCode() {
  return randomBytes(4).toString('hex').slice(0, 6).toUpperCase()
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function expiresAt(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString()
}