import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('flujo principal de autoría', () => {
  afterEach(() => vi.restoreAllMocks())

  it('inicia sesión, muestra lista vacía y abre el cuestionario creado', async () => {
    const originalCreate = axios.create.bind(axios)
    const created: Array<{ baseURL?: string; mock: MockAdapter }> = []
    vi.spyOn(axios, 'create').mockImplementation((config) => {
      const instance = originalCreate(config)
      const baseURL = config?.baseURL
      const mock = new MockAdapter(instance)
      created.push({ baseURL, mock })
      if (baseURL === 'http://localhost:3001/auth') {
        mock.onPost('/login').reply(200, {
          accessToken: 'test-token',
          user: { id: 'teacher-1', username: 'docente', role: 'teacher' },
        })
      }
      if (baseURL === 'http://localhost:3000/kahoot-api') {
        mock.onGet('/quizzes').reply(200, [])
        mock.onPost('/quizzes').reply(201, {
          id: 'quiz-1', authorId: 'teacher-1', title: 'Ciencias',
          description: null, coverImageUrl: null,
          createdAt: '2026-11-09T12:00:00.000Z', updatedAt: '2026-11-09T12:00:00.000Z',
        })
        mock.onGet('/quizzes/quiz-1').reply(200, {
          id: 'quiz-1', authorId: 'teacher-1', title: 'Ciencias',
          description: null, coverImageUrl: null,
          createdAt: '2026-11-09T12:00:00.000Z', updatedAt: '2026-11-09T12:00:00.000Z',
          questions: [],
        })
      }
      return instance
    })

    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Usuario'), 'docente')
    await user.type(screen.getByLabelText('Contraseña'), 'secreta')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Todavía no tienes cuestionarios.')).toBeInTheDocument()
    expect(created.some((item) => item.baseURL === 'http://localhost:3000/kahoot-api')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Crear mi primer cuestionario' }))
    await user.type(screen.getByLabelText('Título'), 'Ciencias')
    await user.click(screen.getByRole('button', { name: 'Guardar cuestionario' }))
    expect(await screen.findByRole('heading', { name: 'Ciencias' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Preguntas' })).toBeInTheDocument())
    expect(screen.getByText(/todav/)).toBeInTheDocument()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    created.forEach(({ mock }) => mock.restore())
  })

  it('reintenta una lista fallida y separa sus estados de error y vacío', async () => {
    const originalCreate = axios.create.bind(axios)
    const mocks: MockAdapter[] = []
    vi.spyOn(axios, 'create').mockImplementation((config) => {
      const instance = originalCreate(config)
      const mock = new MockAdapter(instance)
      mocks.push(mock)
      if (config?.baseURL === 'http://localhost:3001/auth') {
        mock.onPost('/login').reply(200, {
          accessToken: 'retry-token',
          user: { id: 'teacher-1', username: 'docente', role: 'teacher' },
        })
      }
      if (config?.baseURL === 'http://localhost:3000/kahoot-api') {
        let attempts = 0
        mock.onGet('/quizzes').reply(() => {
          attempts += 1
          return attempts === 1 ? [500, { error: 'Server error' }] : [200, []]
        })
      }
      return instance
    })

    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Usuario'), 'docente')
    await user.type(screen.getByLabelText('Contraseña'), 'secreta')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText('Todavía no tienes cuestionarios.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Todavía no tienes cuestionarios.')).toBeInTheDocument()
    mocks.forEach((mock) => mock.restore())
  })

  it('descarta una lista tardía de la sesión anterior y finaliza al recibir 401', async () => {
    const originalCreate = axios.create.bind(axios)
    const mocks: MockAdapter[] = []
    let loginCount = 0
    let listCount = 0
    let resolveOldList: ((response: [number, unknown]) => void) | undefined
    vi.spyOn(axios, 'create').mockImplementation((config) => {
      const instance = originalCreate(config)
      const mock = new MockAdapter(instance)
      mocks.push(mock)
      if (config?.baseURL === 'http://localhost:3001/auth') {
        mock.onPost('/login').reply(() => {
          loginCount += 1
          return [200, {
            accessToken: `session-${loginCount}`,
            user: { id: `teacher-${loginCount}`, username: `docente${loginCount}`, role: 'teacher' },
          }]
        })
      }
      if (config?.baseURL === 'http://localhost:3000/kahoot-api') {
        mock.onGet('/quizzes').reply(() => {
          listCount += 1
          if (listCount === 1) {
            return new Promise((resolve) => {
              resolveOldList = resolve
            })
          }
          if (listCount === 3) return [401, { error: 'Unauthorized' }]
          return [200, [{
            id: 'new-quiz', authorId: 'teacher-2', title: 'Cuestionario nuevo',
            description: null, coverImageUrl: null,
            createdAt: '2026-11-09T12:00:00.000Z', updatedAt: '2026-11-09T12:00:00.000Z',
          }]]
        })
      }
      return instance
    })

    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Usuario'), 'docente1')
    await user.type(screen.getByLabelText('Contraseña'), 'secreta')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    await waitFor(() => expect(listCount).toBe(1))

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    await user.type(screen.getByLabelText('Usuario'), 'docente2')
    await user.type(screen.getByLabelText('Contraseña'), 'secreta')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText('Cuestionario nuevo')).toBeInTheDocument()

    resolveOldList?.([200, [{
      id: 'old-quiz', authorId: 'teacher-1', title: 'Dato de sesión anterior',
      description: null, coverImageUrl: null,
      createdAt: '2026-11-09T12:00:00.000Z', updatedAt: '2026-11-09T12:00:00.000Z',
    }]])
    expect(screen.queryByText('Dato de sesión anterior')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    await user.type(screen.getByLabelText('Usuario'), 'docente3')
    await user.type(screen.getByLabelText('Contraseña'), 'secreta')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText(/Tu sesión expiró/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Profelink Kahoot' })).toBeInTheDocument()
    mocks.forEach((mock) => mock.restore())
  })
})
