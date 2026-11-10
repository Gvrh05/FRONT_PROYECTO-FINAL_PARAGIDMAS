import './LiveRoundPanel.css'
import { useEffect, useState } from 'react'
import { API_ORIGIN } from '../api/config'
import type { LiveRound } from '../api/gameSessions'

interface Props {
  round: LiveRound
  connected: boolean
  pending: boolean
  host?: boolean
  onAnswer?: (answer: boolean) => void
  onNext?: () => void
}

export function LiveRoundPanel({ round, connected, pending, host, onAnswer, onNext }: Props) {
  const [clock, setClock] = useState(() => ({ version: round.version, receivedAt: Date.now(), now: Date.now() }))
  useEffect(() => {
    const receivedAt = Date.now()
    const tick = () => setClock({ version: round.version, receivedAt, now: Date.now() })
    const timer = window.setInterval(tick, 150)
    return () => window.clearInterval(timer)
  }, [round.version, round.serverNow])
  const elapsed = clock.version === round.version ? clock.now - clock.receivedAt : 0
  const remaining = Math.max(0, Math.ceil((round.closesAt - round.serverNow - elapsed) / 1000))
  const disabled = !connected || pending || round.closed || round.answered || remaining === 0
  return <section className="live-round" aria-labelledby="live-question">
    <div className="round-meta">
      <span>Pregunta {round.position} de {round.total}</span>
      <strong role="timer">{round.closed ? 'Tiempo agotado' : remaining + ' s'}</strong>
    </div>
    <h2 id="live-question">{round.questionText}</h2>
    {round.imageUrl && <img className="round-image" src={new URL(round.imageUrl, API_ORIGIN).href} alt="Imagen de la pregunta" />}
    {round.closed ? <>
      <p className="round-result" role="status">
        Respuesta correcta <strong>{round.correctAnswer ? 'Verdadero' : 'Falso'}</strong>
        {!host && round.points !== undefined && <span> · {round.points} {round.points === 1 ? 'punto' : 'puntos'}</span>}
      </p>
      {host && <button type="button" disabled={!connected || pending} onClick={onNext}>
        {round.position === round.total ? 'Finalizar partida' : 'Siguiente pregunta'}
      </button>}
    </> : !host && <>
      <div className="round-actions">
        <button type="button" disabled={disabled} onClick={() => onAnswer?.(true)}>Verdadero</button>
        <button type="button" disabled={disabled} onClick={() => onAnswer?.(false)}>Falso</button>
      </div>
      <p role="status">{round.answered ? 'Respuesta registrada' : pending ? 'Enviando respuesta…' : remaining === 0 ? 'Esperando el cierre de la ronda…' : 'Selecciona una respuesta'}</p>
    </>}
  </section>
}

export function FinalScores({ scores }: { scores: { playerName: string; score: number; rank: number }[] }) {
  return <section className="live-round" aria-labelledby="final-scores">
    <h2 id="final-scores">Clasificación final</h2>
    <ul>{scores.map(({ playerName, score, rank }, index) => <li key={index}>{rank}. {playerName} · {score} {score === 1 ? 'punto' : 'puntos'}</li>)}</ul>
  </section>
}
