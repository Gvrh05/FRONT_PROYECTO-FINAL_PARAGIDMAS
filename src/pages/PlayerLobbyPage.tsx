import { Link } from 'react-router-dom'
import { ErrorBanner } from '../components/ErrorBanner'
import { ParticipantList } from '../components/ParticipantList'
import { RoomCodeBadge } from '../components/RoomCodeBadge'
import { useSessionLobby } from '../realtime/useSessionLobby'

export function PlayerLobbyPage({ roomCode }: { roomCode: string }) {
  // The shared hook ALWAYS sends join-session on connect/reconnect, even after REST join.
  const { session, connected, error, loading } = useSessionLobby(roomCode)
  return <section className="card">
    <p className="eyebrow">Jugador · 2 de 2</p><h1>Tu sala de juego</h1>
    <ErrorBanner error={error} />
    {loading && <p role="status">Recuperando tu sala…</p>}
    {session && <>
      <RoomCodeBadge roomCode={session.roomCode} />
      <p className="connection" role="status">{connected ? 'Conexión en vivo activa' : 'Reconectando…'}</p>
      <p className="status" data-testid="session-status" role="status">{session.status === 'IN_PROGRESS' ? 'Partida en curso' : session.status === 'FINISHED' ? 'La sala ha finalizado' : 'En lobby'}</p>
      <p>{session.status === 'LOBBY' ? 'Espera al anfitrión. La partida comenzará cuando todos estén listos.' : session.status === 'IN_PROGRESS' ? 'El anfitrión inició la partida. Las preguntas y respuestas corresponden al Punto 4.' : 'Esta sala ya terminó.'}</p>
      <ParticipantList participants={session.participants} hostId={session.hostId} />
    </>}
    <Link to="/join">Salir y buscar otra sala</Link>
  </section>
}
