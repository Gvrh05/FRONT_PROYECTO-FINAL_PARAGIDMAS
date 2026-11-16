import { OwlAvatar } from './AvatarSelector'

export interface PodiumScore { playerName: string; score: number; rank: number; avatarId?: number }

export function Podium({ scores }: { scores: PodiumScore[] }) {
  const sorted = [...scores].sort((a, b) => a.rank - b.rank)
  const top = sorted.slice(0, 3)
  const medals = ['🥇', '🥈', '🥉']
  return <section className="podium" aria-labelledby="podium-title">
    <p className="eyebrow">¡Una gran partida!</p><h2 id="podium-title">Podio de ganadores</h2>
    {sorted.length === 0 ? <p>No hay puntuaciones registradas.</p> : <>
      <div className="podium-steps">{top.map((player, index) => <article className={`podium-place podium-place-${index + 1}`} key={index}>
        <span className="podium-medal" role="img" aria-label={`Puesto ${player.rank}`}>{medals[Math.min(player.rank - 1, 2)]}</span>
        <div className="podium-winner"><OwlAvatar avatarId={player.avatarId} /><h3>{player.playerName}</h3><strong>{player.score} {player.score === 1 ? 'punto' : 'puntos'}</strong></div><div className="podium-platform"><span className="podium-rank">{player.rank}º</span></div>
      </article>)}</div>
      {sorted.length > 3 && <div className="score-table-wrap"><table className="score-table"><caption>Resto de participantes</caption><thead><tr><th scope="col">Lugar</th><th scope="col">Participante</th><th scope="col">Puntos</th></tr></thead><tbody>{sorted.slice(3).map((player, index) => <tr key={index}><td>{player.rank}</td><th scope="row"><OwlAvatar avatarId={player.avatarId} />{player.playerName}</th><td>{player.score}</td></tr>)}</tbody></table></div>}
    </>}
  </section>
}
