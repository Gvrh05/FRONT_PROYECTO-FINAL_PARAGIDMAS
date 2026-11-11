import type { Participant } from '../api/gameSessions'

export function ParticipantList({ participants, hostId }: { participants: Participant[]; hostId: string }) {
  return <section aria-labelledby="participants-title">
    <h2 id="participants-title">Participantes ({participants.length})</h2>
    {participants.length === 0 ? <p>Todavía no hay participantes.</p> : <ul className="participants" data-testid="participants">
      {participants.map((player) => <li key={player.userId}>
        <span className="participant-name">{player.name} {player.userId === hostId && <small>· Anfitrión</small>}</span>
        <span className={player.connected ? 'presence online' : 'presence'}>{player.connected ? 'En línea' : 'Sin conexión'}</span>
      </li>)}
    </ul>}
  </section>
}
