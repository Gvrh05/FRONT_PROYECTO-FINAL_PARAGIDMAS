import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'

let singleton: Socket | undefined
let version = 0
let currentToken: string | null = null
let currentRoom: string | null = null

/** One lobby owns a lease. Deferred release coalesces StrictMode's test unmount. */
export function leaseGameSocket(token: string, roomCode: string, guest = false) {
  const url = (import.meta.env.VITE_WS_URL || window.location.origin).replace(/\/+$/, '').replace(/\/game$/, '')
  singleton ??= io(`${url}/game`, { autoConnect: false, reconnection: true })
  if (currentToken !== token || currentRoom !== roomCode) singleton.disconnect()
  currentToken = token
  currentRoom = roomCode
  singleton.auth = guest ? { guestToken: token } : { token }
  const leaseVersion = ++version
  const socket = singleton
  return {
    socket,
    release() {
      queueMicrotask(() => {
        if (version === leaseVersion) disconnectGameSocket()
      })
    },
  }
}

export function disconnectGameSocket(): void {
  version++
  singleton?.disconnect()
  if (singleton) singleton.auth = {}
  currentToken = null
  currentRoom = null
}
