import type { GoalKickState } from './contracts'
import { PHYSICS } from './physics'
export const GAME_ID = '11111111-1111-4111-8111-111111111111'
export const ATTEMPT_ID = '22222222-2222-4222-8222-222222222222'
export function playerFixture(): GoalKickState & { view: 'player' } {
  return { roomCode: '123456', gameId: GAME_ID, phase: 'PLAYING', startedAt: 1000, endsAt: 41000, serverNow: 1000, receivedAt: 0, physicsVersion: 1, config: PHYSICS, scoreboardVersion: 1, scoreboard: [{ playerId: 'guest-id', playerName: 'Ada', avatarId: 14, score: 0, goals: 0, rank: 1 }], view: 'player', revision: 1,
    player: { playerId: 'guest-id', playerName: 'Ada', status: 'READY', board: { attemptId: ATTEMPT_ID, readyAt: 1000, ballStart: { x: 500, y: 620 }, defenders: [{ id: 'a', x: 320, y: 340 }, { id: 'b', x: 650, y: 400 }], keeper: { x: 477, y: 132, displayName: 'Leo', participantId: 'other' } } },
  }
}
