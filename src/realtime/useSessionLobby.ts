import { z } from 'zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { finishSchema, getSession, guestSnapshotSchema, liveRoundSchema, participantsUpdatedSchema, roomCodeSchema, sessionStartedSchema, snapshotSchema } from '../api/gameSessions'
import type { LiveRound, Participant, Session, SessionSnapshot } from '../api/gameSessions'
import { AppError } from '../api/http'
import { expireAuth } from '../auth/storage'
import { useAuth } from '../auth/useAuth'
import { leaseGameSocket } from './socket'

/** Mount with a roomCode key (see App routes) so no room can display another's state. */
export function useSessionLobby(roomCode: string, guestToken?: string) {
  const { token: accountToken } = useAuth()
  const token = guestToken ?? accountToken
  const [session, setSession] = useState<SessionSnapshot | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [connected, setConnected] = useState(false)
  const [round, setRound] = useState<LiveRound>()
  const [finished, setFinished] = useState<z.infer<typeof finishSchema>>()
  const [pending, setPending] = useState(false)
  const sendRef = useRef<(event: string, questionId: string, answer?: boolean) => void>(() => {})
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
    const active = () => leaseRef.current === key && (Boolean(guestToken) || sessionStorage.getItem('token') === token)
    const controller = new AbortController()
    const lease = leaseGameSocket(token, roomCode, Boolean(guestToken))
    const socket = lease.socket
    let receivedSnapshot = false
    let latestParticipants: Participant[] | null = null

    const applyRound = (game: LiveRound) => {
      setRound((previous) => {
        if (previous && previous.version > game.version) return previous
        if (previous?.questionId !== game.questionId) return game
        return {
          ...previous, ...game,
          answered: Boolean(previous.answered || game.answered),
        }
      })
    }
    const accept = (snapshot: SessionSnapshot) => {
      if (snapshot.game) applyRound(snapshot.game)
      setPending(false)
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
      const result = (guestToken ? guestSnapshotSchema : snapshotSchema).safeParse(payload)
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
      const message = payload && typeof payload === 'object' && 'message' in payload ? String(payload.message) : 'No se pudo completar la operación en vivo.'
      setPending(false)
      setError(new AppError(message, undefined, code))
      if (code === 'UNAUTHENTICATED' && !guestToken) expireAuth()
    }
    const onDisconnect = (reason: string) => {
      if (!active()) return
      setConnected(false)
      setPending(false)
      if (reason === 'io server disconnect') {
        if (!guestToken) expireAuth()
        else setError(new AppError('La credencial de invitado venció. Sal de la partida para volver a entrar.'))
      }
    }
    const onConnectError = () => {
      if (active()) { setConnected(false); setError(new AppError('No hay conexión en vivo. Revisa el backend; se intentará reconectar.')) }
    }
    const onRound = (payload: unknown) => {
      const result = z.object({ roomCode: roomCodeSchema, game: liveRoundSchema }).safeParse(payload)
      if (!active() || !result.success || result.data.roomCode !== roomCode) return
      applyRound(result.data.game)
      setPending(false)
      setError(null)
    }
    const onAccepted = (payload: unknown) => {
      const result = z.object({ roomCode: roomCodeSchema, questionId: z.uuid() }).safeParse(payload)
      if (!active() || !result.success || result.data.roomCode !== roomCode) return
      setRound((previous) => previous?.questionId === result.data.questionId ? { ...previous, answered: true } : previous)
      setPending(false)
    }
    const onFinished = (payload: unknown) => {
      const result = finishSchema.safeParse(payload)
      if (!active() || !result.success || result.data.roomCode !== roomCode) return
      setFinished(result.data)
      setPending(false)
    }
    sendRef.current = (event, questionId, answer) => {
      if (!active() || !socket.connected) return
      setPending(true)
      setError(null)
      socket.emit(event, { roomCode, questionId, ...(answer !== undefined && { answer }) })
    }
    socket.on('question-opened', onRound)
    socket.on('question-closed', onRound)
    socket.on('round-result', onRound)
    socket.on('answer-accepted', onAccepted)
    socket.on('game-finished', onFinished)
    socket.on('connect', onConnect)
    socket.on('session-state', onState)
    socket.on('participants-updated', onParticipants)
    socket.on('session-started', onStarted)
    socket.on('error', onError)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)

    if (!guestToken) void getSession(roomCode, controller.signal).then((snapshot) => {
      if (!active() || receivedSnapshot || Date.now() - lastStartedAt.current < 2000) return
      accept({ ...snapshot, participants: latestParticipants ?? snapshot.participants })
    }).catch((failure: unknown) => { if (active() && !controller.signal.aborted) setError(failure) })

    // StrictMode's first effect is cleaned before this microtask; only the live lease connects.
    queueMicrotask(() => { if (active()) { if (socket.connected) onConnect(); else socket.connect() } })
    return () => {
      if (active()) leaseRef.current = null
      controller.abort()
      socket.off('question-opened', onRound)
      socket.off('question-closed', onRound)
      socket.off('round-result', onRound)
      socket.off('answer-accepted', onAccepted)
      socket.off('game-finished', onFinished)
      socket.off('connect', onConnect)
      socket.off('session-state', onState)
      socket.off('participants-updated', onParticipants)
      socket.off('session-started', onStarted)
      socket.off('error', onError)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      lease.release()
    }
  }, [roomCode, token, guestToken])

  const invalid = !roomCodeSchema.safeParse(roomCode).success
  return { session, connected, round, finished, pending, send: (event: string, questionId: string, answer?: boolean) => sendRef.current(event, questionId, answer), error: invalid ? new AppError('El código de sala debe tener exactamente 6 dígitos.') : error, setError, applyStarted, loading: !session && !error && !invalid }
}
