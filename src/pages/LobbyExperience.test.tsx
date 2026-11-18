import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HostLobbyPage } from './HostLobbyPage'
import { GuestJoinPage } from './GuestJoinPage'
import { playerFixture } from '../features/goal-kick/test-fixture'

const mocks = vi.hoisted(() => ({ lobby: vi.fn(), ready: vi.fn(), start: vi.fn(), send: vi.fn(), sendGoalKick: vi.fn(), applyStarted: vi.fn(), listeners: new Set<() => void>() }))
vi.mock('../realtime/useSessionLobby', async () => {
  const { useSyncExternalStore } = await import('react')
  return { useSessionLobby: () => useSyncExternalStore(listener => {
    mocks.listeners.add(listener)
    return () => mocks.listeners.delete(listener)
  }, () => mocks.lobby()) }
})
vi.mock('../realtime/socket', () => ({ disconnectGameSocket: vi.fn() }))
vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ user: { sub: 'host' } }) }))
vi.mock('../api/gameSessions', async original => ({ ...await original<typeof import('../api/gameSessions')>(), startSession: mocks.start }))
vi.mock('../components/InvitationLink', () => ({ InvitationLink: () => <p>Invitación</p> }))
vi.mock('../features/goal-kick/GoalKickCanvas', () => ({ GoalKickCanvas: () => <div role="img" aria-label="Campo de Tiro al Arco" /> }))

const participants = [
  { userId: 'host', name: 'Docente', connected: true, isHost: true, avatarId: 2 },
  { userId: 'guest', name: 'Ada', connected: true, ready: false, avatarId: 3, score: 0 },
]
const session = { sessionId: '123456', roomCode: '123456', hostId: 'host', status: 'LOBBY', participants }
const base = { session, connected: true, loading: false, error: null, setError: vi.fn(), pending: false, send: mocks.send, setReady: mocks.ready, applyStarted: mocks.applyStarted, goalKickPending: false, goalKickError: '', sendGoalKickCommand: mocks.sendGoalKick }

afterEach(() => vi.unstubAllEnvs())

beforeEach(() => {
  vi.stubEnv('VITE_GOAL_KICK_ENABLED', 'true')
  vi.clearAllMocks()
  sessionStorage.clear()
  mocks.lobby.mockReturnValue(base)
  mocks.start.mockResolvedValue({ ...session, status: 'IN_PROGRESS' })
})

it('permite al host forzar el inicio conservando la autorización REST y el panel separado', async () => {
  render(<MemoryRouter><HostLobbyPage roomCode="123456" /></MemoryRouter>)
  const roster = screen.getByRole('complementary', { name: 'Jugadores de la sala' })
  expect(within(roster).getByText('Ada')).toBeVisible()
  expect(screen.getByText('Listos: 0 / 1')).toBeVisible()
  expect(screen.getByRole('radio', { name: 'Trivia' })).toBeChecked()
  const start = screen.getByRole('button', { name: 'Comenzar Partida' })
  expect(start).toBeEnabled()
  expect(roster).not.toContainElement(start)
  fireEvent.click(start)
  expect(mocks.start).toHaveBeenCalledWith('123456')
  expect(mocks.sendGoalKick).not.toHaveBeenCalled()
  await waitFor(() => expect(mocks.applyStarted).toHaveBeenCalled())
})

it('no permite al host comenzar sin otro jugador conectado', () => {
  mocks.lobby.mockReturnValue({ ...base, session: { ...session, participants: [participants[0]] } })
  render(<MemoryRouter><HostLobbyPage roomCode="123456" /></MemoryRouter>)
  expect(screen.getByRole('button', { name: 'Comenzar Partida' })).toBeDisabled()
  fireEvent.click(screen.getByRole('radio', { name: 'Minijuego: Tiro al Arco' }))
  expect(screen.getByRole('button', { name: 'Iniciar Tiro al Arco · 40 s' })).toBeDisabled()
})

it('selecciona fútbol sin iniciarlo automáticamente y usa solo su comando existente', () => {
  const view = <MemoryRouter><HostLobbyPage roomCode="123456" /></MemoryRouter>
  const { rerender } = render(view)
  fireEvent.click(screen.getByRole('radio', { name: 'Minijuego: Tiro al Arco' }))
  expect(mocks.sendGoalKick).not.toHaveBeenCalled()
  expect(screen.getByRole('radio', { name: 'Minijuego: Tiro al Arco' })).toBeChecked()
  expect(screen.queryByRole('button', { name: 'Comenzar Partida' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar Tiro al Arco · 40 s' }))
  expect(mocks.sendGoalKick).toHaveBeenCalledExactlyOnceWith({ action: 'start' })
  expect(mocks.start).not.toHaveBeenCalled()
  mocks.lobby.mockReturnValue({ ...base, goalKick: { ...playerFixture(), view: 'host' } })
  rerender(<MemoryRouter><HostLobbyPage roomCode="123456" /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: 'Tiro al Arco · Anfitrión' })).toBeVisible()
  expect(screen.queryByRole('group', { name: 'Elige la actividad' })).toBeNull()
})

it('bloquea ambos modos mientras espera confirmación del minijuego', () => {
  mocks.lobby.mockReturnValue({ ...base, goalKickPending: true })
  render(<MemoryRouter><HostLobbyPage roomCode="123456" /></MemoryRouter>)
  expect(screen.getByRole('button', { name: 'Iniciando…' })).toBeDisabled()
  for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
})

it('una sala de fútbol independiente no ofrece trivia y mantiene sus datos tras recuperar estado', () => {
  vi.stubEnv('VITE_GOAL_KICK_ENABLED', 'false')
  mocks.lobby.mockReturnValue({ ...base, session: { ...session, quizId: null, activity: 'GOAL_KICK', roomDetails: { name: 'Copa del aula', description: 'Solo fútbol' } } })
  render(<MemoryRouter><HostLobbyPage roomCode="123456" /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: 'Copa del aula' })).toBeVisible()
  expect(screen.queryByRole('radio', { name: 'Trivia' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar Tiro al Arco · 40 s' }))
  expect(mocks.sendGoalKick).toHaveBeenCalledExactlyOnceWith({ action: 'start' })
  expect(mocks.start).not.toHaveBeenCalled()
})

it('conserva el flag de despliegue para el selector en salas de trivia', async () => {
  vi.stubEnv('VITE_GOAL_KICK_ENABLED', 'false')
  render(<MemoryRouter><HostLobbyPage roomCode="123456" /></MemoryRouter>)
  expect(screen.queryByRole('radio', { name: 'Minijuego: Tiro al Arco' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Comenzar Partida' }))
  await waitFor(() => expect(mocks.applyStarted).toHaveBeenCalled())
  expect(mocks.sendGoalKick).not.toHaveBeenCalled()
})

it('no ofrece controles de inicio sin conexión o a una identidad que no es host', () => {
  mocks.lobby.mockReturnValue({ ...base, connected: false })
  const { rerender } = render(<MemoryRouter><HostLobbyPage roomCode="123456" /></MemoryRouter>)
  expect(screen.getByRole('button', { name: 'Comenzar Partida' })).toBeDisabled()
  for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
  mocks.lobby.mockReturnValue({ ...base, session: { ...session, hostId: 'someone-else' } })
  rerender(<MemoryRouter><HostLobbyPage roomCode="123456" /></MemoryRouter>)
  expect(screen.queryByRole('group', { name: 'Elige la actividad' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Comenzar Partida' })).toBeNull()
})

it('el invitado cambia del lobby al minijuego cuando recibe su estado', () => {
  sessionStorage.setItem('kahoot:guest:invitation', JSON.stringify({ participantId: 'guest', username: 'Ada', roomCode: '123456', invitationId: 'invitation', guestToken: 'opaque', avatarId: 3 }))
  const view = () => <MemoryRouter initialEntries={['/join/invitation']}><Routes><Route path="/join/:invitationId" element={<GuestJoinPage />} /></Routes></MemoryRouter>
  render(view())
  expect(screen.getByRole('button', { name: '¡Estoy listo!' })).toBeVisible()
  mocks.lobby.mockReturnValue({ ...base, goalKick: { ...playerFixture(), receivedAt: performance.now() } })
  act(() => { for (const listener of mocks.listeners) listener() })
  expect(screen.getByRole('heading', { name: 'Tiro al Arco' })).toBeVisible()
  expect(screen.getByRole('img', { name: 'Campo de Tiro al Arco' })).toBeVisible()
  expect(screen.queryByRole('button', { name: '¡Estoy listo!' })).toBeNull()
  expect(mocks.start).not.toHaveBeenCalled()
  expect(mocks.sendGoalKick).not.toHaveBeenCalled()
})

it('el invitado envía Listo y la pregunta nunca se monta dentro de participantes', () => {
  sessionStorage.setItem('kahoot:guest:invitation', JSON.stringify({ participantId: 'guest', username: 'Ada', roomCode: '123456', invitationId: 'invitation', guestToken: 'opaque', avatarId: 3 }))
  const view = () => <MemoryRouter initialEntries={['/join/invitation']}><Routes><Route path="/join/:invitationId" element={<GuestJoinPage />} /></Routes></MemoryRouter>
  const { unmount } = render(view())
  fireEvent.click(screen.getByRole('button', { name: '¡Estoy listo!' }))
  expect(mocks.ready).toHaveBeenCalledWith(true)
  mocks.lobby.mockReturnValue({ ...base, session: { ...session, status: 'IN_PROGRESS' }, round: {
    questionId: 'question', questionText: 'Pregunta separada de los nombres', imageUrl: null, position: 1, total: 1, version: 1, serverNow: Date.now(), closesAt: Date.now() + 30000, closed: false, votesReceived: 1, eligiblePlayers: 1,
  } })
  unmount()
  render(view())
  expect(screen.getByRole('heading', { name: 'Pregunta separada de los nombres' })).toBeVisible()
  const roster = screen.getByRole('complementary', { name: 'Jugadores de la sala' })
  expect(within(roster).queryByRole('heading', { name: 'Pregunta separada de los nombres' })).toBeNull()
  expect(within(roster).queryByRole('button', { name: 'Verdadero' })).toBeNull()
  expect(screen.getByText('Votos recibidos: 1 / 1')).toBeVisible()
})
