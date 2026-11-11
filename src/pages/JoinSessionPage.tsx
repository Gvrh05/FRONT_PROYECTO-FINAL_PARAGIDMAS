import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { getSession, joinSession, roomCodeSchema } from '../api/gameSessions'
import { useAuth } from '../auth/useAuth'
import { ErrorBanner } from '../components/ErrorBanner'

const formSchema = z.object({ roomCode: roomCodeSchema, name: z.string().trim().max(80, 'El nombre puede tener hasta 80 caracteres.') })

export function JoinSessionPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [roomCode, setRoomCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const alive = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = formSchema.safeParse({ roomCode, name })
    if (!result.success) { setError(new Error(result.error.issues[0].message)); return }
    setBusy(true)
    setError(null)
    try {
      const session = await getSession(result.data.roomCode)
      if (!alive.current) return
      if (session.hostId === user?.sub) {
        navigate(`/host/lobby/${session.roomCode}`)
        return
      }
      await joinSession(result.data.roomCode, result.data.name || undefined)
      if (alive.current) navigate(`/play/lobby/${result.data.roomCode}`)
    } catch (failure) { if (alive.current) setError(failure) }
    finally { if (alive.current) setBusy(false) }
  }

  return <section className="card">
    <p className="eyebrow">Jugador · 1 de 2</p><h1>Únete a una sala</h1>
    <p>Pide al anfitrión el código de seis dígitos.</p>
    <ErrorBanner error={error} />
    <form noValidate onSubmit={(event) => void submit(event)}>
      <label htmlFor="room-code">Código de sala</label>
      <input id="room-code" className="pin-input" type="text" inputMode="numeric" autoComplete="off" maxLength={6} pattern="[0-9]{6}" placeholder="123456" value={roomCode} onChange={(event) => setRoomCode(event.target.value)} disabled={busy} aria-describedby="pin-help" />
      <small id="pin-help">Exactamente 6 dígitos, sin espacios.</small>
      <label htmlFor="player-name">Nombre para la sala (opcional)</label>
      <input id="player-name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} disabled={busy} placeholder="Tu nombre" />
      <button type="submit" disabled={busy}>{busy ? 'Uniéndote…' : 'Unirse'}</button>
    </form>
    <Link to="/host/create">¿Eres anfitrión? Crea una sala</Link>
  </section>
}
