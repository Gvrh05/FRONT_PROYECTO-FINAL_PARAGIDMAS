import { useState } from 'react'
import './TestCredentialsPanel.css'

export function TestCredentialsPanel() {
  const [message, setMessage] = useState('')
  async function copy(text: string, label: string) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
      setMessage(`${label} ${label === 'Contraseña' ? 'copiada' : 'copiado'}`)
    } catch { setMessage('No se pudo copiar. Selecciona el texto y cópialo manualmente.') }
  }
  return <section className="test-credentials" aria-labelledby="test-credentials-title">
    <h2 id="test-credentials-title">Credenciales de Prueba</h2>
    <p>Profesor · acceso educativo</p>
    {[['profesor_test', 'Usuario'], ['Profesor123!', 'Contraseña'], ['Invitado por QR', 'Acceso del alumno']].map(([text, label]) => <div className="test-credential-row" key={label}><span><small>{label === 'Acceso del alumno' ? 'Alumno' : label}</small><code>{text}</code></span><button type="button" aria-label={`Copiar ${label.toLowerCase()}`} onClick={() => void copy(text, label)}>Copiar</button></div>)}
    <p>Pide al profesor el enlace o QR de la sala; no necesitas una cuenta.</p>
    <small>Cuenta demo pública. No utilizar con datos sensibles.</small>
    <p role="status" aria-live="polite">{message}</p>
  </section>
}
