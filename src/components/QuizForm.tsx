import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { apiErrorMessage } from '../api/http'
import { createQuiz, updateQuiz } from '../api/quizzes'
import type { QuizSummary } from '../types'
import { useSession } from '../session/session'
import {
  buildQuizPatch,
  QUIZ_DESCRIPTION_MAX,
  QUIZ_TITLE_MAX,
  validateQuizDraft,
  type FieldErrors,
  type QuizDraft,
} from '../features/quizzes/validation'

interface QuizFormProps {
  quiz?: QuizSummary
  onSaved: (quiz: QuizSummary) => void
  onCancel: () => void
}

export function QuizForm({ quiz, onSaved, onCancel }: QuizFormProps) {
  const { api, session, isCurrent } = useSession()
  const [draft, setDraft] = useState<QuizDraft>({
    title: quiz?.title ?? '',
    description: quiz?.description ?? '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)

  const editing = Boolean(quiz)

  function update(field: keyof QuizDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (quiz?.isDemo || pendingRef.current || !api || !session) return

    const nextErrors = validateQuizDraft(draft)
    setErrors(nextErrors)
    setSubmitError(null)
    if (Object.keys(nextErrors).length > 0) return

    pendingRef.current = true
    setPending(true)
    const generation = session.generation
    try {
      const saved = quiz
        ? await savePatch(quiz)
        : await createQuiz(api, {
            title: draft.title.trim(),
            description: draft.description.trim() || null,
          })
      if (!isCurrent(generation)) return
      if (saved) onSaved(saved)
    } catch (error) {
      if (!isCurrent(generation)) return
      const data = (error as { response?: { status?: number; data?: unknown } }).response?.data
      if ((error as { response?: { status?: number } }).response?.status === 404) {
        setSubmitError('El cuestionario ya no está disponible.')
        return
      }
      setSubmitError(
        extractFieldErrors(data) ?? apiErrorMessage(error),
      )
    } finally {
      pendingRef.current = false
      if (isCurrent(generation)) setPending(false)
    }
  }

  async function savePatch(current: QuizSummary): Promise<QuizSummary | null> {
    if (!api) return null
    const patch = buildQuizPatch(draft, current)
    if (Object.keys(patch).length === 0) {
      setSubmitError('No hay cambios para guardar.')
      return null
    }
    return updateQuiz(api, current.id, patch)
  }

  if (quiz?.isDemo) return <section className="card"><p>El cuestionario demo es de solo lectura.</p><button onClick={onCancel}>Volver</button></section>
  return (
    <section className="card" aria-labelledby="quiz-form-title">
      <h2 id="quiz-form-title">
        {editing ? 'Editar cuestionario' : 'Nuevo cuestionario'}
      </h2>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="quiz-title">Título</label>
          <input
            id="quiz-title"
            name="title"
            value={draft.title}
            maxLength={QUIZ_TITLE_MAX}
            onChange={(event) => update('title', event.target.value)}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'quiz-title-error' : undefined}
            disabled={pending}
            required
          />
          {errors.title ? (
            <p id="quiz-title-error" className="field-error">
              {errors.title}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="quiz-description">Descripción (opcional)</label>
          <textarea
            id="quiz-description"
            name="description"
            rows={4}
            value={draft.description}
            maxLength={QUIZ_DESCRIPTION_MAX}
            onChange={(event) => update('description', event.target.value)}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? 'quiz-description-error' : undefined
            }
            disabled={pending}
          />
          {errors.description ? (
            <p id="quiz-description-error" className="field-error">
              {errors.description}
            </p>
          ) : null}
        </div>

        {quiz?.coverImageUrl ? (
          <p className="muted">
            Este cuestionario tiene portada. Editar el título o la descripción no
            la modifica.
          </p>
        ) : null}

        {submitError ? (
          <p role="alert" className="alert">
            {submitError}
          </p>
        ) : null}

        <div className="actions">
          <button type="submit" disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar cuestionario'}
          </button>
          <button type="button" onClick={onCancel} disabled={pending}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  )
}

function extractFieldErrors(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const error = (data as { error?: unknown }).error
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (Array.isArray(message)) {
      const joined = message.filter((item): item is string => typeof item === 'string')
      if (joined.length) return joined.join(' ')
    }
    if (typeof message === 'string' && message.trim()) return message
  }
  return null
}
