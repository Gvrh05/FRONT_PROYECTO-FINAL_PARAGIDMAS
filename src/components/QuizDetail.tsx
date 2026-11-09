import { useEffect, useState } from 'react'
import { apiErrorMessage } from '../api/http'
import { deleteQuestion, deleteQuiz, getQuiz } from '../api/quizzes'
import type { QuestionResource, QuizDetail as QuizDetailResource } from '../types'
import { useSession } from '../session/session'
import { ConfirmDialog } from './ConfirmDialog'
import { QuestionForm } from './QuestionForm'
import { QuestionImage } from './QuestionImage'

interface QuizDetailProps {
  quizId: string
  onBack: () => void
  onEdit: (quiz: QuizDetailResource) => void
}

type DetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'missing' }
  | { status: 'ready'; quiz: QuizDetailResource }

type QuestionFormState =
  | { mode: 'create' }
  | { mode: 'edit'; question: QuestionResource }
  | null

export function QuizDetail({ quizId, onBack, onEdit }: QuizDetailProps) {
  const { api, session, isCurrent } = useSession()
  const [state, setState] = useState<DetailState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [form, setForm] = useState<QuestionFormState>(null)
  const [deleteQuestionTarget, setDeleteQuestionTarget] =
    useState<QuestionResource | null>(null)
  const [deletingQuestion, setDeletingQuestion] = useState(false)
  const [deletingQuiz, setDeletingQuiz] = useState(false)
  const [askingQuizDelete, setAskingQuizDelete] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!api || !session) return
    const generation = session.generation
    const controller = new AbortController()
    setState({ status: 'loading' })
    setActionError(null)
    getQuiz(api, quizId, controller.signal).then(
      (quiz) => {
        if (isCurrent(generation)) setState({ status: 'ready', quiz })
      },
      (error) => {
        if (!isCurrent(generation)) return
        if ((error as { code?: string }).code === 'ERR_CANCELED') return
        if ((error as { response?: { status?: number } }).response?.status === 404) {
          setState({ status: 'missing' })
          return
        }
        setState({ status: 'error', message: apiErrorMessage(error) })
      },
    )
    return () => controller.abort()
  }, [api, session, isCurrent, quizId, reloadKey])

  function upsertQuestion(question: QuestionResource) {
    setState((current) => {
      if (current.status !== 'ready') return current
      const exists = current.quiz.questions.some(
        (item) => item.id === question.id,
      )
      return {
        status: 'ready',
        quiz: {
          ...current.quiz,
          questions: exists
            ? current.quiz.questions.map((item) =>
                item.id === question.id ? question : item,
              )
            : [...current.quiz.questions, question],
          updatedAt: new Date().toISOString(),
        },
      }
    })
  }

  async function confirmQuestionDelete() {
    if (!api || !session || !deleteQuestionTarget || deletingQuestion) return
    setDeletingQuestion(true)
    setActionError(null)
    const generation = session.generation
    const id = deleteQuestionTarget.id
    try {
      await deleteQuestion(api, quizId, id)
      if (!isCurrent(generation)) return
      setState((current) =>
        current.status === 'ready'
          ? {
              status: 'ready',
              quiz: {
                ...current.quiz,
                questions: current.quiz.questions.filter(
                  (question) => question.id !== id,
                ),
              },
            }
          : current,
      )
      setDeleteQuestionTarget(null)
    } catch (error) {
      if (!isCurrent(generation)) return
      if ((error as { response?: { status?: number } }).response?.status === 404) {
        setState({ status: 'missing' })
        return
      }
      setDeleteQuestionTarget(null)
      setActionError(apiErrorMessage(error))
    } finally {
      setDeletingQuestion(false)
    }
  }

  async function confirmQuizDelete() {
    if (!api || !session || deletingQuiz) return
    setDeletingQuiz(true)
    setActionError(null)
    const generation = session.generation
    try {
      await deleteQuiz(api, quizId)
      if (!isCurrent(generation)) return
      setAskingQuizDelete(false)
      onBack()
    } catch (error) {
      if (!isCurrent(generation)) return
      if ((error as { response?: { status?: number } }).response?.status === 404) {
        setState({ status: 'missing' })
        return
      }
      setAskingQuizDelete(false)
      setActionError(apiErrorMessage(error))
    } finally {
      setDeletingQuiz(false)
    }
  }

  if (state.status === 'loading') {
    return (
      <p role="status" className="muted">
        Cargando cuestionarioâ€¦
      </p>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="alert" role="alert">
        <p>{state.message}</p>
        <div className="actions">
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
            Reintentar
          </button>
          <button type="button" onClick={onBack}>
            Volver al listado
          </button>
        </div>
      </div>
    )
  }

  if (state.status === 'missing') {
    return (
      <div className="alert" role="alert">
        <p>El cuestionario no estÃ¡ disponible.</p>
        <p className="muted">
          Puede haber sido eliminado o pertenecer a otra cuenta.
        </p>
        <button type="button" onClick={onBack}>
          Volver al listado
        </button>
      </div>
    )
  }

  const quiz = state.quiz

  return (
    <section aria-labelledby="quiz-detail-title">
      <div className="section-header">
        <div>
          <h2 id="quiz-detail-title">{quiz.title}</h2>
          {quiz.description ? <p className="muted">{quiz.description}</p> : null}
        </div>
        <div className="actions">
          <button type="button" onClick={onBack}>
            Volver al listado
          </button>
          <button type="button" onClick={() => onEdit(quiz)}>
            Editar cuestionario
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => setAskingQuizDelete(true)}
            disabled={deletingQuiz}
          >
            Eliminar cuestionario
          </button>
        </div>
      </div>

      {actionError ? (
        <p role="alert" className="alert">
          {actionError}
        </p>
      ) : null}

      <div className="section-header">
        <h3>Preguntas</h3>
        {form ? null : (
          <button type="button" onClick={() => setForm({ mode: 'create' })}>
            Agregar pregunta
          </button>
        )}
      </div>

      {form ? (
        <QuestionForm
          key={form.mode === 'edit' ? form.question.id : 'new-question'}
          quizId={quizId}
          question={form.mode === 'edit' ? form.question : undefined}
          onPersisted={upsertQuestion}
          onClose={() => setForm(null)}
          onUnavailable={() => setState({ status: 'missing' })}
        />
      ) : null}

      {quiz.questions.length === 0 && !form ? (
        <p className="empty">Este cuestionario todavÃ­a no tiene preguntas.</p>
      ) : null}

      <ol className="question-list">
        {quiz.questions.map((question, index) => (
          <li key={question.id} className="card question-item">
            <h4>
              {index + 1}. {question.questionText}
            </h4>
            <ul className="option-list">
              {question.options.map((option) => (
                <li key={option.id}>
                  <span>{option.text}</span>{' '}
                  {option.isCorrect ? (
                    <span className="badge">Correcta</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="hint">
              {question.timeLimitSeconds} s Â· {question.points} puntos
            </p>
            <QuestionImage
              quizId={quizId}
              question={question}
              onChanged={upsertQuestion}
              onUnavailable={() => setState({ status: 'missing' })}
            />
            <div className="actions">
              <button
                type="button"
                onClick={() => setForm({ mode: 'edit', question })}
                disabled={Boolean(form)}
              >
                Editar pregunta
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => setDeleteQuestionTarget(question)}
                disabled={Boolean(form) || deletingQuestion}
              >
                Eliminar pregunta
              </button>
            </div>
          </li>
        ))}
      </ol>

      <ConfirmDialog
        open={Boolean(deleteQuestionTarget)}
        title="Eliminar pregunta"
        message="Se eliminarÃ¡n la pregunta, sus cuatro opciones y su imagen. Esta acciÃ³n no se puede deshacer."
        pending={deletingQuestion}
        onConfirm={confirmQuestionDelete}
        onCancel={() => setDeleteQuestionTarget(null)}
      />

      <ConfirmDialog
        open={askingQuizDelete}
        title="Eliminar cuestionario"
        message={`Se eliminarÃ¡n Â«${quiz.title}Â», todas sus preguntas e imÃ¡genes. Esta acciÃ³n no se puede deshacer.`}
        pending={deletingQuiz}
        onConfirm={confirmQuizDelete}
        onCancel={() => setAskingQuizDelete(false)}
      />
    </section>
  )
}

