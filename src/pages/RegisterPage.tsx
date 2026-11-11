import axios from 'axios'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AUTH_API_URL } from '../api/config'
import { apiErrorMessage } from '../api/http'

export function RegisterPage() {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

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
      })
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (failure) {
      setError(apiErrorMessage(failure))
    } finally {
      setPending(false)
    }
  }

  return <section className="card">
    <h1>Crear perfil</h1>
    <form onSubmit={register}>
      <label htmlFor="register-username">Usuario</label>
      <input id="register-username" name="username" autoComplete="username" required pattern="[A-Za-z0-9_]{3,15}" aria-describedby="username-rules" disabled={pending} />
      <small id="username-rules">Usa de 3 a 15 letras, números o guiones bajos.</small>
      <label htmlFor="register-password">Contraseña</label>
      <input id="register-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} disabled={pending} />
      <button type="submit" disabled={pending}>{pending ? 'Creando perfil…' : 'Crear perfil'}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    <Link to="/login">Volver a iniciar sesión</Link>
  </section>
}
