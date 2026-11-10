import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { startSession } from '../api/gameSessions'
import { AppError } from '../api/http'
import { useAuth } from '../auth/useAuth'
import { ErrorBanner } from '../components/ErrorBanner'
import { LiveRoundPanel, FinalScores } from '../components/LiveRoundPanel'
import { ParticipantList } from '../components/ParticipantList'
import { RoomCodeBadge } from '../components/RoomCodeBadge'
import { useSessionLobby } from '../realtime/useSessionLobby'

export function HostLobbyPage({ roomCode }: { roomCode: string }) {
  const { user } = useAuth()
  const { session, connected, error, setError, applyStarted, loading, round, finished, pending, send } = useSessionLobby(roomCode)
  const [busy, setBusy] = useState(false)
  const alive = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  // The host is listed but NEVER counts: there must be another connected identity.
  // Do not replace this identity/presence check with participants.length >= 2.
  const hasOtherConnectedPlayer = session?.participants.some((p) => p.userId !== session.hostId && p.connected) ?? false
  const isHost = !!session && user?.sub === session.hostId
  const canStart = isHost && connected && hasOtherConnectedPlayer && session?.status === 'LOBBY' && !busy

  async function start() {
    if (!canStart) return
    setBusy(true)
    setError(null)
    try {
      // REST intentionally: HTTP authorization/phase errors go to ErrorBanner.
      const started = await startSession(roomCode)
      if (alive.current) applyStarted(started)
    } catch (failure) { if (alive.current) setError(failure) }
    finally { if (alive.current) setBusy(false) }
  }

  return <section className="card">
    <p className="eyebrow">Anfitrión · 2 de 2</p><h1>Tu sala está lista</h1>
    <ErrorBanner error={error || (session && !isHost ? new AppError('', 403) : null)} />
    {loading && <p role="status">Cargando la sala…</p>}
    {session && <>
      <RoomCodeBadge roomCode={session.roomCode} />
      <p className="connection" role="status">{connected ? 'Conexión en vivo activa' : 'Reconectando…'}</p>
      <p className="status" data-testid="session-status" role="status">{finished || session.status === 'FINISHED' ? 'La sala ha finalizado' : session.status === 'IN_PROGRESS' ? 'Partida en curso' : 'En lobby'}</p>
      <ParticipantList participants={session.participants} hostId={session.hostId} />
      {session.status === 'LOBBY' && <>
        {!hasOtherConnectedPlayer && <p>Espera a que se conecte otro jugador para iniciar.</p>}
        <button type="button" disabled={!canStart} onClick={() => void start()}>{busy ? 'Iniciando…' : 'Iniciar partida'}</button>
      </>}
      {finished ? <FinalScores scores={finished.scores} /> : isHost && round && <LiveRoundPanel round={round} connected={connected} host pending={pending} onNext={() => send('next-question', round.questionId)} />}
    </>}
    <Link to="/host/create">Crear otra sala</Link>
  </section>
}
