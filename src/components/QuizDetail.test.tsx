import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QuizDetail } from './QuizDetail'
import { useSession } from '../session/session'

vi.mock('../session/session', () => ({ useSession: vi.fn() }))

describe('eliminación con confirmación', () => {
  afterEach(() => vi.restoreAllMocks())

  it('cancelar no envía DELETE y solo retira la pregunta tras 204', async () => {
    const api = axios.create({ baseURL: 'http://localhost:3000/kahoot-api' })
    const mock = new MockAdapter(api)
    vi.mocked(useSession).mockReturnValue({
      api,
      images: api,
      session: { accessToken: 'token', generation: 1, user: { id: 'u1', username: 'teacher', role: 'PROFESOR' } },
      isCurrent: () => true,
      notice: null,
      clearNotice: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    })
    mock.onGet('/quizzes/quiz-1').reply(200, {
      id: 'quiz-1', authorId: 'u1', title: 'Mi quiz', description: null, coverImageUrl: null,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
      questions: [{
        id: 'question-1', quizId: 'quiz-1', questionText: '<img src=x>',
        timeLimitSeconds: 20, points: 1000, imageUrl: null,
        options: [
          { id: 'o1', text: 'A', isCorrect: true },
          { id: 'o2', text: 'B', isCorrect: false },
          { id: 'o3', text: 'C', isCorrect: false },
          { id: 'o4', text: 'D', isCorrect: false },
        ],
      }],
    })
    let deleteCount = 0
    mock.onDelete('/quizzes/quiz-1/questions/question-1').reply(() => {
      deleteCount += 1
      return deleteCount === 1 ? [500, { error: 'Internal Server Error' }] : [204]
    })

    const user = userEvent.setup()
    render(<QuizDetail quizId="quiz-1" onBack={vi.fn()} onEdit={vi.fn()} />)
    expect(await screen.findByRole('heading', { name: /<img src=x>/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Eliminar pregunta' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(mock.history.delete).toHaveLength(0)
    expect(screen.getByRole('heading', { name: /<img src=x>/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Eliminar pregunta' }))
    await user.click(screen.getByRole('dialog').querySelector('button.danger')!)
    await waitFor(() => expect(mock.history.delete).toHaveLength(1))
    expect(screen.getByRole('heading', { name: /<img src=x>/ })).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Eliminar pregunta' }))
    await user.click(screen.getByRole('dialog').querySelector('button.danger')!)
    await waitFor(() => expect(mock.history.delete).toHaveLength(2))
    await waitFor(() => expect(screen.queryByRole('heading', { name: /<img src=x>/ })).not.toBeInTheDocument())
    mock.restore()
  })
})
