import { useEffect, useRef, useState } from 'react'
import { ACCEPTED_IMAGE_TYPES } from '../api/config'
import { validateImageFile } from '../features/quizzes/validation'
import { useObjectUrl } from '../features/quizzes/useObjectUrl'

interface QuestionImageInputProps {
  file: File | null
  disabled?: boolean
  serverError?: string | null
  idPrefix?: string
  onSelect: (file: File | null) => void
}

export function QuestionImageInput({
  file,
  disabled = false,
  serverError = null,
  idPrefix = 'question-image',
  onSelect,
}: QuestionImageInputProps) {
  const [localError, setLocalError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrl = useObjectUrl(file)
  const inputId = `${idPrefix}`
  const errorId = `${idPrefix}-error`

  useEffect(() => {
    if (!file && inputRef.current) inputRef.current.value = ''
  }, [file])

  function choose(next: File | null) {
    if (!next) {
      setLocalError(null)
      onSelect(null)
      return
    }
    const error = validateImageFile(next)
    if (error) {
      setLocalError(error)
      onSelect(null)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setLocalError(null)
    onSelect(next)
  }

  const error = localError ?? serverError

  return (
    <div className="field image-input">
      <label htmlFor={inputId}>Imagen (opcional)</label>
      <p className="hint">JPEG, PNG o WebP, hasta 5 MiB.</p>
      <input
        ref={inputRef}
        id={inputId}
        name={`${idPrefix}-file`}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        disabled={disabled}
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {previewUrl ? (
        <figure className="preview">
          <img src={previewUrl} alt="Vista previa de la imagen seleccionada" />
          <figcaption>
            <button type="button" onClick={() => choose(null)} disabled={disabled}>
              Descartar imagen
            </button>
          </figcaption>
        </figure>
      ) : null}
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
