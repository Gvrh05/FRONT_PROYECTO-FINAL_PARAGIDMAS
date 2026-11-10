import axios from 'axios'
import { ZodError } from 'zod'
import { expireAuth } from '../auth/storage'

// Preserve existing imports without routing authoring/Auth through the singleton.
export { createHttp } from './createHttp'
export type { HttpOptions } from './createHttp'

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
    INVALID_SESSION_STATUS: error instanceof AppError ? error.message : 'La sala cambió de estado.',
    FORBIDDEN: error instanceof AppError ? error.message : 'No tienes permiso para esta operación.',
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

export function apiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
  }
  if (axios.isCancel(error)) return ''
  if (!error.response) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
  }
  if (error.response.status === 401) return 'Tu sesión no es válida o expiró.'
  if (error.response.status === 413) return 'La imagen supera el tamaño máximo permitido.'
  if (error.response.status === 415) return 'El archivo no es una imagen JPEG, PNG o WebP válida.'
  if (error.response.status === 404) return 'El recurso ya no está disponible.'
  const data = error.response.data as { error?: unknown } | undefined
  const detail = data?.error
  if (typeof detail === 'string' && detail.trim()) return detail
  if (detail && typeof detail === 'object' && 'message' in detail) {
    const message = (detail as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
    if (Array.isArray(message)) {
      const joined = message.filter((item): item is string => typeof item === 'string')
      if (joined.length) return joined.join(' ')
    }
  }
  return `La solicitud falló (${error.response.status}).`
}
