import type { z } from 'zod'
import type { roomDetailsSchema } from '../../api/gameSessions'
import { API_URL } from '../../api/config'
import './goal-kick.css'

export function GoalKickRoomDetails({ details }: { details?: z.infer<typeof roomDetailsSchema> }) {
  if (!details) return null
  return <section className="goal-kick-room-details" aria-label="Datos de la sala">
    {details.coverImageUrl && <img className="goal-kick-room-cover" src={`${API_URL.replace(/\/$/, '')}${details.coverImageUrl}`} alt={`Foto de la sala ${details.name}`} />}
    <h2>{details.name}</h2>{details.description && <p>{details.description}</p>}
  </section>
}
