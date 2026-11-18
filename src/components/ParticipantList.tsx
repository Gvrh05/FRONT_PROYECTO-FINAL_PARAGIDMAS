import type { Participant } from '../api/gameSessions'
import { OwlAvatar } from './AvatarSelector'

export function ParticipantList({ participants, hostId, inLobby = true }: { participants: Participant[]; hostId: string; inLobby?: boolean }) {
  return <section aria-labelledby="participants-title">
    <h2 id="participants-title">Participantes ({participants.length})</h2>
    {participants.length === 0 ? <p>Todavía no hay participantes.</p> : <ul className="participants" data-testid="participants">
      {participants.map((player) => <li key={player.userId} className={`participant-card ${player.connected && player.ready ? 'participant-ready' : ''}`}>
        <OwlAvatar avatarId={player.avatarId} />
        <span className="participant-name">{player.name} {(player.userId === hostId || player.isHost) && <small>· Anfitrión</small>}<small>{player.userId === hostId || player.isHost ? 'Organiza la partida' : !player.connected ? 'Desconectado' : !inLobby ? 'Jugador' : player.ready ? '✓ Listo' : 'En espera'}</small></span>
        {!(player.userId === hostId || player.isHost) && <strong className="participant-score">{player.score ?? 0} pts</strong>}
        <span className={player.connected ? 'presence online' : 'presence'}>{player.connected ? 'En línea' : 'Sin conexión'}</span>
      </li>)}
    </ul>}
  </section>
}
