import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'

const mocks = vi.hoisted(() => ({ logout: vi.fn(), role: 'MASTER' }))
vi.mock('../session/session', () => ({ useSession: () => ({ session: { generation: 1, user: { username: 'Docente', role: mocks.role } }, logout: mocks.logout }) }))
vi.mock('../components/QuizList', () => ({ QuizList: () => <p>Listado de prueba</p> }))
vi.mock('../components/CreateGamePanel', () => ({ CreateGamePanel: () => <p>Crear partida de prueba</p> }))
vi.mock('../components/ResultsPanel', () => ({ ResultsPanel: () => <p>Resultados de prueba</p> }))
vi.mock('./UsersPage', () => ({ UsersPage: () => <p>Usuarios de prueba</p> }))
vi.mock('./JoinSessionPage', () => ({ JoinSessionPage: ({ embedded }: { embedded?: boolean }) => <p>{embedded ? 'Unirse dentro del dashboard' : 'Unirse fuera'}</p> }))
beforeEach(() => { vi.clearAllMocks(); mocks.role = 'MASTER' })

it('mantiene navegación, perfil y logout en el sidebar sin el header interno', () => {
  const { container } = render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  const sidebar = screen.getByRole('complementary', { name: 'Navegación principal' })
  expect(container.querySelector('.dashboard-topbar')).toBeNull()
  expect(within(sidebar).getByText('Docente', { selector: 'strong' })).toBeVisible()
  expect(screen.getByText('Listado de prueba')).toBeVisible()
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Crear partida' }))
  expect(screen.getByText('Crear partida de prueba')).toBeVisible()
  expect(within(sidebar).getByRole('button', { name: 'Crear partida' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Resultados' }))
  expect(screen.getByText('Resultados de prueba')).toBeVisible()
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Quices' }))
  expect(screen.getByText('Listado de prueba')).toBeVisible()
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Unirse a Sala' }))
  expect(screen.getByText('Unirse dentro del dashboard')).toBeVisible()
  expect(screen.getByRole('complementary', { name: 'Navegación principal' })).toBe(sidebar)
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Usuarios' }))
  expect(screen.getByText('Usuarios de prueba')).toBeVisible()
  expect(screen.getByRole('complementary', { name: 'Navegación principal' })).toBe(sidebar)
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Cerrar sesión' }))
  expect(mocks.logout).toHaveBeenCalledOnce()
})

it('muestra Usuarios deshabilitado para un profesor sin conceder permisos nuevos', () => {
  mocks.role = 'PROFESOR'
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  expect(screen.getByRole('button', { name: 'Usuarios' })).toBeDisabled()
})
