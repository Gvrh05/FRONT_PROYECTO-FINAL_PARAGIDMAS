import { useEffect, useRef, useState } from 'react'
import { apiErrorMessage } from '../api/http'
import {
  deleteQuestionImage,
  fetchQuestionImage,
  uploadQuestionImage,
} from '../api/quizzes'
import type { QuestionResource } from '../types'
import { useSession } from '../session/session'
import { useObjectUrl } from '../features/quizzes/useObjectUrl'
import { ConfirmDialog } from './ConfirmDialog'
import { QuestionImageInput } from './QuestionImageInput'

interface QuestionImageProps {
  quizId: string
  question: QuestionResource
  onChanged: (question: QuestionResource) => void
  onUnavailable: () => void
}

export function QuestionImage({
  quizId,
  question,
  onChanged,
  onUnavailable,
}: QuestionImageProps) {
  const { api, images, session, isCurrent } = useSession()
  const [blob, setBlob] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(Boolean(question.imageUrl))
  const [loadError, setLoadError] = useState<string | null>(null)
  const [replacement, setReplacement] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [askingRemove, setAskingRemove] = useState(false)
  const [version, setVersion] = useState(0)
  const pendingRef = useRef(false)
  const objectUrl = useObjectUrl(blob)

  useEffect(() => {
    if (!question.imageUrl || !images || !session) {
      setBlob(null)
      setLoading(false)
      return
    }
    const generation = session.generation
    const controller = new AbortController()
    setLoading(true)
    setLoadError(null)
    fetchQuestionImage(images, question.imageUrl, controller.signal).then(
      (data) => {
        if (!isCurrent(generation)) return
        setBlob(data)
        setLoading(false)
      },
      (error) => {
        if (!isCurrent(generation)) return
        setLoading(false)
        setLoadError(apiErrorMessage(error))
      },
    )
    return () => controller.abort()
  }, [question.imageUrl, images, session, isCurrent, version])

  async function uploadReplacement() {
    if (!api || !session || !replacement || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setUploadError(null)
    const generation = session.generation
    try {
      const updated = await uploadQuestionImage(
        api,
        quizId,
        question.id,
        replacement,
      )
      if (!isCurrent(generation)) return
      onChanged(updated)
      setReplacement(null)
      setVersion((value) => value + 1)
    } catch (error) {
      if (!isCurrent(generation)) return
      if (statusOf(error) === 404) {
        onUnavailable()
        return
      }
      setUploadError(apiErrorMessage(error))
    } finally {
      pendingRef.current = false
      if (isCurrent(generation)) setPending(false)
    }
  }

  async function removeImage() {
    if (!api || !session || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setUploadError(null)
    const generation = session.generation
    try {
      await deleteQuestionImage(api, quizId, question.id)
      if (!isCurrent(generation)) return
      setAskingRemove(false)
      setReplacement(null)
      onChanged({ ...question, imageUrl: null })
    } catch (error) {
      if (!isCurrent(generation)) return
      if (statusOf(error) === 404) {
        onUnavailable()
        return
      }
      setAskingRemove(false)
      setUploadError(apiErrorMessage(error))
    } finally {
      pendingRef.current = false
      if (isCurrent(generation)) setPending(false)
    }
  }

  return (
    <div className="question-image">
      {question.imageUrl ? (
        <div className="image-current">
          {loading ? (
            <p className="muted">Cargando imagen…</p>
          ) : objectUrl ? (
            <img src={objectUrl} alt="Imagen actual de la pregunta" />
          ) : null}
          {loadError ? (
            <p className="field-error" role="alert">
              {loadError}
            </p>
          ) : null}
          <div className="actions">
            <button
              type="button"
              onClick={() => setAskingRemove(true)}
              disabled={pending}
            >
              Quitar imagen
            </button>
          </div>
        </div>
      ) : (
        <p className="muted">Sin imagen.</p>
      )}

      <details>
        <summary>
          {question.imageUrl ? 'Reemplazar imagen' : 'Agregar imagen'}
        </summary>
        <QuestionImageInput
          idPrefix={`image-${question.id}`}
          file={replacement}
          disabled={pending}
          serverError={uploadError}
          onSelect={(next) => {
            setReplacement(next)
            setUploadError(null)
          }}
        />
        {replacement ? (
          <button type="button" onClick={uploadReplacement} disabled={pending}>
            {pending ? 'Subiendo…' : 'Subir imagen'}
          </button>
        ) : null}
      </details>

      {uploadError && !replacement ? (
        <p className="field-error" role="alert">
          {uploadError}
        </p>
      ) : null}

      <ConfirmDialog
        open={askingRemove}
        title="Quitar imagen"
        message="Se quitará la imagen de esta pregunta. La pregunta y sus opciones se conservan."
        confirmLabel="Quitar imagen"
        pending={pending}
        onConfirm={removeImage}
        onCancel={() => setAskingRemove(false)}
      />
    </div>
  )
}

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } }).response?.status
}
