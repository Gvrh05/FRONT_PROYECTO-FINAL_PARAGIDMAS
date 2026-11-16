import { useEffect, useRef, useState } from 'react'
import type { GoalKickCommand, GoalKickState } from './contracts'
import { GoalKickCanvas } from './GoalKickCanvas'
import { useGoalKickPresentation } from './useGoalKickPresentation'
import { Podium } from '../../components/Podium'
import { celebrateAnswer } from '../../components/answerConfetti'
import './goal-kick.css'

export interface GoalKickProps { state: GoalKickState; connected: boolean; pending: boolean; error: string; send: (command: GoalKickCommand) => void }
export function GoalKickGame(props: GoalKickProps) {
  return props.state.view === 'player' ? <GoalKickPlayer {...props} state={props.state} /> : null
}
const messages = { GOAL: '¡GOL! +10 puntos', DEFENDER_BLOCK: 'El defensa bloqueó el tiro', KEEPER_SAVE: '¡Atajada del portero!', FRAME_HIT: '¡Al poste!', WIDE: 'El balón salió fuera', TIMEOUT: 'Terminó el tiempo' }
function GoalKickPlayer({ state, connected, pending, error, send }: GoalKickProps & { state: GoalKickState & { view: 'player' } }) {
  const { sample, activate, recover, remaining, stage } = useGoalKickPresentation(state, connected, pending, send)
  const [debug, setDebug] = useState(false)
  const celebrated = useRef<string | null>(null)
  const result = state.player.lastResult
  useEffect(() => {
    if (result?.outcome === 'GOAL' && result.shotId === state.resultEventShotId && celebrated.current !== result.shotId) { celebrated.current = result.shotId; celebrateAnswer(true) }
  }, [result, state.resultEventShotId])
  const score = state.scoreboard.find(p => p.playerId === state.player.playerId)
  const disabled = !connected || pending || state.phase !== 'PLAYING' || remaining === 0 || state.player.status !== 'READY' || stage === 'SUBMITTING' || state.physicsVersion !== 1
  return <section className="goal-kick-panel" aria-label="Tiro al Arco">
    <h2>Tiro al Arco</h2><div className="goal-kick-hud"><strong role="timer">{remaining} s</strong><span>{score?.goals ?? 0} goles · {score?.score ?? 0} puntos</span></div>
    {state.physicsVersion !== 1 && <p role="alert">Versión de física no compatible. Actualiza la aplicación.</p>}
    {state.phase === 'PLAYING' ? <>
      <p>1. Fija dirección · 2. Fija curva y tira. Cada gol vale 10 puntos.</p>
      <GoalKickCanvas board={state.player.board} playerName={state.player.playerName} sample={sample} activate={activate} debug={debug} />
      <button type="button" className="goal-kick-action" disabled={disabled} onClick={activate}>{!connected ? 'Sin conexión' : pending || stage === 'SUBMITTING' ? 'Esperando confirmación…' : state.player.status === 'FLIGHT' ? 'Balón en vuelo…' : state.player.status === 'RESULT' ? 'Preparando intento…' : remaining === 0 ? 'Esperando resultado final…' : stage === 'CURVE' ? 'Fijar curva y tirar' : 'Fijar dirección'}</button>
      {import.meta.env.DEV && <label className="goal-kick-debug"><input type="checkbox" checked={debug} onChange={e => setDebug(e.target.checked)} />Mostrar hitboxes (desarrollo)</label>}
    </> : <><p role="status">{state.phase === 'CANCELLED' ? 'Actividad cancelada por el anfitrión' : '¡Tiempo terminado!'}</p><Podium scores={state.scoreboard} /><p>Espera a que el anfitrión vuelva al lobby.</p></>}
    {result && <p className={result.outcome === 'GOAL' ? 'goal-kick-feedback goal-kick-goal' : 'goal-kick-feedback'} role="status">{messages[result.outcome]}</p>}
    {error && <p role="alert">{error}</p>}
    <button type="button" className="secondary" disabled={!connected || pending} onClick={recover}>Sincronizar</button>
  </section>
}
