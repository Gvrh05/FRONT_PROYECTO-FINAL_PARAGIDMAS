import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AvatarSelector } from './AvatarSelector'
import { ParticipantList } from './ParticipantList'
import { Podium } from './Podium'

describe('experiencia de sala', () => {
  it('ofrece quince búhos accesibles y permite elegir sin enviar el formulario', () => {
    const select = vi.fn()
    render(<AvatarSelector value={2} onChange={select} />)
    expect(screen.getAllByRole('button')).toHaveLength(15)
    expect(screen.getByRole('button', { name: 'Búho doctor' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Búho graduado' }))
    expect(select).toHaveBeenCalledWith(3)
    expect(screen.getByRole('button', { name: 'Búho graduado' })).toHaveAttribute('type', 'button')
  })

  it('muestra avatar, preparación y puntos sin incluir preguntas en las tarjetas', () => {
    render(<ParticipantList hostId="host" participants={[
      { userId: 'host', name: 'Docente', connected: true, isHost: true },
      { userId: 'one', name: 'Ada', connected: true, ready: true, avatarId: 3, score: 2 },
      { userId: 'two', name: 'Eva', connected: false, ready: false, avatarId: 1, score: 0 },
    ]} />)
    expect(screen.getByText('✓ Listo')).toBeVisible()
    expect(screen.getByText('2 pts')).toBeVisible()
    expect(screen.getByRole('img', { name: 'Búho graduado' })).toBeVisible()
    expect(screen.getByText('Desconectado')).toBeVisible()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('ordena el top tres y muestra a los demás en una tabla sin mutar los resultados', () => {
    const scores = [
      { playerName: 'Eva', score: 1, rank: 4 },
      { playerName: 'Ada', score: 10, rank: 1 },
      { playerName: 'Leo', score: 7, rank: 2 },
      { playerName: 'Sol', score: 4, rank: 3 },
    ]
    render(<Podium scores={scores} />)
    expect(screen.getByRole('heading', { name: 'Ada' })).toBeVisible()
    expect(screen.getByRole('img', { name: 'Puesto 1' })).toHaveTextContent('🥇')
    expect(within(screen.getByRole('table', { name: 'Resto de participantes' })).getByText('Eva')).toBeVisible()
    expect(scores[0].playerName).toBe('Eva')
  })

  it('tolera un podio vacío y menos de tres jugadores', () => {
    const { rerender } = render(<Podium scores={[]} />)
    expect(screen.getByText('No hay puntuaciones registradas.')).toBeVisible()
    rerender(<Podium scores={[{ playerName: 'Ada', score: 0, rank: 1 }]} />)
    expect(screen.getByText('0 puntos')).toBeVisible()
    expect(screen.queryByRole('table')).toBeNull()
  })
})
