import './LiveRoundPanel.css'
import { useEffect, useRef, useState } from 'react'
import { API_ORIGIN } from '../api/config'
import type { LiveRound } from '../api/gameSessions'
import { Podium } from './Podium'
import type { PodiumScore } from './Podium'
import { celebrateAnswer } from './answerConfetti'
import { RoundResultsChart } from './RoundResultsChart'

interface Props {
  round: LiveRound
  connected: boolean
  pending: boolean
  host?: boolean
  onAnswer?: (answer: boolean | number) => void
  onNext?: () => void
  onClose?: () => void
}

export function LiveRoundPanel({ round, connected, pending, host, onAnswer, onNext, onClose }: Props) {
  const [clock, setClock] = useState(() => ({ version: round.version, receivedAt: Date.now(), now: Date.now() }))
  useEffect(() => {
    const receivedAt = Date.now()
    const tick = () => setClock({ version: round.version, receivedAt, now: Date.now() })
    const timer = window.setInterval(tick, 150)
    return () => window.clearInterval(timer)
  }, [round.version, round.serverNow])
  const celebrated = useRef<string | null>(null)
  useEffect(() => {
    if (!host && round.resultReceived && round.closed && round.answered && (round.points ?? 0) > 0 && celebrated.current !== round.questionId) {
      celebrated.current = round.questionId
      celebrateAnswer(true)
    }
  }, [host, round.resultReceived, round.closed, round.answered, round.points, round.questionId])
  const elapsed = clock.version === round.version ? clock.now - clock.receivedAt : 0
  const remaining = Math.max(0, Math.ceil((round.closesAt - round.serverNow - elapsed) / 1000))
  const disabled = !connected || pending || round.closed || round.answered || remaining === 0
  function answer(value: boolean | number) {
    if (disabled || !onAnswer) return
    onAnswer(value)
  }
  const duration = round.openedAt === undefined ? 0 : round.closesAt - round.openedAt
  const remainingMs = Math.max(0, round.closesAt - round.serverNow - elapsed)
  const possiblePoints = round.scoringMode === 'speed' && duration > 0
    ? Math.max(5, 25 - Math.floor(21 * (duration - Math.min(duration, remainingMs)) / duration))
    : 25
  const correctAnswer = typeof round.correctAnswer === 'number'
    ? round.choices?.[round.correctAnswer]
    : round.correctAnswer === true ? 'Verdadero'
      : round.correctAnswer === false ? 'Falso' : undefined

  return <section className="live-round" aria-labelledby="live-question">
    <div className="round-meta">
      <span>Pregunta {round.position} de {round.total}</span>
      <strong role="timer">{round.closed ? 'Votación cerrada' : remaining + ' s'}</strong>
    </div>
    {round.votesReceived !== undefined && round.eligiblePlayers !== undefined && <div className="vote-counter" role="status" aria-live="polite"><strong>Votos recibidos: {round.votesReceived} / {round.eligiblePlayers}</strong><progress aria-label="Votos recibidos" max={Math.max(1, round.eligiblePlayers)} value={round.votesReceived} /></div>}
    {round.scoringMode && !round.closed && !round.answered && remaining > 0 &&
      <p className="round-points-preview">{possiblePoints} puntos por acierto ahora</p>}
    <h2 id="live-question">{round.questionText}</h2>
    {host && !round.closed && <div className="host-round-controls"><p>Puedes cerrar la votación ahora o esperar al temporizador.</p><button type="button" className="host-close-button" disabled={!connected || pending || !onClose} onClick={onClose}>Terminar votación</button></div>}
    {round.imageUrl && <img className="round-image" src={new URL(round.imageUrl, API_ORIGIN).href} alt="Imagen de la pregunta" />}
    {round.closed ? <>
      <p className="round-result" role="status">
        Respuesta correcta <strong>{correctAnswer}</strong>
        {!host && round.points !== undefined && <span> · {round.points} {round.points === 1 ? 'punto' : 'puntos'}</span>}
      </p>
      {!host && round.resultReceived && round.answered && (round.points ?? 0) > 0 && <div key={round.questionId} className="earned-points" role="status"><span className="earned-points-float" aria-hidden="true">+{round.points}</span><strong>+{round.points} puntos</strong><small>¡Respuesta correcta!{!round.scoringMode && round.points === 25 ? ' +5 por velocidad' : ''}</small></div>}
      {round.voteCounts && <RoundResultsChart counts={round.voteCounts} correctAnswer={typeof round.correctAnswer === 'boolean' ? round.correctAnswer : undefined} />}
      {round.choiceVotes && round.choices && <ul className="choice-results" aria-label="Votos por opción">
        {round.choices.map((choice, index) => <li key={index}>
          <strong>{choice}{round.correctAnswer === index ? ' · Correcta' : ''}</strong>
          <span>{round.choiceVotes?.[index] ?? 0} votos</span>
        </li>)}
      </ul>}
      {host && <button type="button" disabled={!connected || pending} onClick={onNext}>
        {round.position === round.total ? 'Finalizar partida' : 'Siguiente pregunta'}
      </button>}
    </> : !host && <>
      {round.choices ? <div className="round-actions multiple-choice-actions">
        {round.choices.map((choice, index) => <button key={index} type="button"
          className="trivia-answer" disabled={disabled} onClick={() => answer(index)}>
          <span aria-hidden="true" className="trivia-answer-symbol">{String.fromCharCode(65 + index)}</span>{choice}
        </button>)}
      </div> : <div className="round-actions">
        <button className="trivia-answer trivia-answer-true" type="button" disabled={disabled} onClick={() => answer(true)}><span aria-hidden="true" className="trivia-answer-symbol">✓</span>Verdadero</button>
        <button className="trivia-answer trivia-answer-false" type="button" disabled={disabled} onClick={() => answer(false)}><span aria-hidden="true" className="trivia-answer-symbol">✕</span>Falso</button>
      </div>}
      <p role="status">{round.answered ? 'Respuesta registrada' : pending ? 'Enviando respuesta…' : remaining === 0 ? 'Esperando el cierre de la ronda…' : 'Selecciona una respuesta'}</p>
    </>}
  </section>
}

export function FinalScores({ scores }: { scores: PodiumScore[] }) {
  return <section className="live-round" aria-labelledby="final-scores">
    <h2 id="final-scores">Clasificación final</h2>
    <Podium scores={scores} />
  </section>
}
