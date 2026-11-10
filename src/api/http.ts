import axios from 'axios'
import { ZodError } from 'zod'
import { expireAuth } from '../auth/storage'

export class AppError extends Error {
  readonly statusCode?: number
  readonly code?: string
  constructor(message: string, statusCode?: number, code?: string) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ZodError) return 'La respuesta del servidor no tiene el formato esperado. Intenta de nuevo.'
  const code = error instanceof AppError ? error.code : undefined
  const wsMessages: Record<string, string> = {
    UNAUTHENTICATED: 'Tu sesión venció. Vuelve a identificarte.',
    INVALID_ROOM_CODE: 'El código de sala debe tener exactamente 6 dígitos.',
    SESSION_NOT_FOUND: 'La sala no existe o su servidor se reinició. Comprueba el código.',
    SESSION_ALREADY_STARTED: 'La sala ya inició; solo sus participantes pueden reconectar.',
    INVALID_SESSION_STATUS: 'La sala ya no está en lobby.',
    FORBIDDEN: 'Solo el anfitrión puede iniciar esta partida.',
  }
  if (code && wsMessages[code]) return wsMessages[code]
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    return errorMessage(new AppError('No se pudo conectar al servidor. Comprueba que el backend esté encendido.', status))
  }
  if (error instanceof AppError) {
    switch (error.statusCode) {
      case 400: return error.message || 'Revisa el código o los datos. Es posible que la sala ya haya iniciado.'
      case 401: return 'No estás autenticado o tu sesión venció. Vuelve a identificarte.'
      case 403: return 'No tienes permiso. Debes ser dueño del quiz o anfitrión de la sala.'
      case 404: return 'La sala no existe o su servidor se reinició. Comprueba el código.'
      case 500: case 502: case 503: return 'El servidor no pudo completar la operación. Intenta de nuevo.'
      default: return error.message
    }
  }
  return error instanceof Error ? error.message : 'No se pudo completar la operación. Intenta de nuevo.'
}

const origin = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '').replace(/\/kahoot-api$/, '')
export const http = axios.create({ baseURL: `${origin}/kahoot-api`, timeout: 15000 })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use((response) => response, (error: unknown) => {
  if (axios.isCancel(error)) return Promise.reject(error)
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const currentToken = localStorage.getItem('token')
    // An old request must not clear a newer session selected while it was pending.
    if (status === 401 && (!currentToken || error.config?.headers?.Authorization === `Bearer ${currentToken}`)) expireAuth()
    // Translate statusCode/errors, never render the backend's raw JSON or stack.
    const message = status === 400
      ? 'Revisa los datos: el código debe tener 6 dígitos y la sala debe estar en lobby para aceptar nuevos jugadores o iniciar.'
      : 'No se pudo conectar al servidor. Comprueba que el backend esté encendido.'
    return Promise.reject(new AppError(message, status))
  }
  return Promise.reject(new AppError('La respuesta del servidor no es válida. Intenta de nuevo.'))
})
