import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AUTH_API_URL, API_URL } from './config'
import { apiErrorMessage, createHttp } from './http'
import { uploadQuestionImage } from './quizzes'

describe('clientes HTTP', () => {
  afterEach(() => vi.restoreAllMocks())

  it('usa el prefijo de API y adjunta el Bearer actual', async () => {
    const client = createHttp({
      baseURL: API_URL,
      getToken: () => 'token-de-prueba',
      onUnauthorized: vi.fn(),
    })
    const mock = new MockAdapter(client)
    mock.onGet('/quizzes').reply((config) => {
      expect(config.url).toBe('/quizzes')
      expect(config.baseURL).toBe('http://localhost:3000/kahoot-api')
      expect(String(config.headers?.Authorization ?? config.headers?.authorization)).toBe('Bearer token-de-prueba')
      return [200, []]
    })

    await client.get('/quizzes')
    mock.restore()
  })

  it('mantiene separados el login y la API, sin forzar Content-Type JSON', async () => {
    const auth = axios.create({ baseURL: AUTH_API_URL })
    const authMock = new MockAdapter(auth)
    authMock.onPost('/login').reply((config) => {
      expect(config.baseURL).toBe('http://localhost:3001/auth')
      expect(JSON.parse(config.data)).toEqual({ username: 'docente', password: 'clave' })
      return [200, {
        accessToken: 'jwt-demo',
        user: { id: 'u-1', username: 'docente', role: 'teacher' },
      }]
    })
    const { data } = await auth.post('/login', { username: 'docente', password: 'clave' })
    expect(data).toEqual({
      accessToken: 'jwt-demo',
      user: { id: 'u-1', username: 'docente', role: 'teacher' },
    })
    authMock.restore()

    const api = createHttp({ baseURL: API_URL, getToken: () => 'jwt-demo', onUnauthorized: vi.fn() })
    expect(api.defaults.headers.common['Content-Type']).toBeUndefined()
    const apiMock = new MockAdapter(api)
    apiMock.onPost(/\/image$/).reply((config) => {
      expect(config.data).toBeInstanceOf(FormData)
      const headers = config.headers as unknown as Record<string, string>
      expect(headers.Authorization ?? headers.authorization).toBe('Bearer jwt-demo')
      expect(headers['Content-Type'] ?? headers['content-type'] ?? '').not.toContain('application/json')
      return [200, { id: 'q1' }]
    })
    await uploadQuestionImage(api, 'quiz1', 'question1', new File(['img'], 'x.png', { type: 'image/png' }))
    apiMock.restore()
  })

  it('ejecuta el hook al recibir 401', async () => {
    const onUnauthorized = vi.fn()
    const client = createHttp({ baseURL: API_URL, getToken: () => 'expired', onUnauthorized })
    const mock = new MockAdapter(client)
    mock.onGet('/private').reply(401)
    await expect(client.get('/private')).rejects.toMatchObject({ response: { status: 401 } })
    expect(onUnauthorized).toHaveBeenCalledOnce()
    mock.restore()
  })

  it('traduce los errores de tamaño y formato de imagen', async () => {
    const client = createHttp({ baseURL: API_URL, getToken: () => 'token', onUnauthorized: vi.fn() })
    const mock = new MockAdapter(client)
    mock.onPost('/large-image').reply(413, { error: 'Payload Too Large' })
    mock.onPost('/invalid-image').reply(415, { error: 'Unsupported Media Type' })
    const largeError = await client.post('/large-image').catch(apiErrorMessage)
    const formatError = await client.post('/invalid-image').catch(apiErrorMessage)
    expect(largeError).toMatch(/supera el tamaño máximo/i)
    expect(formatError).toMatch(/JPEG, PNG o WebP/i)
    mock.restore()
  })
})
