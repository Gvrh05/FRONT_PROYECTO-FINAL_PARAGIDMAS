import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QuestionForm } from './QuestionForm'
import { QuizForm } from './QuizForm'
import { useSession } from '../session/session'
import type { QuestionResource, QuizSummary } from '../types'

vi.mock('../session/session', () => ({ useSession: vi.fn() }))

const userSession = {
  accessToken: 'test-token',
  generation: 4,
  user: { id: 'owner-1', username: 'teacher', role: 'teacher' },
}

function setupApi() {
  const api = axios.create({ baseURL: 'http://localhost:3000/kahoot-api' })
  const mock = new MockAdapter(api)
  vi.mocked(useSession).mockReturnValue({
    api,
    images: api,
    session: userSession,
    isCurrent: () => true,
    notice: null,
    clearNotice: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  })
  return { api, mock }
}

describe('formularios de autoría', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('valida quiz y al editar envía solo cambios, sin tocar la portada', async () => {
    const { mock } = setupApi()
    const current: QuizSummary = {
      id: 'quiz-1', authorId: 'owner-1', title: 'Original', description: 'Descripción',
      coverImageUrl: 'https://example.test/cover.jpg',
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const onSaved = vi.fn()
    const user = userEvent.setup()
    const view = render(<QuizForm quiz={current} onSaved={onSaved} onCancel={vi.fn()} />)
    const title = screen.getByLabelText('Título')
    await user.clear(title)
    await user.click(screen.getByRole('button', { name: 'Guardar cuestionario' }))
    expect(await screen.findByText('El título es obligatorio.')).toBeInTheDocument()

    await user.type(title, 'Nuevo título')
    mock.onPatch('/quizzes/quiz-1').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ title: 'Nuevo título' })
      return [200, { ...current, title: 'Nuevo título' }]
    })
    await user.click(screen.getByRole('button', { name: 'Guardar cuestionario' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nuevo título' })))
    expect(view.container.textContent).toContain('no la modifica')
    mock.restore()
  })

  it('conserva el borrador cuando falla la creación del cuestionario', async () => {
    const { mock } = setupApi()
    mock.onPost('/quizzes').reply(500, { error: 'Internal Server Error' })
    const user = userEvent.setup()
    render(<QuizForm onSaved={vi.fn()} onCancel={vi.fn()} />)
    const title = screen.getByLabelText('Título')
    await user.type(title, 'Borrador guardado')
    await user.click(screen.getByRole('button', { name: 'Guardar cuestionario' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(title).toHaveValue('Borrador guardado')
    mock.restore()
  })

  it('guarda cuatro opciones, luego la imagen y reintenta solo el archivo', async () => {
    const { mock } = setupApi()
    const question: QuestionResource = {
      id: 'question-9', quizId: 'quiz-1', questionText: '¿Capital?',
      timeLimitSeconds: 20, points: 1000, imageUrl: null,
      options: [
        { id: 'o1', text: 'Lima', isCorrect: true },
        { id: 'o2', text: 'Quito', isCorrect: false },
        { id: 'o3', text: 'Bogotá', isCorrect: false },
        { id: 'o4', text: 'La Paz', isCorrect: false },
      ],
    }
    const onPersisted = vi.fn()
    const onClose = vi.fn()
    let uploadCount = 0
    mock.onPost('/quizzes/quiz-1/questions').reply((config) => {
      const body = JSON.parse(config.data) as { options: Array<{ isCorrect: boolean }> }
      expect(body.options).toHaveLength(4)
      expect(body.options.filter((option) => option.isCorrect)).toHaveLength(1)
      expect(body).not.toHaveProperty('timeLimitSeconds')
      expect(body).not.toHaveProperty('points')
      return [201, question]
    })
    mock.onPost('/quizzes/quiz-1/questions/question-9/image').reply(() => {
      uploadCount += 1
      return uploadCount === 1 ? [415, { error: 'Unsupported Media Type' }] : [200, { ...question, imageUrl: '/uploads/questions/9f45e2ea-e039-4fe1-967e-725264f9b781.png' }]
    })

    const user = userEvent.setup()
    render(<QuestionForm quizId="quiz-1" onPersisted={onPersisted} onClose={onClose} onUnavailable={vi.fn()} />)
    await user.type(screen.getByLabelText('Enunciado'), '¿Capital?')
    await user.type(screen.getByLabelText('Opción 1'), 'Lima')
    await user.type(screen.getByLabelText('Opción 2'), 'Quito')
    await user.type(screen.getByLabelText('Opción 3'), 'Bogotá')
    await user.type(screen.getByLabelText('Opción 4'), 'La Paz')
    await user.click(screen.getByLabelText('Correcta', { selector: 'input[value="0"]' }))
    const file = new File(['png'], 'mapa.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Imagen (opcional)'), file)
    await user.click(screen.getByRole('button', { name: 'Guardar pregunta' }))

    expect(await screen.findByText(/Pregunta guardada; imagen pendiente/)).toBeInTheDocument()
    expect(onPersisted).toHaveBeenCalledWith(question)
    expect(onClose).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Reintentar carga de imagen' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(uploadCount).toBe(2)
    expect(mock.history.post).toHaveLength(3)
    mock.restore()
  })

  it('al editar una pregunta conserva ajustes, opciones e imagen no modificados', async () => {
    const { mock } = setupApi()
    const question: QuestionResource = {
      id: 'question-10', quizId: 'quiz-1', questionText: 'Pregunta anterior',
      timeLimitSeconds: 45, points: 2500,
      imageUrl: '/uploads/questions/6f8214f2-7f0e-4d9c-a9c3-92015151a10b.png',
      options: [
        { id: 'e1', text: 'Primera', isCorrect: false },
        { id: 'e2', text: 'Segunda', isCorrect: true },
        { id: 'e3', text: 'Tercera', isCorrect: false },
        { id: 'e4', text: 'Cuarta', isCorrect: false },
      ],
    }
    const saved = vi.fn()
    mock.onPatch('/quizzes/quiz-1/questions/question-10').reply((config) => {
      const body = JSON.parse(config.data)
      expect(body.questionText).toBe('Pregunta editada')
      expect(body.options.map((option: { text: string }) => option.text)).toEqual([
        'Primera', 'Segunda', 'Tercera', 'Cuarta',
      ])
      expect(body.options[1].isCorrect).toBe(true)
      expect(body).not.toHaveProperty('timeLimitSeconds')
      expect(body).not.toHaveProperty('points')
      return [200, { ...question, questionText: 'Pregunta editada' }]
    })
    const user = userEvent.setup()
    render(<QuestionForm quizId="quiz-1" question={question} onPersisted={saved} onClose={vi.fn()} onUnavailable={vi.fn()} />)
    const statement = screen.getByLabelText('Enunciado')
    await user.clear(statement)
    await user.type(statement, 'Pregunta editada')
    await user.click(screen.getByRole('button', { name: 'Guardar pregunta' }))
    await waitFor(() => expect(saved).toHaveBeenCalledWith(expect.objectContaining({ questionText: 'Pregunta editada' })))
    mock.restore()
  })
})
