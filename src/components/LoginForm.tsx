import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSession } from '../session/session'

export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const { login, notice } = useSession()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    if (!username.trim() || !password) {
      setError('Ingresa tu usuario y contraseña.')
      return
    }
    setPending(true)
    setError(null)
    try {
      await login(username.trim(), password)
      setPassword('')
      onSuccess?.()
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'No se pudo iniciar sesión.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="login">
      <section className="card" aria-labelledby="login-title">
        <h1 id="login-title">Profelink Kahoot</h1>
        <p className="muted">Administra tus cuestionarios y preguntas.</p>
        <form onSubmit={submit} noValidate>
          <label htmlFor="username">Usuario</label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={pending}
            required
          />
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending}
            required
          />
          <button type="submit" disabled={pending}>
            {pending ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
        <div role="alert" aria-live="polite" className="alert">
          {error ?? notice ?? ''}
        </div>
      </section>
    </main>
  )
}
