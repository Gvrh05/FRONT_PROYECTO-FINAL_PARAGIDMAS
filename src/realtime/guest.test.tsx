import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthContext'
import { useSessionLobby } from './useSessionLobby'
import { playerFixture } from '../features/goal-kick/test-fixture'

const state = vi.hoisted(() => ({ listeners: new Map<string, (payload?: unknown) => void>(), emit: vi.fn(), rest: vi.fn(), lease: vi.fn() }))
vi.mock('../api/gameSessions', async (original) => ({ ...await original<typeof import('../api/gameSessions')>(), getSession: state.rest }))
vi.mock('./socket', () => ({ disconnectGameSocket: vi.fn(), leaseGameSocket: state.lease }))

beforeEach(() => {
  state.listeners.clear(); state.emit.mockClear(); state.rest.mockClear()
  state.lease.mockImplementation(() => ({ release: vi.fn(), socket: {
    connected: true, emit: state.emit, connect: vi.fn(),
    on: (event: string, handler: (payload?: unknown) => void) => state.listeners.set(event, handler),
    off: (event: string) => state.listeners.delete(event),
  } }))
})

it('reconecta al invitado sin REST privado y responde Verdadero/Falso con su credencial exclusiva', async () => {
  const { result, unmount } = renderHook(() => useSessionLobby('123456', 'opaque-guest'), { wrapper: AuthProvider })
  await waitFor(() => expect(state.emit).toHaveBeenCalledWith('join-session', { roomCode: '123456' }))
  expect(state.lease).toHaveBeenCalledWith('opaque-guest', '123456', true)
  expect(state.rest).not.toHaveBeenCalled()
  const questionId = '11111111-1111-4111-8111-111111111111'
  act(() => state.listeners.get('session-state')?.({ sessionId: '123456', roomCode: '123456', status: 'LOBBY', participants: [{ userId: 'guest-id', name: 'Alumno', connected: true }] }))
  expect(result.current.session?.participants[0].name).toBe('Alumno')
  expect(result.current.session?.hostId).toBe('')
  act(() => state.listeners.get('question-opened')?.({ roomCode: '123456', game: { questionId, questionText: 'El agua es líquida', imageUrl: null, position: 1, total: 1, version: 1, serverNow: Date.now(), closesAt: Date.now() + 30000, closed: false } }))
  expect(result.current.round?.correctAnswer).toBeUndefined()
  act(() => result.current.send('submit-answer', questionId, true))
  expect(state.emit).toHaveBeenCalledWith('submit-answer', { roomCode: '123456', questionId, answer: true })
  act(() => state.listeners.get('connect')?.())
  expect(state.emit.mock.calls.filter(([name]) => name === 'join-session')).toHaveLength(2)
  unmount()
  expect(state.listeners.size).toBe(0)
})

it('sincroniza búhos, preparación y votos sin perder respuesta confirmada ni listeners al salir', async () => {
  const { result, unmount } = renderHook(() => useSessionLobby('123456', 'opaque-guest', true, 3), { wrapper: AuthProvider })
  await waitFor(() => expect(state.emit).toHaveBeenCalledWith('join-session', { roomCode: '123456', avatarId: 3 }))
  act(() => result.current.setReady(true))
  expect(state.emit).toHaveBeenCalledWith('set-ready', { roomCode: '123456', ready: true })
  const participant = { userId: 'guest-id', name: 'Alumno', connected: true, avatarId: 3, ready: false, score: 0 }
  act(() => state.listeners.get('session-state')?.({ sessionId: '123456', roomCode: '123456', status: 'LOBBY', participants: [participant] }))
  act(() => state.listeners.get('participants-updated')?.({ participants: [{ ...participant, ready: true }] }))
  expect(result.current.session?.participants[0]).toMatchObject({ avatarId: 3, ready: true })
  const questionId = '11111111-1111-4111-8111-111111111111'
  const game = { questionId, questionText: 'Pregunta', imageUrl: null, position: 1, total: 1, version: 1, serverNow: Date.now(), closesAt: Date.now() + 30000, closed: false, votesReceived: 0, eligiblePlayers: 5 }
  act(() => state.listeners.get('question-opened')?.({ roomCode: '123456', game }))
  act(() => result.current.send('submit-answer', questionId, false))
  act(() => state.listeners.get('answer-progress')?.({ roomCode: '123456', game: { ...game, votesReceived: 1 } }))
  expect(result.current.pending).toBe(true)
  act(() => state.listeners.get('answer-accepted')?.({ roomCode: '123456', questionId }))
  act(() => state.listeners.get('answer-progress')?.({ roomCode: '123456', game: { ...game, votesReceived: 3 } }))
  expect(result.current.round).toMatchObject({ votesReceived: 3, eligiblePlayers: 5, answered: true })
  act(() => state.listeners.get('answer-progress')?.({ roomCode: '654321', game: { ...game, votesReceived: 4 } }))
  expect(result.current.round?.votesReceived).toBe(3)
  act(() => state.listeners.get('question-closed')?.({ roomCode: '123456', game: { ...game, closed: true, version: 2, voteCounts: { true: 2, false: 1 } } }))
  expect(result.current.round?.resultReceived).not.toBe(true)
  act(() => state.listeners.get('round-result')?.({ roomCode: '123456', game: { ...game, closed: true, version: 2, answered: true, points: 25, voteCounts: { true: 2, false: 1 } } }))
  expect(result.current.round).toMatchObject({ resultReceived: true, points: 25, voteCounts: { true: 2, false: 1 } })
  act(() => state.listeners.get('game-finished')?.({ roomCode: '123456', version: 2, scores: [{ playerName: 'Alumno', score: 1, rank: 1, avatarId: 3 }] }))
  expect(result.current.finished?.scores[0].avatarId).toBe(3)
  unmount()
  expect(state.listeners.size).toBe(0)
})

it('recupera el lobby por snapshot si perdió el retorno mientras estaba desconectado', async () => {
  const { result, unmount } = renderHook(() => useSessionLobby('123456', 'opaque-guest'), { wrapper: AuthProvider })
  await waitFor(() => expect(state.emit).toHaveBeenCalledWith('join-session', { roomCode: '123456' }))
  const fixture = playerFixture()
  act(() => state.listeners.get('game:state')?.({ state: fixture }))
  act(() => state.listeners.get('disconnect')?.('transport close'))
  act(() => state.listeners.get('connect')?.())
  act(() => state.listeners.get('session-state')?.({ sessionId: '123456', roomCode: '123456', status: 'LOBBY', participants: [] }))
  expect(result.current.goalKick).toBeUndefined()
  expect(result.current.goalKickPending).toBe(false)
  act(() => state.listeners.get('game:state')?.({ state: fixture }))
  expect(result.current.goalKick).toBeUndefined()
  unmount()
  expect(state.listeners.size).toBe(0)
})

it('integra minijuego en el mismo lease, separa versiones y descarta estados retirados', async () => {
  const { result, unmount } = renderHook(() => useSessionLobby('123456', 'opaque-guest'), { wrapper: AuthProvider })
  await waitFor(() => expect(state.emit).toHaveBeenCalledWith('join-session', { roomCode: '123456' }))
  const fixture = playerFixture()
  act(() => state.listeners.get('game:state')?.({ state: fixture }))
  expect(result.current.goalKick?.gameId).toBe(fixture.gameId)
  act(() => result.current.sendGoalKickCommand({ action: 'shoot', gameId: fixture.gameId, attemptId: fixture.player.board.attemptId, aimX: 272, curve: 65 }))
  expect(state.emit).toHaveBeenCalledWith('game:shoot', expect.objectContaining({ roomCode: '123456', aimX: 272, curve: 65, commandId: expect.any(String) }))
  act(() => state.listeners.get('game:scoreboard')?.({ ...fixture, scoreboardVersion: 3, scoreboard: [{ ...fixture.scoreboard[0], score: 10, goals: 1 }] }))
  act(() => state.listeners.get('game:state')?.({ state: { ...fixture, revision: 2 } }))
  expect(result.current.goalKick?.scoreboard[0].score).toBe(10)
  act(() => state.listeners.get('game:lobby-restored')?.({ roomCode: '123456', gameId: fixture.gameId }))
  expect(result.current.goalKick).toBeUndefined()
  act(() => state.listeners.get('game:state')?.({ state: fixture }))
  expect(result.current.goalKick).toBeUndefined()
  unmount()
  expect(state.listeners.size).toBe(0)
})
