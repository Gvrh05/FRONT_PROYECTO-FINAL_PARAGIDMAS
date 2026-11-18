import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createGoalKickRoom, goalKickRoomDraftSchema } from '../../api/gameSessions'
import { apiErrorMessage } from '../../api/http'
import { QuestionImageInput } from '../../components/QuestionImageInput'

export function GoalKickRoomForm({ onCancel }: { onCancel?: () => void }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  const alive = useRef(false)
  const request = useRef<AbortController | null>(null)
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort() } }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    const parsed = goalKickRoomDraftSchema.safeParse({ name, description })
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    busy.current = true; setPending(true); setError('')
    request.current = new AbortController()
    try {
      const room = await createGoalKickRoom(parsed.data, image, request.current.signal)
      if (alive.current) navigate(`/host/lobby/${room.roomCode}`)
    } catch (failure) { if (alive.current) setError(apiErrorMessage(failure)) }
    finally { busy.current = false; if (alive.current) setPending(false) }
  }

  return <section aria-labelledby="goal-kick-room-title">
    <h2 id="goal-kick-room-title">Crear sala de Tiro al Arco</h2>
    <p>Solo necesitas los datos de la sala. No hay preguntas ni respuestas: los jugadores meten goles durante 40 segundos.</p>
    <p className="hint">La sala es temporal. Comparte el enlace o QR desde el lobby y pulsa Iniciar cuando entren los jugadores.</p>
    <form onSubmit={event => void submit(event)}>
      <div className="field"><label htmlFor="goal-kick-room-name">Nombre de la sala</label><input id="goal-kick-room-name" value={name} onChange={event => setName(event.target.value)} maxLength={150} required disabled={pending} /></div>
      <div className="field"><label htmlFor="goal-kick-room-description">Descripción (opcional)</label><textarea id="goal-kick-room-description" rows={3} value={description} onChange={event => setDescription(event.target.value)} maxLength={2000} disabled={pending} /></div>
      <QuestionImageInput idPrefix="goal-kick-room-photo" file={image} disabled={pending} onSelect={setImage} />
      {error && <p role="alert">{error}</p>}
      <div className="actions"><button type="submit" disabled={pending}>{pending ? 'Creando sala…' : 'Crear sala de Tiro al Arco'}</button>{onCancel && <button type="button" disabled={pending} onClick={onCancel}>Cancelar</button>}</div>
    </form>
  </section>
}
