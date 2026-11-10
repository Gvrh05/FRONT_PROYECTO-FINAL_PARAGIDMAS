export interface AuthUser {
  sub: string
  name?: string
  email?: string
  role?: string
}

export const AUTH_EXPIRED_EVENT = 'kahoot:auth-expired'

function parseUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== 'object' || !('sub' in value) || typeof value.sub !== 'string') return null
  const user = value as Record<string, unknown>
  return {
    sub: value.sub,
    ...(typeof user.name === 'string' && { name: user.name }),
    ...(typeof user.email === 'string' && { email: user.email }),
    ...(typeof user.role === 'string' && { role: user.role }),
  }
}

export function readStoredAuth(): { token: string | null; user: AuthUser | null } {
  const token = localStorage.getItem('token') || null
  let user: AuthUser | null = null
  try { user = parseUser(JSON.parse(localStorage.getItem('user') ?? 'null')) } catch { /* Invalid stored user is not trusted. */ }
  if (token && !user) {
    // Display only. Backend signature verification is always the authority.
    try {
      const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
      user = parseUser(JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='))))
    } catch { /* A malformed token will be rejected by the backend. */ }
  }
  return { token, user }
}

export function expireAuth(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
}
