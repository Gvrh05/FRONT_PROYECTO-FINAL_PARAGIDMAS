import type { AuthUser } from './storage'

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

/** DEV ONLY: public example key, NOT a secret or a production authentication mechanism. */
export async function createDevSession(sub: 'test-host-id' | 'test-player-id') {
  if (!import.meta.env.DEV) throw new Error('El login de demo está deshabilitado en producción')
  // DEV ONLY — must match the backend's local demo JWT_SECRET. Never use real credentials here.
  const JWT_SECRET = 'super_secret_jwt_key_change_in_production'
  const user: AuthUser = { sub, name: sub === 'test-host-id' ? 'Host demo' : 'Player demo' }
  const encoder = new TextEncoder()
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const payload = base64url(encoder.encode(JSON.stringify({ ...user, iss: 'kahoot-auth-dev', aud: 'kahoot-game', iat: now, exp: now + 3600 })))
  const unsigned = `${header}.${payload}`
  const key = await crypto.subtle.importKey('raw', encoder.encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(unsigned))
  return { token: `${unsigned}.${base64url(new Uint8Array(signature))}`, user }
}
