import axios, { type AxiosInstance } from 'axios'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { API_ORIGIN, API_URL, AUTH_API_URL } from '../api/config'
import { apiErrorMessage } from '../api/http'
import { createHttp } from '../api/createHttp'
import { AUTH_EXPIRED_EVENT } from '../auth/storage'
import type { AuthUser, LoginResponse } from '../types'

export interface Session {
  accessToken: string
  user: AuthUser
  /** Increments on every login/logout so stale responses can be discarded. */
  generation: number
}

interface SessionContextValue {
  session: Session | null
  /** Authoring client bound to the current token, or null without session. */
  api: AxiosInstance | null
  /** Client used to download private images from the API origin. */
  images: AxiosInstance | null
  notice: string | null
  clearNotice: () => void
  /** True while the given generation is still the active session. */
  isCurrent: (generation: number) => boolean
  login: (username: string, password: string) => Promise<void>
  logout: (message?: string) => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

// Both authoring's {id, username} and Punto 3's {sub, name} are display data;
// authentication/ownership always remain the backend's responsibility.
function readPersistedSession(): LoginResponse | null {
  try {
    const accessToken = sessionStorage.getItem('token')
    const value: unknown = JSON.parse(sessionStorage.getItem('user') ?? 'null')
    if (!accessToken || !value || typeof value !== 'object') return null
    const user = value as Record<string, unknown>
    const id = typeof user.id === 'string' ? user.id : user.sub
    if (typeof id !== 'string' || !id.trim()) return null
    return { accessToken, user: {
      id,
      username: typeof user.username === 'string' ? user.username : typeof user.name === 'string' ? user.name : id,
      role: typeof user.role === 'string' ? user.role : '',
    } }
  } catch { return null }
}

// Keep both providers in sync when the session changes in this tab.
function notifyStoredSession() {
  window.dispatchEvent(new StorageEvent('storage', { key: 'token', storageArea: sessionStorage }))
}

function parseLogin(data: unknown): LoginResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Respuesta de autenticación inválida.')
  }
  const { accessToken, user } = data as {
    accessToken?: unknown
    user?: unknown
  }
  if (
    typeof accessToken !== 'string' ||
    !accessToken ||
    !user ||
    typeof user !== 'object'
  ) {
    throw new Error('Respuesta de autenticación inválida.')
  }
  const { id, username, role } = user as {
    id?: unknown
    username?: unknown
    role?: unknown
  }
  if (
    typeof id !== 'string' ||
    typeof username !== 'string' ||
    typeof role !== 'string'
  ) {
    throw new Error('Respuesta de autenticación inválida.')
  }
  return { accessToken, user: { id, username, role } }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const persisted = readPersistedSession()
    return persisted ? { ...persisted, generation: 0 } : null
  })
  const [notice, setNotice] = useState<string | null>(null)
  const sessionRef = useRef<Session | null>(session)
  const counter = useRef(0)
  const loginAttempt = useRef(0)

  const authClient = useMemo(
    () =>
      createHttp({
        baseURL: AUTH_API_URL,
        getToken: () => null,
        onUnauthorized: () => undefined,
      }),
    [],
  )

  const endSession = useCallback((message?: string) => {
    loginAttempt.current += 1
    sessionRef.current = null
    setSession(null)
    setNotice(message ?? null)
    counter.current += 1
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    notifyStoredSession()
  }, [])

  useEffect(() => {
    const sync = () => {
      const persisted = readPersistedSession()
      const current = sessionRef.current
      if (!persisted && !current) return
      if (persisted && current && persisted.accessToken === current.accessToken &&
        persisted.user.id === current.user.id && persisted.user.username === current.user.username &&
        persisted.user.role === current.user.role) return
      loginAttempt.current += 1
      counter.current += 1
      const next = persisted ? { ...persisted, generation: counter.current } : null
      sessionRef.current = next
      setSession(next)
    }
    const storage = (event: StorageEvent) => {
      if ((!event.storageArea || event.storageArea === sessionStorage) &&
        (event.key === null || event.key === 'token' || event.key === 'user')) sync()
    }
    sync()
    window.addEventListener('storage', storage)
    window.addEventListener(AUTH_EXPIRED_EVENT, sync)
    return () => {
      window.removeEventListener('storage', storage)
      window.removeEventListener(AUTH_EXPIRED_EVENT, sync)
    }
  }, [])

  const isCurrent = useCallback(
    (generation: number) => sessionRef.current?.generation === generation,
    [],
  )

  const login = useCallback(
    async (username: string, password: string) => {
      const attempt = ++loginAttempt.current
      try {
        const { data } = await authClient.post<unknown>('/login', {
          username,
          password,
        })
        const parsed = parseLogin(data)
        if (attempt !== loginAttempt.current) return
        counter.current += 1
        const next: Session = { ...parsed, generation: counter.current }
        sessionRef.current = next
        setSession(next)
        setNotice(null)
        sessionStorage.setItem('token', next.accessToken)
        sessionStorage.setItem('user', JSON.stringify({ ...next.user, sub: next.user.id, name: next.user.username }))
        notifyStoredSession()
      } catch (error) {
        if (attempt !== loginAttempt.current) return
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          throw new Error('Usuario o contraseña incorrectos.', { cause: error })
        }
        throw new Error(apiErrorMessage(error), { cause: error })
      }
    },
    [authClient],
  )

  const logout = useCallback(
    (message?: string) => {
      endSession(message)
    },
    [endSession],
  )

  const clients = useMemo(() => {
    if (!session) return { api: null, images: null }
    const generation = session.generation
    const getToken = () =>
      sessionRef.current?.generation === generation
        ? sessionRef.current.accessToken
        : null
    const onUnauthorized = () => {
      if (sessionRef.current?.generation === generation) {
        endSession('Tu sesión expiró. Ingresa de nuevo para continuar.')
      }
    }
    return {
      api: createHttp({ baseURL: API_URL, getToken, onUnauthorized }),
      images: createHttp({ baseURL: API_ORIGIN, getToken, onUnauthorized }),
    }
  }, [session, endSession])

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      api: clients.api,
      images: clients.images,
      notice,
      clearNotice: () => setNotice(null),
      isCurrent,
      login,
      logout,
    }),
    [session, clients, notice, isCurrent, login, logout],
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession debe usarse dentro de SessionProvider')
  return value
}
