import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AUTH_API_URL } from '../api/config'
import { LoginForm } from '../components/LoginForm'
import { SessionProvider, useSession } from './session'

function SessionStatus() {
  const { session, logout } = useSession()
  return session ? (
    <div>
      <p>Bienvenido {session.user.username}</p>
      <button type="button" onClick={() => logout()}>Salir</button>
    </div>
  ) : null
}

function LogoutControl() {
  const { logout } = useSession()
  return <button type="button" onClick={() => logout()}>Cancelar acceso</button>
}

describe('sesión en memoria', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('muestra error con credenciales rechazadas y no abre sesión', async () => {
    const createSpy = vi.spyOn(axios, 'create')
    const user = userEvent.setup()
    render(<SessionProvider><LoginForm /><SessionStatus /><LogoutControl /></SessionProvider>)
    const authClient = createSpy.mock.results.find((result) => result.type === 'return')?.value
    expect(authClient).toBeDefined()
    const mock = new MockAdapter(authClient!)
    mock.onPost('/login').reply(401, { error: 'Unauthorized' })
    await user.type(screen.getByLabelText('Usuario'), 'docente')
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText('Usuario o contraseña incorrectos.')).toBeInTheDocument()
    expect(screen.queryByText(/Bienvenido/)).not.toBeInTheDocument()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    mock.restore()
  })

  it('acepta el contrato externo, permite logout y no restaura en un montaje nuevo', async () => {
    const createSpy = vi.spyOn(axios, 'create')
    const user = userEvent.setup()
    const result = render(<SessionProvider><LoginForm /><SessionStatus /></SessionProvider>)
    const authClient = createSpy.mock.results.find((entry) => entry.type === 'return')?.value
    const mock = new MockAdapter(authClient!)
    mock.onPost('/login').reply((config) => {
      expect(config.baseURL).toBe(AUTH_API_URL)
      return [200, { accessToken: 'memory-token', user: { id: 'u1', username: 'docente', role: 'teacher' } }]
    })
    await user.type(screen.getByLabelText('Usuario'), 'docente')
    await user.type(screen.getByLabelText('Contraseña'), 'secreta')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText('Bienvenido docente')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salir' }))
    expect(screen.queryByText('Bienvenido docente')).not.toBeInTheDocument()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    result.unmount()
    render(<SessionProvider><LoginForm /><SessionStatus /><LogoutControl /></SessionProvider>)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Profelink Kahoot' })).toBeInTheDocument())
    expect(screen.queryByText('Bienvenido docente')).not.toBeInTheDocument()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    mock.restore()
  })

  it('descarta una respuesta de login que termina después del logout', async () => {
    const createSpy = vi.spyOn(axios, 'create')
    const user = userEvent.setup()
    render(<SessionProvider><LoginForm /><SessionStatus /><LogoutControl /></SessionProvider>)
    const authClient = createSpy.mock.results.find((entry) => entry.type === 'return')?.value
    const mock = new MockAdapter(authClient!)
    let resolveResponse: ((value: [number, unknown]) => void) | undefined
    mock.onPost('/login').reply(() => new Promise((resolve) => {
      resolveResponse = resolve
    }))
    await user.type(screen.getByLabelText('Usuario'), 'late')
    await user.type(screen.getByLabelText('Contraseña'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar acceso' }))
    resolveResponse?.([200, { accessToken: 'late-token', user: { id: 'u1', username: 'late', role: 'teacher' } }])
    await waitFor(() => expect(screen.queryByText(/Bienvenido/)).not.toBeInTheDocument())
    mock.restore()
  })
})
