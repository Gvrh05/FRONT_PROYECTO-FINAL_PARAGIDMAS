import { useEffect, useState } from 'react'
import { apiErrorMessage } from '../api/http'
import { deleteQuiz, listQuizzes } from '../api/quizzes'
import type { QuizSummary } from '../types'
import { useSession } from '../session/session'
import { ConfirmDialog } from './ConfirmDialog'

interface QuizListProps {
  onCreate: () => void
  onOpen: (quizId: string) => void
  onEdit: (quiz: QuizSummary) => void
}

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; quizzes: QuizSummary[] }

export function QuizList({ onCreate, onOpen, onEdit }: QuizListProps) {
  const { api, session, isCurrent, logout } = useSession()
  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<QuizSummary | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!api || !session) return
    const generation = session.generation
    const controller = new AbortController()
    setState({ status: 'loading' })
    setActionError(null)
    listQuizzes(api, controller.signal).then(
      (quizzes) => {
        if (isCurrent(generation)) setState({ status: 'ready', quizzes })
      },
      (error) => {
        if (!isCurrent(generation)) return
        if ((error as { code?: string }).code === 'ERR_CANCELED') return
        setState({ status: 'error', message: apiErrorMessage(error) })
      },
    )
    return () => controller.abort()
  }, [api, session, isCurrent, reloadKey])

  async function confirmDelete() {
    if (!api || !session || !deleteTarget || deleting) return
    setDeleting(true)
    setActionError(null)
    const generation = session.generation
    try {
      await deleteQuiz(api, deleteTarget.id)
      if (!isCurrent(generation)) return
      setState((current) =>
        current.status === 'ready'
          ? {
              status: 'ready',
              quizzes: current.quizzes.filter(
                (quiz) => quiz.id !== deleteTarget.id,
              ),
            }
          : current,
      )
      setDeleteTarget(null)
    } catch (error) {
      if (!isCurrent(generation)) return
      if ((error as { response?: { status?: number } }).response?.status === 401) {
        logout()
        return
      }
      setActionError(apiErrorMessage(error))
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section aria-labelledby="quiz-list-title">
      <div className="section-header">
      <h2 id="quiz-list-title">Todos los cuestionarios</h2>
        <button type="button" onClick={onCreate}>
          Nuevo cuestionario
        </button>
      </div>

      {actionError ? (
        <p role="alert" className="alert">
          {actionError}
        </p>
      ) : null}

      {state.status === 'loading' ? (
        <p role="status" className="muted">
          Cargando cuestionarios…
        </p>
      ) : null}

      {state.status === 'error' ? (
        <div className="alert" role="alert">
          <p>{state.message}</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
            Reintentar
          </button>
        </div>
      ) : null}

      {state.status === 'ready' && state.quizzes.length === 0 ? (
        <div className="empty">
          <p>Todavía no tienes cuestionarios.</p>
          <button type="button" onClick={onCreate}>
            Crear mi primer cuestionario
          </button>
        </div>
      ) : null}

      {state.status === 'ready' && state.quizzes.length > 0 ? (
        <ul className="quiz-list">
          {state.quizzes.map((quiz) => (
            <li key={quiz.id} className="card quiz-item">
              <div>
                <h3>{quiz.title}</h3>
                {quiz.isDemo ? <span className="badge">Demo · solo lectura</span> : null}
                {quiz.description ? (
                  <p className="muted">{quiz.description}</p>
                ) : null}
                <p className="hint">
                  Actualizado: {formatDate(quiz.updatedAt)}
                </p>
              </div>
              <div className="actions">
                <button type="button" onClick={() => onOpen(quiz.id)}>
                  Abrir
                </button>
                {!quiz.isDemo ? (
                  <>
                    <button type="button" onClick={() => onEdit(quiz)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => setDeleteTarget(quiz)}
                      disabled={deleting}
                    >
                      Eliminar
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar cuestionario"
        message={
          deleteTarget
            ? `Se eliminarán «${deleteTarget.title}», sus preguntas, opciones e imágenes. Esta acción no se puede deshacer.`
            : ''
        }
        pending={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('es', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}
