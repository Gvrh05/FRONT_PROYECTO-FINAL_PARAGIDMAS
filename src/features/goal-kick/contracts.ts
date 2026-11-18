import { z } from 'zod'
const id = z.uuid()
const number = z.number().finite()
const point = z.object({ x: number, y: number })
const result = z.object({ shotId: id, attemptId: id, commandId: id, outcome: z.enum(['GOAL', 'DEFENDER_BLOCK', 'KEEPER_SAVE', 'FRAME_HIT', 'WIDE', 'TIMEOUT']), resolvedAt: number, contactU: z.number().min(0).max(1), contactPoint: point, pointsAwarded: z.number().int().nonnegative(), totalGoals: z.number().int().nonnegative(), totalScore: z.number().int().nonnegative() })
const board = z.object({ attemptId: id, readyAt: number, ballStart: point, defenders: z.array(point.extend({ id: z.string() })).min(2).max(3), keeper: point.extend({ displayName: z.string(), participantId: z.string().optional() }) })
const shot = z.object({ shotId: id, attemptId: id, commandId: id, aimX: number, curve: number, path: z.tuple([point, point, point, point]), shotStartedAt: number, flightMs: z.number().positive() })
export const goalKickBaseSchema = z.object({
  roomCode: z.string().regex(/^\d{6}$/), gameId: id, phase: z.enum(['PLAYING', 'FINISHED', 'CANCELLED']), startedAt: number, endsAt: number, serverNow: number,
  physicsVersion: z.number().int(), config: z.object({ version: z.number(), width: number, height: number, radius: number, goalY: number, flightMs: number, pauseMs: number, durationMs: number, goalPoints: number }),
  scoreboardVersion: z.number().int().nonnegative(),
  scoreboard: z.array(z.object({ playerId: z.string(), playerName: z.string(), avatarId: z.number().int().min(0).max(14), goals: z.number().int().nonnegative(), score: z.number().int().nonnegative(), rank: z.number().int().positive() })),
})
export const goalKickStateSchema = z.discriminatedUnion('view', [
  goalKickBaseSchema.extend({ view: z.literal('host'), revision: z.number().int().nonnegative() }),
  goalKickBaseSchema.extend({ view: z.literal('player'), revision: z.number().int().nonnegative(), player: z.object({ playerId: z.string(), playerName: z.string(), status: z.enum(['READY', 'FLIGHT', 'RESULT']), board, shot: shot.optional(), lastResult: result.optional() }) }),
])
export type GoalKickState = z.infer<typeof goalKickStateSchema> & { receivedAt: number; resultEventShotId?: string }
export type GoalKickBoard = z.infer<typeof board>
export type GoalKickShot = z.infer<typeof shot>
export const goalKickCommandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start'), commandId: id.optional() }).strict(),
  z.object({ action: z.literal('sync'), gameId: id.optional() }).strict(),
  z.object({ action: z.literal('cancel'), gameId: id, commandId: id.optional() }).strict(),
  z.object({ action: z.literal('return'), gameId: id, commandId: id.optional() }).strict(),
  z.object({ action: z.literal('shoot'), gameId: id, attemptId: id, commandId: id.optional(), aimX: z.number().min(200).max(800), curve: z.number().min(-260).max(260) }).strict(),
])
export type GoalKickCommand = z.infer<typeof goalKickCommandSchema>
export const goalKickEventNames = { start: 'game:start-minigame', sync: 'game:sync', shoot: 'game:shoot', cancel: 'game:cancel', return: 'game:return-lobby' } as const
