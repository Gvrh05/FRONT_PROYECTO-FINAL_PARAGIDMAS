import { createContext } from 'react'
import type { AuthUser } from './storage'

export interface AuthState {
  token: string | null
  user: AuthUser | null
  setSession: (token: string, user: AuthUser) => void
  logout: () => void
}

export const AuthContext = createContext<AuthState | null>(null)
