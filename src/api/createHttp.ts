import axios, { type AxiosInstance } from 'axios'

export interface HttpOptions {
  baseURL: string
  getToken: () => string | null
  onUnauthorized: () => void
}

/** Original authoring factory: Auth, API and images remain separate clients. */
export function createHttp({ baseURL, getToken, onUnauthorized }: HttpOptions): AxiosInstance {
  const client = axios.create({ baseURL })
  client.interceptors.request.use((config) => {
    const token = getToken()
    if (token) config.headers.set('Authorization', `Bearer ${token}`)
    return config
  })
  client.interceptors.response.use((response) => {
    if (response.config.headers.Authorization && response.config.headers.Authorization !== `Bearer ${getToken()}`) throw new axios.CanceledError('Sesión cambiada')
    return response
  }, (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) onUnauthorized()
    return Promise.reject(error)
  })
  return client
}
