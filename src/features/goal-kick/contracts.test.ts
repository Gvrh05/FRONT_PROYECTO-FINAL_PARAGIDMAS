import { expect, it } from 'vitest'
import { goalKickCommandSchema, goalKickStateSchema } from './contracts'
import { ATTEMPT_ID, GAME_ID, playerFixture } from './test-fixture'
import { finishSchema, participantsUpdatedSchema } from '../../api/gameSessions'
it('validates the complete private snapshot and all new avatars without losing old IDs', () => {
  expect(goalKickStateSchema.safeParse(playerFixture()).success).toBe(true)
  for (const avatarId of [0, 9, 10, 11, 12, 13, 14]) {
    expect(participantsUpdatedSchema.safeParse({ participants: [{ userId: 'p', name: 'Ada', connected: true, avatarId }] }).success).toBe(true)
    expect(finishSchema.safeParse({ roomCode: '123456', version: 1, scores: [{ playerName: 'Ada', score: 25, rank: 1, avatarId }] }).success).toBe(true)
  }
  expect(participantsUpdatedSchema.safeParse({ participants: [{ userId: 'p', name: 'Ada', connected: true, avatarId: 15 }] }).success).toBe(false)
})
it('rejects spoofed scores, nonfinite coordinates and invalid geometry commands', () => {
  const command = { action: 'shoot', gameId: GAME_ID, attemptId: ATTEMPT_ID, aimX: 272, curve: 65 }
  expect(goalKickCommandSchema.safeParse(command).success).toBe(true)
  for (const patch of [{ score: 10 }, { userId: 'other' }, { aimX: Infinity }, { curve: 261 }, { aimX: '272' }, { attemptId: 'not-a-uuid' }]) expect(goalKickCommandSchema.safeParse({ ...command, ...patch }).success).toBe(false)
})
