import { useCallback, useEffect, useRef, useState } from 'react'
import { getSession, participantsUpdatedSchema, roomCodeSchema, sessionStartedSchema, snapshotSchema } from '../api/gameSessions'
import type { Participant, Session, SessionSnapshot } from '../api/gameSessions'
import { AppError } from '../api/http'
import { expireAuth } from '../auth/storage'
import { useAuth } from '../auth/useAuth'
import { leaseGameSocket } from './socket'

/** Mount with a roomCode key (see App routes) so no room can display another's state. */
export function useSessionLobby(roomCode: string) {
  const { token } = useAuth()
  const [session, setSession] = useState<SessionSnapshot | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [connected, setConnected] = useState(false)
  const leaseRef = useRef<symbol | null>(null)
  const lastStartedAt = useRef(0)
  const startedEvent = useRef<{ sessionId: string; startedAt: string } | null>(null)

  const applyStarted = useCallback((value: Session) => {
    lastStartedAt.current = Date.now()
    startedEvent.current = { sessionId: value.sessionId, startedAt: value.startedAt ?? new Date().toISOString() }
    setSession((previous) => previous ? { ...previous, ...value, status: 'IN_PROGRESS' } : previous)
  }, [])

  useEffect(() => {
    if (!token || !roomCodeSchema.safeParse(roomCode).success) return
    const key = Symbol(roomCode)
    leaseRef.current = key
    const active = () => leaseRef.current === key
    const controller = new AbortController()
    const lease = leaseGameSocket(token, roomCode)
    const socket = lease.socket
    let receivedSnapshot = false
    let latestParticipants: Participant[] | null = null

    const accept = (snapshot: SessionSnapshot) => {
      const event = startedEvent.current
      const next = event?.sessionId === roomCode && snapshot.status === 'LOBBY'
        ? { ...snapshot, status: 'IN_PROGRESS' as const, startedAt: event.startedAt }
        : snapshot
      setSession((previous) => previous?.status === 'IN_PROGRESS' && next.status === 'LOBBY' ? previous : next)
    }
    const onConnect = () => {
      if (!active()) return
      setConnected(true)
      // ALWAYS join after every connect, even if GET already lists this identity.
      socket.emit('join-session', { roomCode })
    }
    const onState = (payload: unknown) => {
      if (!active()) return
      const result = snapshotSchema.safeParse(payload)
      if (!result.success || result.data.roomCode !== roomCode) return
      receivedSnapshot = true
      latestParticipants = result.data.participants
      accept(result.data)
      setError(null)
    }
    const onParticipants = (payload: unknown) => {
      if (!active()) return
      const result = participantsUpdatedSchema.safeParse(payload)
      if (!result.success) return
      latestParticipants = result.data.participants
      setSession((previous) => previous ? { ...previous, participants: result.data.participants } : previous)
    }
    const onStarted = (payload: unknown) => {
      if (!active()) return
      const result = sessionStartedSchema.safeParse(payload)
      if (!result.success || result.data.sessionId !== roomCode) return
      lastStartedAt.current = Date.now()
      startedEvent.current = result.data
      setSession((previous) => previous ? { ...previous, status: 'IN_PROGRESS', startedAt: result.data.startedAt } : previous)
    }
    const onError = (payload: unknown) => {
      if (!active()) return
      const code = payload && typeof payload === 'object' && 'code' in payload ? String(payload.code) : 'INTERNAL_ERROR'
      setError(new AppError('No se pudo completar la operación en vivo.', undefined, code))
      if (code === 'UNAUTHENTICATED') expireAuth()
    }
    const onDisconnect = (reason: string) => {
      if (!active()) return
      setConnected(false)
      if (reason === 'io server disconnect') expireAuth()
    }
    const onConnectError = () => {
      if (active()) { setConnected(false); setError(new AppError('No hay conexión en vivo. Revisa el backend; se intentará reconectar.')) }
    }
    socket.on('connect', onConnect)
    socket.on('session-state', onState)
    socket.on('participants-updated', onParticipants)
    socket.on('session-started', onStarted)
    socket.on('error', onError)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)

    void getSession(roomCode, controller.signal).then((snapshot) => {
      if (!active() || receivedSnapshot || Date.now() - lastStartedAt.current < 2000) return
      accept({ ...snapshot, participants: latestParticipants ?? snapshot.participants })
    }).catch((failure: unknown) => { if (active() && !controller.signal.aborted) setError(failure) })

    // StrictMode's first effect is cleaned before this microtask; only the live lease connects.
    queueMicrotask(() => { if (active()) { if (socket.connected) onConnect(); else socket.connect() } })
    return () => {
      if (active()) leaseRef.current = null
      controller.abort()
      socket.off('connect', onConnect)
      socket.off('session-state', onState)
      socket.off('participants-updated', onParticipants)
      socket.off('session-started', onStarted)
      socket.off('error', onError)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      lease.release()
    }
  }, [roomCode, token])

  const invalid = !roomCodeSchema.safeParse(roomCode).success
  return { session, connected, error: invalid ? new AppError('El código de sala debe tener exactamente 6 dígitos.') : error, setError, applyStarted, loading: !session && !error && !invalid }
}
