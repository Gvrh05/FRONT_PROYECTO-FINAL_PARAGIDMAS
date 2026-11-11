import MockAdapter from 'axios-mock-adapter'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHttp } from '../api/http'
import { QuestionImage } from './QuestionImage'
import { useSession } from '../session/session'
import type { QuestionResource } from '../types'

vi.mock('../session/session', () => ({ useSession: vi.fn() }))

describe('imagen privada de pregunta', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('lee con Bearer, conserva la imagen tras fallo al reemplazar y permite quitarla', async () => {
    const createObjectURL = vi.fn(() => 'blob:authenticated-image')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
    const api = createHttp({
      baseURL: 'http://localhost:3000/kahoot-api',
      getToken: () => 'private-token',
      onUnauthorized: vi.fn(),
    })
    const images = createHttp({
      baseURL: 'http://localhost:3000',
      getToken: () => 'private-token',
      onUnauthorized: vi.fn(),
    })
    const apiMock = new MockAdapter(api)
    const imageMock = new MockAdapter(images)
    vi.mocked(useSession).mockReturnValue({
      api,
      images,
      session: { accessToken: 'private-token', generation: 1, user: { id: 'u1', username: 'teacher', role: 'PROFESOR' } },
      isCurrent: () => true,
      notice: null,
      clearNotice: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    })

    const imageUrl = '/uploads/questions/da6e2502-07ad-4904-b38f-c0e8aa3e5b32.png'
    const question: QuestionResource = {
      id: 'question-1', quizId: 'quiz-1', questionText: 'Pregunta',
      timeLimitSeconds: 20, points: 1000, imageUrl,
      options: [
        { id: 'o1', text: 'A', isCorrect: true },
        { id: 'o2', text: 'B', isCorrect: false },
        { id: 'o3', text: 'C', isCorrect: false },
        { id: 'o4', text: 'D', isCorrect: false },
      ],
    }
    imageMock.onGet(`http://localhost:3000${imageUrl}`).reply((config) => {
      expect(config.params).toBeUndefined()
      expect(String(config.headers?.Authorization ?? config.headers?.authorization)).toBe('Bearer private-token')
      return [200, new Blob(['private image'], { type: 'image/png' }), { 'Content-Type': 'image/png' }]
    })
    apiMock.onPost('/quizzes/quiz-1/questions/question-1/image').reply(415, { error: 'Unsupported Media Type' })
    apiMock.onDelete('/quizzes/quiz-1/questions/question-1/image').reply(204)

    const onChanged = vi.fn()
    const user = userEvent.setup()
    const view = render(<QuestionImage quizId="quiz-1" question={question} onChanged={onChanged} onUnavailable={vi.fn()} />)
    const currentImage = await screen.findByAltText('Imagen actual de la pregunta')
    expect(currentImage).toHaveAttribute('src', 'blob:authenticated-image')

    await user.click(screen.getByText('Reemplazar imagen'))
    const replacement = new File(['candidate'], 'candidate.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Imagen (opcional)'), { target: { files: [replacement] } })
    await user.click(screen.getByRole('button', { name: 'Subir imagen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/JPEG, PNG o WebP/)
    expect(screen.getByAltText('Imagen actual de la pregunta')).toHaveAttribute('src', 'blob:authenticated-image')
    expect(onChanged).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Quitar imagen' }))
    await user.click(screen.getByRole('dialog').querySelector('button.danger')!)
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith({ ...question, imageUrl: null }))
    expect(apiMock.history.post).toHaveLength(1)
    expect(apiMock.history.delete).toHaveLength(1)
    view.unmount()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:authenticated-image')
    apiMock.restore()
    imageMock.restore()
  })

  it('descarta una respuesta binaria que llega después de terminar la sesión', async () => {
    const createObjectURL = vi.fn(() => 'blob:stale-image')
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }))
    const images = createHttp({ baseURL: 'http://localhost:3000', getToken: () => 'old-token', onUnauthorized: vi.fn() })
    const mock = new MockAdapter(images)
    let current = true
    const isCurrent = () => current
    vi.mocked(useSession).mockReturnValue({
      api: null,
      images,
      session: { accessToken: 'old-token', generation: 8, user: { id: 'u1', username: 'teacher', role: 'PROFESOR' } },
      isCurrent: () => current,
      notice: null,
      clearNotice: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    })
    const imageUrl = '/uploads/questions/da6e2502-07ad-4904-b38f-c0e8aa3e5b32.png'
    let resolveImage: ((response: [number, unknown]) => void) | undefined
    mock.onGet(`http://localhost:3000${imageUrl}`).reply(() => new Promise((resolve) => { resolveImage = resolve }))
    const question: QuestionResource = {
      id: 'question-1', quizId: 'quiz-1', questionText: 'Pregunta',
      timeLimitSeconds: 20, points: 1000, imageUrl,
      options: [
        { id: 'o1', text: 'A', isCorrect: true },
        { id: 'o2', text: 'B', isCorrect: false },
        { id: 'o3', text: 'C', isCorrect: false },
        { id: 'o4', text: 'D', isCorrect: false },
      ],
    }
    const props = { quizId: 'quiz-1', question, onChanged: vi.fn(), onUnavailable: vi.fn() }
    const view = render(<QuestionImage {...props} />)
    await waitFor(() => expect(mock.history.get).toHaveLength(1))

    current = false
    vi.mocked(useSession).mockReturnValue({
      api: null,
      images: null,
      session: null,
      isCurrent,
      notice: null,
      clearNotice: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    })
    view.rerender(<QuestionImage {...props} />)
    await act(async () => {
      resolveImage?.([200, new Blob(['late'], { type: 'image/png' })])
      await Promise.resolve()
    })
    expect(screen.queryByAltText('Imagen actual de la pregunta')).not.toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()
    mock.restore()
  })
})
