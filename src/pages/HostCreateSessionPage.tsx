import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createGameSession, listAvailableQuizzes, quizIdSchema } from '../api/gameSessions'
import type { AvailableQuiz } from '../api/gameSessions'
import { ErrorBanner } from '../components/ErrorBanner'

export function HostCreateSessionPage() {
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState<AvailableQuiz[]>([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const alive = useRef(false)
  useEffect(() => {
    alive.current = true
    const controller = new AbortController()
    // EXCLUSIVELY this endpoint, never GET /quizzes or a silent mock fallback.
    void listAvailableQuizzes(controller.signal).then((rows) => {
      if (controller.signal.aborted) return
      setQuizzes(rows)
      setSelected(rows[0]?.id ?? '')
    }).catch((failure: unknown) => { if (!controller.signal.aborted) setError(failure) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => { alive.current = false; controller.abort() }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!quizIdSchema.safeParse(selected).success) { setError(new Error('Selecciona un cuestionario válido.')); return }
    setBusy(true)
    setError(null)
    try {
      const session = await createGameSession(selected)
      if (alive.current) navigate(`/host/lobby/${session.roomCode}`)
    } catch (failure) { if (alive.current) setError(failure) }
    finally { if (alive.current) setBusy(false) }
  }
  return <section className="card">
    <p className="eyebrow">Anfitrión · 1 de 2</p><h1>Crea tu sala</h1>
    <p>Elige un cuestionario que tenga solo preguntas Verdadero/Falso y comparte el código con tus jugadores.</p>
    <ErrorBanner error={error} />
    {loading ? <p role="status">Cargando tus cuestionarios…</p> : quizzes.length === 0
      ? !error && <p className="empty-state">Aún no tienes cuestionarios. Crea uno con preguntas de Verdadero/Falso para iniciar una partida.</p>
      : <form onSubmit={(event) => void submit(event)}>
        <label htmlFor="quiz">Tu cuestionario</label>
        <select id="quiz" value={selected} disabled={busy} onChange={(event) => setSelected(event.target.value)}>
          {quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
        </select>
        <button type="submit" disabled={busy || !selected}>{busy ? 'Creando sala…' : 'Crear sala'}</button>
      </form>}
  </section>
}
