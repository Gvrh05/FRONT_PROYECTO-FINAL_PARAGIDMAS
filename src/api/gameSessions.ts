import { z } from 'zod'
import { http } from './http'

export const roomCodeSchema = z.string().regex(/^\d{6}$/, 'El código debe tener exactamente 6 dígitos.')
export const quizIdSchema = z.uuid('Selecciona un cuestionario válido.')
const participantSchema = z.object({ userId: z.string(), name: z.string(), connected: z.boolean() })
const sessionSchema = z.object({
  sessionId: roomCodeSchema,
  roomCode: roomCodeSchema,
  status: z.enum(['LOBBY', 'IN_PROGRESS', 'FINISHED']),
  hostId: z.string(),
  quizId: quizIdSchema,
  startedAt: z.string().optional(),
})
export const snapshotSchema = sessionSchema.extend({ participants: z.array(participantSchema) })
export const participantsUpdatedSchema = z.object({ participants: z.array(participantSchema) })
export const sessionStartedSchema = z.object({ sessionId: roomCodeSchema, startedAt: z.string() })
export type Participant = z.infer<typeof participantSchema>
export type Session = z.infer<typeof sessionSchema>
export type SessionSnapshot = z.infer<typeof snapshotSchema>
export type AvailableQuiz = { id: string; title: string }

export async function createGameSession(quizId: string): Promise<Session> {
  const { data } = await http.post('/game-sessions', { quizId: quizIdSchema.parse(quizId) })
  return sessionSchema.parse(data)
}
export async function getSession(roomCode: string, signal?: AbortSignal): Promise<SessionSnapshot> {
  const { data } = await http.get(`/game-sessions/${roomCodeSchema.parse(roomCode)}`, { signal })
  return snapshotSchema.parse(data)
}
export async function listParticipants(roomCode: string, signal?: AbortSignal): Promise<Participant[]> {
  const { data } = await http.get(`/game-sessions/${roomCodeSchema.parse(roomCode)}/participants`, { signal })
  return z.array(participantSchema).parse(data)
}
export async function joinSession(roomCode: string, name?: string) {
  const { data } = await http.post(`/game-sessions/${roomCodeSchema.parse(roomCode)}/join`, name ? { name } : {})
  return z.object({ added: z.boolean(), player: participantSchema }).parse(data)
}
export async function startSession(roomCode: string): Promise<Session> {
  const { data } = await http.post(`/game-sessions/${roomCodeSchema.parse(roomCode)}/start`)
  return sessionSchema.parse(data)
}
export async function listAvailableQuizzes(signal?: AbortSignal): Promise<AvailableQuiz[]> {
  // Deliberately no fallback to the public quiz controller's mock GET /quizzes.
  const { data } = await http.get('/game-sessions/available-quizzes', { signal })
  return z.array(z.object({ id: quizIdSchema, title: z.string() })).parse(data)
}
