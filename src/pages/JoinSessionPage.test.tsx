import MockAdapter from 'axios-mock-adapter'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, it } from 'vitest'
import { http } from '../api/http'
import { AuthProvider } from '../auth/AuthContext'
import { JoinSessionPage } from './JoinSessionPage'

it('entra con el token de su perfil y el PIN sin consultar el estado reservado al anfitrión', async () => {
  sessionStorage.setItem('token', 'player-token')
  const mock = new MockAdapter(http)
  mock.onPost('/game-sessions/123456/join').reply(201, {
    added: true,
    player: { userId: 'player', name: 'docente', connected: false },
  })
  try {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/join?pin=123456']}><AuthProvider>
      <Routes>
        <Route path="/join" element={<JoinSessionPage />} />
        <Route path="/play/lobby/:pin" element={<p>Sala del jugador</p>} />
      </Routes>
    </AuthProvider></MemoryRouter>)
    expect(screen.getByLabelText('Código de sala')).toHaveValue('123456')
    await user.click(screen.getByRole('button', { name: 'Unirse' }))
    expect(await screen.findByText('Sala del jugador')).toBeInTheDocument()
    expect(mock.history.get).toHaveLength(0)
    expect(mock.history.post[0].headers?.Authorization).toBe('Bearer player-token')
  } finally {
    mock.restore()
  }
})
