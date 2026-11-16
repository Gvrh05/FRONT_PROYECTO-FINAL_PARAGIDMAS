import { useEffect, useState } from 'react'
import type { GoalKickProps } from './GoalKickGame'
import { Podium } from '../../components/Podium'
import './goal-kick.css'
export function GoalKickHostPanel({ state, connected, pending, error, send }: GoalKickProps) {
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(performance.now()), 100); return () => clearInterval(timer) }, [])
  const remaining = Math.max(0, Math.ceil((state.endsAt - state.serverNow - now + state.receivedAt) / 1000))
  return <section className="goal-kick-panel"><h2>Tiro al Arco · Anfitrión</h2><p>Observas la partida. Los puntos del fútbol son independientes de la trivia.</p><strong className="goal-kick-host-clock" role="timer">{remaining} s</strong>
    {state.phase === 'PLAYING' ? <><ol className="goal-kick-scores">{state.scoreboard.map(p => <li key={p.playerId}><span>{p.playerName}</span><strong>{p.goals} goles · {p.score} pts</strong></li>)}</ol><button type="button" className="danger" disabled={!connected || pending} onClick={() => send({ action: 'cancel', gameId: state.gameId })}>Cancelar minijuego</button></> : <><p>{state.phase === 'CANCELLED' ? 'Minijuego cancelado' : 'Resultados finales'}</p><Podium scores={state.scoreboard} /><button type="button" disabled={!connected || pending} onClick={() => send({ action: 'return', gameId: state.gameId })}>Volver al lobby</button></>}
    {error && <p role="alert">{error}</p>}<button type="button" className="secondary" disabled={!connected || pending} onClick={() => send({ action: 'sync', gameId: state.gameId })}>Sincronizar</button>
  </section>
}
