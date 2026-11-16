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
import { InvitationLink } from '../components/InvitationLink'
import { savedAvatar } from '../components/AvatarSelector'
import { GoalKickHostPanel } from '../features/goal-kick/GoalKickHostPanel'
import './HostLobbyPage.css'

export function HostLobbyPage({ roomCode }: { roomCode: string }) {
  const { user } = useAuth()
  const [avatarId] = useState(savedAvatar)
  const { session, connected, error, setError, applyStarted, loading, round, finished, pending, send, goalKick, goalKickPending, goalKickError, sendGoalKickCommand } = useSessionLobby(roomCode, undefined, true, avatarId)
  const [busy, setBusy] = useState(false)
  const [activity, setActivity] = useState<'trivia' | 'goal-kick'>('trivia')
  const alive = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  // The host is listed but NEVER counts: there must be another connected identity.
  // Do not replace this identity/presence check with participants.length >= 2.
  const hasOtherConnectedPlayer = session?.participants.some((p) => p.userId !== session.hostId && p.connected) ?? false
  const isHost = !!session && user?.sub === session.hostId
  const canStart = isHost && connected && hasOtherConnectedPlayer && session?.status === 'LOBBY' && !busy && !goalKickPending && !goalKick
  const players = session?.participants.filter((player) => player.userId !== session.hostId) ?? []
  const readyCount = players.filter((player) => player.connected && player.ready).length
  const allReady = players.length > 0 && readyCount === players.length

  async function start() {
    if (!canStart) return
    if (activity === 'goal-kick') {
      sendGoalKickCommand({ action: 'start' })
      return
    }
    setBusy(true)
    setError(null)
    try {
      // REST intentionally: HTTP authorization/phase errors go to ErrorBanner.
      const started = await startSession(roomCode)
      if (alive.current) applyStarted(started)
    } catch (failure) { if (alive.current) setError(failure) }
    finally { if (alive.current) setBusy(false) }
  }

  return <section className="card reference-lobby glass-premium">
    <div className="reference-lobby-art" aria-hidden="true"><img src="/getanyui/graduation-cap.svg" alt="" width="40" height="40" /><span>Conecta con tu clase</span></div>
    <p className="eyebrow">Anfitrión · 2 de 2</p><h1>Tu sala está lista</h1>
    <ErrorBanner error={error || (session && !isHost ? new AppError('', 403) : null)} />
    {loading && <p role="status">Cargando la sala…</p>}
    {session && <>
      <RoomCodeBadge roomCode={session.roomCode} />
      {isHost && !goalKick && session.status === 'LOBBY' && session.invitationId && <InvitationLink invitationId={session.invitationId} />}
      <p className="connection" role="status">{connected ? 'Conexión en vivo activa' : 'Reconectando…'}</p>
      <p className="status" data-testid="session-status" role="status">{goalKick ? goalKick.phase === 'PLAYING' ? 'Tiro al Arco en curso' : 'Resultados de Tiro al Arco' : finished || session.status === 'FINISHED' ? 'La sala ha finalizado' : session.status === 'IN_PROGRESS' ? 'Partida en curso' : 'En lobby'}</p>
      <div className="game-layout"><div className="game-stage">
      {goalKick && isHost ? <GoalKickHostPanel state={goalKick} connected={connected} pending={goalKickPending} error={goalKickError} send={sendGoalKickCommand} /> : <>
      {session.status === 'LOBBY' && <>
        {!hasOtherConnectedPlayer && <p>Para iniciar, comparte el código con alguien que entre con otra cuenta. Si estás probando en el mismo equipo, abre una ventana privada e inicia sesión allí con la cuenta del jugador.</p>}
        <div className="lobby-welcome"><span className="lobby-owl" aria-hidden="true">🦉</span><h2>¡Preparados para aprender!</h2><p role="status">Listos: {readyCount} / {players.length}</p><p>{allReady ? 'Todos están listos. ¡Vamos a jugar!' : 'Los invitados pueden marcarse listos. También puedes forzar el inicio.'}</p></div>
        {isHost && <fieldset className="host-activity-selector" disabled={busy || goalKickPending || !connected}>
          <legend>Elige la actividad</legend>
          <div className="host-activity-options">
            <label className="host-activity-option">
              <input type="radio" name="host-activity" value="trivia" checked={activity === 'trivia'} onChange={() => setActivity('trivia')} aria-labelledby="trivia-mode" aria-describedby="trivia-description" />
              <span><strong id="trivia-mode">Trivia (Verdadero/Falso)</strong><small id="trivia-description">Responde las preguntas de tu cuestionario.</small></span>
            </label>
            <label className="host-activity-option">
              <input type="radio" name="host-activity" value="goal-kick" checked={activity === 'goal-kick'} onChange={() => setActivity('goal-kick')} aria-labelledby="goal-kick-mode" aria-describedby="goal-kick-description" />
              <span><strong id="goal-kick-mode">Minijuego: Tiro al Arco</strong><small id="goal-kick-description">Mete goles en 40 segundos. El profesor observa la clasificación.</small></span>
            </label>
          </div>
        </fieldset>}
        {isHost && <button className="start-game-button" type="button" disabled={!canStart} onClick={() => void start()}>{busy || goalKickPending ? 'Iniciando…' : activity === 'goal-kick' ? 'Iniciar Tiro al Arco · 40 s' : 'Comenzar Partida'}</button>}
        {goalKickError && <p role="alert">{goalKickError}</p>}
        {!allReady && canStart && <small>Comenzar ahora forzará el inicio aunque falten jugadores por prepararse.</small>}
      </>}
      {finished ? <FinalScores scores={finished.scores} /> : isHost && round && <LiveRoundPanel round={round} connected={connected} host pending={pending} onClose={() => send('close-voting', round.questionId)} onNext={() => send('next-question', round.questionId)} />}
      </>}
      </div><aside className="game-roster" aria-label="Jugadores de la sala">{goalKick && <p>Puntos de trivia (independientes)</p>}<ParticipantList participants={session.participants} hostId={session.hostId} inLobby={session.status === 'LOBBY' && !finished && !goalKick} /></aside></div>
    </>}
    <Link to="/host/create">Crear otra sala</Link>
  </section>
}
