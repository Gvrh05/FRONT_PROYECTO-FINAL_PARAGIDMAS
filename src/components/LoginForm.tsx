import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSession } from '../session/session'
import './LoginForm.css'

export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const { login, notice } = useSession()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
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
    <main className="login reference-auth profelink-login">
      <div className="login-constellations" aria-hidden="true" />
      <div className="login-split">
      <section className="card glass-premium login-form-panel" aria-labelledby="login-title">
        <div className="login-wordmark"><img src="/getanyui/profelinkicon.png" alt="" width="40" height="40" /><span>ProfeLink<small>Aprende. Comparte. Conecta.</small></span></div>
        <p className="eyebrow">Tu espacio para aprender</p>
        <h1 id="login-title">Profelink Kahoot</h1>
        <p className="muted">Tu próxima gran clase empieza aquí. Administra tus cuestionarios y preguntas.</p>
        <form onSubmit={submit} noValidate>
          <label htmlFor="username">Usuario</label>
          <input
            id="username"
            name="username"
              autoComplete="username"
              placeholder="Tu nombre de usuario"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={pending}
            required
          />
          <label htmlFor="password">Contraseña</label>
          <div className="password-field">
            <input
              className="password-input"
              id="password"
              name="password"
              type={passwordVisible ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
              required
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={passwordVisible}
              onClick={() => setPasswordVisible((visible) => !visible)}
              disabled={pending}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
                {passwordVisible && <path d="m3 3 18 18" />}
              </svg>
            </button>
          </div>
          <button className="login-submit" type="submit" disabled={pending}>
            {pending ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
        <div role="alert" aria-live="polite" className="alert">
          {error ?? notice ?? ''}
        </div>
      </section>
      </div>
    </main>
  )
}
