import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ErrorBanner } from '../components/ErrorBanner'
import { LiveRoundPanel, FinalScores } from '../components/LiveRoundPanel'
import { ParticipantList } from '../components/ParticipantList'
import { RoomCodeBadge } from '../components/RoomCodeBadge'
import { useSessionLobby } from '../realtime/useSessionLobby'
import { savedAvatar } from '../components/AvatarSelector'
import { useState } from 'react'
import { GoalKickGame } from '../features/goal-kick/GoalKickGame'
import { GoalKickRoomDetails } from '../features/goal-kick/GoalKickRoomDetails'

export function PlayerLobbyPage({ roomCode }: { roomCode: string }) {
  const { user } = useAuth()
  // The shared hook ALWAYS sends join-session on connect/reconnect, even after REST join.
  const [avatarId] = useState(savedAvatar)
  const { session, connected, error, loading, round, finished, pending, send, setReady, goalKick, goalKickPending, goalKickError, sendGoalKickCommand } = useSessionLobby(roomCode, undefined, false, avatarId)
  if (session && session.hostId === user?.sub) {
    return <Navigate to={`/host/lobby/${session.roomCode}`} replace />
  }
  return <section className="card">
    <p className="eyebrow">Jugador · 2 de 2</p><h1>Tu sala de juego</h1>
    <ErrorBanner error={error} />
    {loading && <p role="status">Recuperando tu sala…</p>}
    {session && <>
      <GoalKickRoomDetails details={session.roomDetails} />
      <RoomCodeBadge roomCode={session.roomCode} />
      <p className="connection" role="status">{connected ? 'Conexión en vivo activa' : 'Reconectando…'}</p>
      <p className="status" data-testid="session-status" role="status">{finished || session.status === 'FINISHED' ? 'La sala ha finalizado' : session.status === 'IN_PROGRESS' ? 'Partida en curso' : 'En lobby'}</p>
      {!finished && !goalKick && <p>{session.status === 'LOBBY' ? 'Espera al anfitrión. La partida comenzará cuando todos estén listos.' : session.status === 'IN_PROGRESS' ? 'El anfitrión inició la partida.' : 'Esta sala ya terminó.'}</p>}
      {session.status === 'LOBBY' && !goalKick && <button type="button" disabled={!connected} aria-pressed={Boolean(session.participants.find((p) => p.userId === user?.sub)?.ready)} onClick={() => setReady(!session.participants.find((p) => p.userId === user?.sub)?.ready)}>¡Estoy listo!</button>}
      <div className="game-layout"><div className="game-stage">{goalKick ? <GoalKickGame state={goalKick} connected={connected} pending={goalKickPending} error={goalKickError} send={sendGoalKickCommand} /> : finished ? <FinalScores scores={finished.scores} /> : round && <LiveRoundPanel round={round} connected={connected} pending={pending} onAnswer={(answer) => send('submit-answer', round.questionId, answer)} />}</div>
      <aside className="game-roster" aria-label="Jugadores de la sala">{goalKick && <p>Puntos de trivia (independientes)</p>}<ParticipantList participants={session.participants} hostId={session.hostId} inLobby={session.status === 'LOBBY' && !finished && !goalKick} /></aside></div>
    </>}
    <Link to="/join">Salir y buscar otra sala</Link>
  </section>
}
