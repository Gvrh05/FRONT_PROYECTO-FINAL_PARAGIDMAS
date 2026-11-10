import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '../../api/config'
import type { QuestionInput, QuestionResource, QuizInput, QuizSummary } from '../../types'

export const QUIZ_TITLE_MAX = 150
export const QUIZ_DESCRIPTION_MAX = 2000
export const QUESTION_TEXT_MAX = 2000
export const OPTION_TEXT_MAX = 500
export const TIME_LIMIT_DEFAULT = 20
export const TIME_LIMIT_MIN = 1
export const TIME_LIMIT_MAX = 300
export const POINTS_DEFAULT = 1000
export const POINTS_MIN = 0
export const POINTS_MAX = 100000

export type FieldErrors = Record<string, string>

export interface QuizDraft {
  title: string
  description: string
}

export function validateQuizDraft(draft: QuizDraft): FieldErrors {
  const errors: FieldErrors = {}
  const title = draft.title.trim()
  if (!title) errors.title = 'El título es obligatorio.'
  else if (title.length > QUIZ_TITLE_MAX)
    errors.title = `El título admite como máximo ${QUIZ_TITLE_MAX} caracteres.`
  if (draft.description.trim().length > QUIZ_DESCRIPTION_MAX)
    errors.description = `La descripción admite como máximo ${QUIZ_DESCRIPTION_MAX} caracteres.`
  return errors
}

/** PATCH only the fields that actually changed; never resend the cover. */
export function buildQuizPatch(draft: QuizDraft, current: QuizSummary): Partial<QuizInput> {
  const patch: Partial<QuizInput> = {}
  const title = draft.title.trim()
  const description = draft.description.trim()
  if (title !== current.title) patch.title = title
  if (description !== (current.description ?? '')) {
    patch.description = description === '' ? null : description
  }
  return patch
}

export interface QuestionDraft {
  questionText: string
  options: [string, string, string, string]
  correctIndex: number | null
  timeLimitSeconds: string
  points: string
}

export function emptyQuestionDraft(): QuestionDraft {
  return {
    questionText: '',
    options: ['', '', '', ''],
    correctIndex: null,
    timeLimitSeconds: String(TIME_LIMIT_DEFAULT),
    points: String(POINTS_DEFAULT),
  }
}

export function questionDraftFrom(question: QuestionResource): QuestionDraft {
  const options = question.options
  const correctIndex = options.findIndex((option) => option.isCorrect)
  return {
    questionText: question.questionText,
    options: [0, 1, 2, 3].map((index) => options[index]?.text ?? '') as [
      string,
      string,
      string,
      string,
    ],
    correctIndex: correctIndex >= 0 ? correctIndex : null,
    timeLimitSeconds: String(question.timeLimitSeconds),
    points: String(question.points),
  }
}

function parseInteger(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null
  return Number(value)
}

export function validateQuestionDraft(draft: QuestionDraft): FieldErrors {
  const errors: FieldErrors = {}
  const questionText = draft.questionText.trim()
  if (!questionText) errors.questionText = 'El enunciado es obligatorio.'
  else if (questionText.length > QUESTION_TEXT_MAX)
    errors.questionText = `El enunciado admite como máximo ${QUESTION_TEXT_MAX} caracteres.`

  draft.options.forEach((text, index) => {
    const value = text.trim()
    if (!value) errors[`option-${index}`] = 'La opción no puede estar vacía.'
    else if (value.length > OPTION_TEXT_MAX)
      errors[`option-${index}`] = `La opción admite como máximo ${OPTION_TEXT_MAX} caracteres.`
  })

  if (draft.correctIndex === null) {
    errors.correct = 'Selecciona la respuesta correcta.'
  } else if (
    draft.correctIndex < 0 ||
    draft.correctIndex > 3 ||
    !draft.options[draft.correctIndex]?.trim()
  ) {
    errors.correct = 'La respuesta correcta debe ser una de las cuatro opciones completas.'
  }

  const time = parseInteger(draft.timeLimitSeconds)
  if (time === null || time < TIME_LIMIT_MIN || time > TIME_LIMIT_MAX)
    errors.timeLimitSeconds = `El tiempo debe ser un entero entre ${TIME_LIMIT_MIN} y ${TIME_LIMIT_MAX}.`

  const points = parseInteger(draft.points)
  if (points === null || points < POINTS_MIN || points > POINTS_MAX)
    errors.points = `Los puntos deben ser un entero entre ${POINTS_MIN} y ${POINTS_MAX}.`

  return errors
}

/**
 * Options always travel as a full set of four. On create, time/points keep
 * server defaults unless changed; on edit they are omitted when unchanged.
 */
export function buildQuestionInput(
  draft: QuestionDraft,
  baseline: { timeLimitSeconds: number; points: number },
): QuestionInput {
  const options = draft.options.map((text, index) => ({
    text: text.trim(),
    isCorrect: index === draft.correctIndex,
  }))

  const input: QuestionInput = {
    questionText: draft.questionText.trim(),
    options,
  }

  const time = Number(draft.timeLimitSeconds)
  if (time !== baseline.timeLimitSeconds) input.timeLimitSeconds = time

  const points = Number(draft.points)
  if (points !== baseline.points) input.points = points

  return input
}

export function validateImageFile(file: File): string | null {
  if (file.size === 0) return 'El archivo está vacío.'
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return 'El archivo debe ser una imagen JPEG, PNG o WebP.'
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `La imagen supera el máximo de ${Math.round(MAX_IMAGE_SIZE / (1024 * 1024))} MiB.`
  }
  return null
}
