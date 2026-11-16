import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HostLobbyPage } from './HostLobbyPage'
import { GuestJoinPage } from './GuestJoinPage'

const mocks = vi.hoisted(() => ({ lobby: vi.fn(), ready: vi.fn(), start: vi.fn(), send: vi.fn(), applyStarted: vi.fn() }))
vi.mock('../realtime/useSessionLobby', () => ({ useSessionLobby: mocks.lobby }))
vi.mock('../realtime/socket', () => ({ disconnectGameSocket: vi.fn() }))
vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ user: { sub: 'host' } }) }))
vi.mock('../api/gameSessions', async original => ({ ...await original<typeof import('../api/gameSessions')>(), startSession: mocks.start }))
vi.mock('../components/InvitationLink', () => ({ InvitationLink: () => <p>Invitación</p> }))

const participants = [
  { userId: 'host', name: 'Docente', connected: true, isHost: true, avatarId: 2 },
  { userId: 'guest', name: 'Ada', connected: true, ready: false, avatarId: 3, score: 0 },
]
const session = { sessionId: '123456', roomCode: '123456', hostId: 'host', status: 'LOBBY', participants }
const base = { session, connected: true, loading: false, error: null, setError: vi.fn(), pending: false, send: mocks.send, setReady: mocks.ready, applyStarted: mocks.applyStarted }

beforeEach(() => {
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
  const start = screen.getByRole('button', { name: 'Comenzar Partida' })
  expect(start).toBeEnabled()
  expect(roster).not.toContainElement(start)
  fireEvent.click(start)
  expect(mocks.start).toHaveBeenCalledWith('123456')
})

it('no permite al host comenzar sin otro jugador conectado', () => {
  mocks.lobby.mockReturnValue({ ...base, session: { ...session, participants: [participants[0]] } })
  render(<MemoryRouter><HostLobbyPage roomCode="123456" /></MemoryRouter>)
  expect(screen.getByRole('button', { name: 'Comenzar Partida' })).toBeDisabled()
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
