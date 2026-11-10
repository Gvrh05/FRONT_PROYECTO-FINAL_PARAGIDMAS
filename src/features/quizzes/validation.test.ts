import { describe, expect, it } from 'vitest'
import {
  buildQuestionInput,
  buildQuizPatch,
  emptyQuestionDraft,
  validateImageFile,
  validateQuestionDraft,
} from './validation'

describe('validación de autoría', () => {
  it('valida cuatro respuestas no vacías y exige una correcta', () => {
    const draft = emptyQuestionDraft()
    draft.questionText = '<b>Texto</b>'
    draft.options = ['uno', 'dos', 'tres', 'cuatro']
    expect(validateQuestionDraft(draft).correct).toBeTruthy()
    draft.correctIndex = 2
    expect(validateQuestionDraft(draft)).toEqual({})
    expect(buildQuestionInput(draft, { timeLimitSeconds: 20, points: 1000 }).options)
      .toEqual([
        { text: 'uno', isCorrect: false },
        { text: 'dos', isCorrect: false },
        { text: 'tres', isCorrect: true },
        { text: 'cuatro', isCorrect: false },
      ])
  })

  it('omite ajustes intactos y solo incluye cambios de quiz', () => {
    const draft = emptyQuestionDraft()
    draft.questionText = 'Pregunta'
    draft.options = ['a', 'b', 'c', 'd']
    draft.correctIndex = 0
    expect(buildQuestionInput(draft, { timeLimitSeconds: 20, points: 1000 }))
      .not.toHaveProperty('timeLimitSeconds')
    expect(buildQuizPatch({ title: ' Título ', description: 'Descripción' }, {
      id: 'q', authorId: 'u', title: 'Título', description: 'Descripción',
      coverImageUrl: 'https://img.test/cover', createdAt: '', updatedAt: '',
    })).toEqual({})
  })

  it('valida formato, archivo vacío y tamaño', () => {
    expect(validateImageFile(new File(['ok'], 'x.png', { type: 'image/png' }))).toBeNull()
    expect(validateImageFile(new File([], 'x.png', { type: 'image/png' }))).toMatch(/vacío/i)
    expect(validateImageFile(new File(['x'], 'x.svg', { type: 'image/svg+xml' }))).toMatch(/JPEG/i)
    const large = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })
    expect(validateImageFile(large)).toMatch(/5 MiB/)
  })
})
