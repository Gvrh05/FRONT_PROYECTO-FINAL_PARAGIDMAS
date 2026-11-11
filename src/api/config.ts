export const API_URL =
  import.meta.env.VITE_API_URL ?? '/kahoot-api'

export const AUTH_API_URL =
  import.meta.env.VITE_AUTH_API_URL ?? '/auth'

/** The API origin used to turn the relative private imageUrl into a request. */
export const API_ORIGIN = new URL(API_URL, window.location.origin).origin

/** Socket.IO connects directly to the game API, not to a static Netlify site. */
export const WS_ORIGIN = (import.meta.env.VITE_WS_URL?.trim() || API_ORIGIN)
  .replace(/\/+$/, '')
  .replace(/\/game$/, '')

/** 5 MiB, matching the API default MAX_FILE_SIZE. */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const
