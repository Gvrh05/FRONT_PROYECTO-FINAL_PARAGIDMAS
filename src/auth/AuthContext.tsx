import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './auth-context'
import { AUTH_EXPIRED_EVENT, readStoredAuth } from './storage'
import type { AuthUser } from './storage'
import { disconnectGameSocket } from '../realtime/socket'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState(readStoredAuth)
  const logout = useCallback(() => {
    disconnectGameSocket()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setAuth({ token: null, user: null })
  }, [])
  const setSession = useCallback((token: string, user: AuthUser) => {
    disconnectGameSocket()
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setAuth({ token, user })
  }, [])

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === 'token' || event.key === 'user' || event.key === null) {
        disconnectGameSocket()
        setAuth(readStoredAuth())
      }
    }
    window.addEventListener('storage', sync)
    window.addEventListener(AUTH_EXPIRED_EVENT, logout)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(AUTH_EXPIRED_EVENT, logout)
    }
  }, [logout])

  return <AuthContext.Provider value={{ ...auth, setSession, logout }}>{children}</AuthContext.Provider>
}
