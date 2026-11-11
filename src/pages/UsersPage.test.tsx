import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { UsersPage } from './UsersPage'
import { SessionProvider } from '../session/session'

afterEach(() => vi.restoreAllMocks())

function renderUsers(role: string) {
  localStorage.setItem('token', 'master-token')
  localStorage.setItem('user', JSON.stringify({ id: 'master', username: 'admin', role }))
  return render(<MemoryRouter initialEntries={['/users']}><SessionProvider><Routes><Route path="users" element={<UsersPage />} /><Route path="dashboard" element={<p>Dashboard protegido</p>} /></Routes></SessionProvider></MemoryRouter>)
}

it('no monta administración para PROFESOR', async () => {
  renderUsers('PROFESOR')
  expect(await screen.findByText('Dashboard protegido')).toBeInTheDocument()
  expect(screen.queryByText('Crear profesor')).not.toBeInTheDocument()
})

it('MASTER crea profesor sin sustituir token y el sistema no se puede desactivar', async () => {
  const original = axios.create.bind(axios)
  const requests: string[] = []
  vi.spyOn(axios, 'create').mockImplementation((config) => {
    const instance = original(config)
    const mock = new MockAdapter(instance)
    mock.onGet('/me').reply(200, { id: 'master', username: 'admin', role: 'MASTER', active: true, isSystem: true, credentialVersion: 1 })
    mock.onGet('/users').reply(200, { items: [{ id: 'master', username: 'admin', role: 'MASTER', active: true, isSystem: true, credentialVersion: 1 }], total: 1, page: 1, limit: 20 })
    mock.onPost('/users').reply((request) => {
      requests.push(request.data as string)
      expect(request.headers?.Authorization).toBe('Bearer master-token')
      return [201, { id: 'prof', username: 'docente', role: 'PROFESOR', active: true, isSystem: false, credentialVersion: 1 }]
    })
    return instance
  })
  const user = userEvent.setup()
  renderUsers('MASTER')
  await screen.findByText('Crear profesor')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Desactivar' })).toBeDisabled())
  await user.type(screen.getByLabelText('Nombre de usuario'), 'docente')
  await user.type(screen.getByLabelText('Contraseña'), 'secure-password')
  await user.click(screen.getByRole('button', { name: 'Guardar' }))
  await screen.findByText('Cambios guardados.')
  expect(JSON.parse(requests[0])).toEqual({ username: 'docente', password: 'secure-password' })
  expect(localStorage.getItem('token')).toBe('master-token')
  expect(JSON.parse(localStorage.getItem('user')!).role).toBe('MASTER')
})
