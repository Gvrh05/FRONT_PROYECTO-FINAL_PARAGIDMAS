import { useContext } from 'react'
import { AuthContext } from './auth-context'

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('AuthProvider no está disponible')
  return auth
}
