import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { createDevSession } from './dev-token'

export default function DevLoginButtons() {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function choose(sub: 'test-host-id' | 'test-player-id') {
    setBusy(true)
    setError('')
    try {
      const session = await createDevSession(sub)
      setSession(session.token, session.user)
      navigate(sub === 'test-host-id' ? '/host/create' : '/join', { replace: true })
    } catch {
      setError('No se pudo generar el JWT de demo. Usa localhost o HTTPS y revisa la configuración del README.')
    } finally { setBusy(false) }
  }
  return <section className="dev-login" aria-label="Acceso de demo">
    <p><strong>DEV ONLY.</strong> JWT de ejemplo local; no es autenticación de producción.</p>
    <div className="actions">
      <button disabled={busy} onClick={() => void choose('test-host-id')}>Soy host (test-host-id)</button>
      <button className="secondary" disabled={busy} onClick={() => void choose('test-player-id')}>Soy player (test-player-id)</button>
    </div>
    {error && <p className="error-banner" role="alert">{error}</p>}
  </section>
}
