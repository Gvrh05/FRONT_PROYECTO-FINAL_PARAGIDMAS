import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { apiErrorMessage } from '../api/http'
import {
  createQuestion,
  updateQuestion,
  uploadQuestionImage,
} from '../api/quizzes'
import type { QuestionResource } from '../types'
import { useSession } from '../session/session'
import {
  buildQuestionInput,
  emptyQuestionDraft,
  questionDraftFrom,
  validateQuestionDraft,
  type FieldErrors,
  type QuestionDraft,
} from '../features/quizzes/validation'
import { QuestionImageInput } from './QuestionImageInput'

interface QuestionFormProps {
  quizId: string
  question?: QuestionResource
  onPersisted: (question: QuestionResource) => void
  onClose: () => void
  onUnavailable: () => void
}

interface PartialSave {
  question: QuestionResource
  file: File
  message: string
}

export function QuestionForm({
  quizId,
  question,
  onPersisted,
  onClose,
  onUnavailable,
}: QuestionFormProps) {
  const { api, session, isCurrent } = useSession()
  const editing = Boolean(question)
  const [draft, setDraft] = useState<QuestionDraft>(() =>
    question ? questionDraftFrom(question) : emptyQuestionDraft(),
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [partial, setPartial] = useState<PartialSave | null>(null)
  const pendingRef = useRef(false)

  const baseline = question
    ? { timeLimitSeconds: question.timeLimitSeconds, points: question.points }
    : { timeLimitSeconds: 20, points: 1000 }

  function updateField(field: keyof QuestionDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  function updateOption(index: number, value: string) {
    setDraft((current) => {
      const options = [...current.options] as [string, string, string, string]
      options[index] = value
      return { ...current, options }
    })
    setErrors((current) => ({ ...current, [`option-${index}`]: '' }))
    if (draft.correctIndex === index) {
      setErrors((current) => ({ ...current, correct: '' }))
    }
  }

  function chooseCorrect(index: number) {
    setDraft((current) => ({ ...current, correctIndex: index }))
    setErrors((current) => ({ ...current, correct: '' }))
  }

  async function persistJson(): Promise<QuestionResource | null> {
    if (!api || !session) return null
    const input = buildQuestionInput(draft, baseline)
    return question
      ? updateQuestion(api, quizId, question.id, input)
      : createQuestion(api, quizId, input)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pendingRef.current || !api || !session || partial) return

    const nextErrors = validateQuestionDraft(draft)
    setErrors(nextErrors)
    setSubmitError(null)
    setFileError(null)
    if (Object.keys(nextErrors).length > 0) return

    pendingRef.current = true
    setPending(true)
    const generation = session.generation
    try {
      const saved = await persistJson()
      if (!saved || !isCurrent(generation)) return
      onPersisted(saved)

      if (!file) {
        onClose()
        return
      }

      try {
        const updated = await uploadQuestionImage(api, quizId, saved.id, file)
        if (!isCurrent(generation)) return
        onPersisted(updated)
        setFile(null)
        onClose()
      } catch (error) {
        if (!isCurrent(generation)) return
        if (statusOf(error) === 404) {
          onUnavailable()
          return
        }
        setPartial({
          question: saved,
          file,
          message: `Pregunta guardada; imagen pendiente. ${apiErrorMessage(error)}`,
        })
        setFileError(apiErrorMessage(error))
      }
    } catch (error) {
      if (!isCurrent(generation)) return
      if (statusOf(error) === 404) {
        onUnavailable()
        return
      }
      setSubmitError(messageOf(error))
    } finally {
      pendingRef.current = false
      if (isCurrent(generation)) setPending(false)
    }
  }

  async function retryImage() {
    if (!api || !session || pendingRef.current || !partial) return
    pendingRef.current = true
    setPending(true)
    setFileError(null)
    const generation = session.generation
    try {
      const updated = await uploadQuestionImage(
        api,
        quizId,
        partial.question.id,
        partial.file,
      )
      if (!isCurrent(generation)) return
      onPersisted(updated)
      setPartial(null)
      setFile(null)
      onClose()
    } catch (error) {
      if (!isCurrent(generation)) return
      if (statusOf(error) === 404) {
        onUnavailable()
        return
      }
      setPartial((current) =>
        current
          ? {
              ...current,
              message: `Pregunta guardada; imagen pendiente. ${apiErrorMessage(error)}`,
            }
          : current,
      )
      setFileError(apiErrorMessage(error))
    } finally {
      pendingRef.current = false
      if (isCurrent(generation)) setPending(false)
    }
  }

  return (
    <section className="card" aria-labelledby="question-form-title">
      <h2 id="question-form-title">
        {editing ? 'Editar pregunta' : 'Nueva pregunta'}
      </h2>

      {partial ? (
        <div className="alert" role="status">
          <p>{partial.message}</p>
          <p className="muted">
            La pregunta ya existe con el identificador {partial.question.id}. El
            reintento solo vuelve a cargar el archivo.
          </p>
          <div className="actions">
            <button type="button" onClick={retryImage} disabled={pending}>
              {pending ? 'Subiendo…' : 'Reintentar carga de imagen'}
            </button>
            <button type="button" onClick={onClose} disabled={pending}>
              Cerrar
            </button>
          </div>
        </div>
      ) : null}

      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="question-text">Enunciado</label>
          <textarea
            id="question-text"
            name="questionText"
            rows={3}
            value={draft.questionText}
            onChange={(event) => updateField('questionText', event.target.value)}
            aria-invalid={Boolean(errors.questionText)}
            aria-describedby={
              errors.questionText ? 'question-text-error' : undefined
            }
            disabled={pending || Boolean(partial)}
            required
          />
          {errors.questionText ? (
            <p id="question-text-error" className="field-error">
              {errors.questionText}
            </p>
          ) : null}
        </div>

        <fieldset className="options">
          <legend>Opciones y respuesta correcta</legend>
          {draft.options.map((text, index) => (
            <div className="option-row" key={index}>
              <div className="field">
                <label htmlFor={`option-${index}`}>Opción {index + 1}</label>
                <input
                  id={`option-${index}`}
                  name={`option-${index}`}
                  value={text}
                  onChange={(event) => updateOption(index, event.target.value)}
                  aria-invalid={Boolean(errors[`option-${index}`])}
                  disabled={pending || Boolean(partial)}
                  required
                />
                {errors[`option-${index}`] ? (
                  <p className="field-error">{errors[`option-${index}`]}</p>
                ) : null}
              </div>
              <label className="correct-choice">
                <input
                  type="radio"
                  name="correct-option"
                  value={index}
                  checked={draft.correctIndex === index}
                  onChange={() => chooseCorrect(index)}
                  disabled={pending || Boolean(partial)}
                />
                Correcta
              </label>
            </div>
          ))}
          {errors.correct ? (
            <p className="field-error" role="alert">
              {errors.correct}
            </p>
          ) : null}
        </fieldset>

        <div className="grid-two">
          <div className="field">
            <label htmlFor="time-limit">Tiempo (segundos)</label>
            <input
              id="time-limit"
              name="timeLimitSeconds"
              inputMode="numeric"
              value={draft.timeLimitSeconds}
              onChange={(event) =>
                updateField('timeLimitSeconds', event.target.value)
              }
              aria-invalid={Boolean(errors.timeLimitSeconds)}
              disabled={pending || Boolean(partial)}
            />
            {errors.timeLimitSeconds ? (
              <p className="field-error">{errors.timeLimitSeconds}</p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="points">Puntos</label>
            <input
              id="points"
              name="points"
              inputMode="numeric"
              value={draft.points}
              onChange={(event) => updateField('points', event.target.value)}
              aria-invalid={Boolean(errors.points)}
              disabled={pending || Boolean(partial)}
            />
            {errors.points ? (
              <p className="field-error">{errors.points}</p>
            ) : null}
          </div>
        </div>

        {editing ? (
          <p className="muted">
            Si no cambias el tiempo, los puntos o la imagen, se conservan los
            valores actuales.
          </p>
        ) : null}

        <QuestionImageInput
          file={partial ? partial.file : file}
          disabled={pending || Boolean(partial)}
          serverError={fileError}
          onSelect={(next) => {
            setFile(next)
            setFileError(null)
          }}
        />

        {submitError ? (
          <p role="alert" className="alert">
            {submitError}
          </p>
        ) : null}

        <div className="actions">
          <button type="submit" disabled={pending || Boolean(partial)}>
            {pending ? 'Guardando…' : 'Guardar pregunta'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
          >
            Cancelar
          </button>
        </div>
      </form>
    </section>
  )
}

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } }).response?.status
}

function messageOf(error: unknown): string {
  const data = (error as { response?: { data?: unknown } }).response?.data
  if (data && typeof data === 'object') {
    const detail = (data as { error?: unknown }).error
    if (detail && typeof detail === 'object' && 'message' in detail) {
      const message = (detail as { message?: unknown }).message
      if (Array.isArray(message)) {
        return message.filter((item): item is string => typeof item === 'string').join(' ')
      }
      if (typeof message === 'string' && message.trim()) return message
    }
  }
  return apiErrorMessage(error)
}
