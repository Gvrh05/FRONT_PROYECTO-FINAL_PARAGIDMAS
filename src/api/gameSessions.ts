import { z } from 'zod'
import { http } from './http'
import { goalKickStateSchema } from '../features/goal-kick/contracts'

export const roomCodeSchema = z.string().regex(/^\d{6}$/, 'El código debe tener exactamente 6 dígitos.')
export const quizIdSchema = z.uuid('Selecciona un cuestionario válido.')
const participantSchema = z.object({ userId: z.string(), name: z.string(), connected: z.boolean(), avatarId: z.number().int().min(0).max(14).optional(), ready: z.boolean().optional(), score: z.number().optional(), isHost: z.boolean().optional() })
const sessionSchema = z.object({
  sessionId: roomCodeSchema,
  roomCode: roomCodeSchema,
  invitationId: z.string().optional(),
  status: z.enum(['LOBBY', 'IN_PROGRESS', 'FINISHED']),
  hostId: z.string(),
  quizId: quizIdSchema,
  startedAt: z.string().optional(),
})
export type ScoringMode = 'classic' | 'speed' | 'precision'

export const liveRoundSchema = z.object({
  questionId: z.uuid(), questionText: z.string(), imageUrl: z.string().nullable(),
  position: z.number(), total: z.number(), version: z.number(),
  serverNow: z.number(), closesAt: z.number(), closed: z.boolean(),
  scoringMode: z.enum(['speed', 'precision']).optional(), openedAt: z.number().optional(),
  choices: z.array(z.string()).min(2).max(5).optional(),
  choiceVotes: z.array(z.number().int().nonnegative()).min(2).max(5).optional(),
  correctAnswer: z.union([z.boolean(), z.number().int().min(0).max(4)]).optional(), answered: z.boolean().optional(), points: z.number().optional(),
  votesReceived: z.number().int().nonnegative().optional(), eligiblePlayers: z.number().int().nonnegative().optional(),
  voteCounts: z.object({ true: z.number().int().nonnegative(), false: z.number().int().nonnegative() }).optional(),
})
export const finishSchema = z.object({
  roomCode: roomCodeSchema, version: z.number(),
  scores: z.array(z.object({ playerName: z.string(), score: z.number(), rank: z.number(), avatarId: z.number().int().min(0).max(14).optional() })),
})
export type LiveRound = z.infer<typeof liveRoundSchema> & { resultReceived?: boolean }
export const snapshotSchema = sessionSchema.extend({ participants: z.array(participantSchema), game: liveRoundSchema.optional(), goalKick: goalKickStateSchema.optional() })
// Guest snapshots deliberately omit private host and quiz identifiers.
export const guestSnapshotSchema = snapshotSchema.omit({ hostId: true, quizId: true }).transform((snapshot) => ({ ...snapshot, hostId: '', quizId: '' }))
export const participantsUpdatedSchema = z.object({ participants: z.array(participantSchema) })
export const sessionStartedSchema = z.object({ sessionId: roomCodeSchema, startedAt: z.string() })
export type Participant = z.infer<typeof participantSchema>
export type Session = z.infer<typeof sessionSchema>
export type SessionSnapshot = z.infer<typeof snapshotSchema>
export type AvailableQuiz = { id: string; title: string }

export async function createGameSession(quizId: string, scoringMode?: ScoringMode): Promise<Session> {
  const { data } = await http.post('/game-sessions', { quizId: quizIdSchema.parse(quizId), ...(scoringMode && { scoringMode }) })
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
