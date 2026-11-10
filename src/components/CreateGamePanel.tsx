import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { API_ORIGIN } from '../api/config'
import { apiErrorMessage } from '../api/http'
import { listQuizzes } from '../api/quizzes'
import { useSession } from '../session/session'
import type { QuizSummary } from '../types'

export function CreateGamePanel() {
  const { api, session, isCurrent, logout } = useSession()
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([])
  const [quizId, setQuizId] = useState('')
  const [pin, setPin] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!api || !session) return
    const generation = session.generation
    const controller = new AbortController()
    listQuizzes(api, controller.signal).then(
      (result) => {
        if (!isCurrent(generation)) return
        setQuizzes(result)
        setQuizId((current) => current || result[0]?.id || '')
        setLoading(false)
      },
      (reason: unknown) => {
        if (!isCurrent(generation) || (reason as { code?: string }).code === 'ERR_CANCELED') return
        if ((reason as { response?: { status?: number } }).response?.status === 401) logout()
        else setError(apiErrorMessage(reason))
        setLoading(false)
      },
    )
    return () => controller.abort()
  }, [api, session, isCurrent, logout])

  async function createRoom() {
    if (!session || !quizId || pending) return
    setPending(true)
    setError(null)
    setPin(null)
    const socket = io(API_ORIGIN, { auth: { token: session.accessToken } })
    try {
      const result = await new Promise<{ success?: boolean; pin?: string; message?: string }>((resolve, reject) => {
        socket.once('connect_error', reject)
        socket.timeout(8000).emit('create_session', { quizId }, (error: Error | null, response: { success?: boolean; pin?: string; message?: string }) => {
          if (error) reject(error)
          else resolve(response)
        })
      })
      if (!result.success || !result.pin) throw new Error(result.message || 'No se pudo crear la sala.')
      setPin(result.pin)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo crear la sala.')
    } finally {
      socket.disconnect()
      setPending(false)
    }
  }

  return (
    <section className="feature-panel" aria-labelledby="create-game-title">
      <p className="eyebrow">En vivo</p>
      <h2 id="create-game-title">Crear partida</h2>
      <p className="muted">Elige un cuestionario para abrir una sala y compartir su PIN.</p>
      {error ? <p className="alert" role="alert">{error}</p> : null}
      {loading ? <p role="status">Cargando cuestionarios…</p> : null}
      {!loading && quizzes.length === 0 ? <p className="empty">Crea o importa un cuestionario antes de iniciar una partida.</p> : null}
      {!loading && quizzes.length > 0 ? (
        <div className="field room-picker">
          <label htmlFor="game-quiz">Cuestionario</label>
          <select id="game-quiz" value={quizId} onChange={(event) => setQuizId(event.target.value)}>
            {quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}{quiz.isDemo ? ' · Demo' : ''}</option>)}
          </select>
          <button type="button" onClick={createRoom} disabled={!quizId || pending}>
            {pending ? 'Creando sala…' : 'Crear sala'}
          </button>
        </div>
      ) : null}
      {pin ? <div className="pin-card" role="status"><span>PIN de la partida</span><strong>{pin}</strong><small>Comparte este código con los participantes.</small></div> : null}
    </section>
  )
}
