import axios from 'axios'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AUTH_API_URL } from '../api/config'
import { apiErrorMessage } from '../api/http'

import { AvatarSelector } from '../components/AvatarSelector'

export function RegisterPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const [avatarId, setAvatarId] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError('')
    try {
      await axios.post(`${AUTH_API_URL.replace(/\/$/, '')}/register`, {
        username: String(form.get('username')).trim().toLowerCase(),
        password: form.get('password'),
        avatarId,
      })
      navigate('/login', { replace: true, state: { registered: true, from: state?.from, search: state?.search } })
    } catch (failure) {
      setError(apiErrorMessage(failure))
    } finally {
      setPending(false)
    }
  }

  return <section className="card reference-register glass-premium">
    <img className="reference-guest-logo" src="/getanyui/profelinkicon.png" alt="ProfeLink" width="64" height="64" /><p className="eyebrow">Forma parte de tu clase</p>
    <h1>Crear perfil</h1>
    <form onSubmit={register}>
      <label htmlFor="register-username">Usuario</label>
      <input id="register-username" name="username" autoComplete="username" required pattern="[A-Za-z0-9_]{3,15}" aria-describedby="username-rules" disabled={pending} />
      <small id="username-rules">Usa de 3 a 15 letras, números o guiones bajos.</small>
      <label htmlFor="register-password">Contraseña</label>
      <div className="password-field">
        <input id="register-password" className="password-input" name="password" type={passwordVisible ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={72} disabled={pending} />
        <button className="password-toggle" type="button" aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((visible) => !visible)} disabled={pending}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {passwordVisible && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </div>
      <AvatarSelector value={avatarId} onChange={setAvatarId} disabled={pending} />
      <button type="submit" disabled={pending}>{pending ? 'Creando perfil…' : 'Crear perfil'}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    <Link to="/login" state={state}>Volver a iniciar sesión</Link>
  </section>
}
