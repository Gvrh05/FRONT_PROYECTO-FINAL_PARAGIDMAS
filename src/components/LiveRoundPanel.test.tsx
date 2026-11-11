import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { LiveRound } from '../api/gameSessions'
import { LiveRoundPanel } from './LiveRoundPanel'

const question: LiveRound = {
  questionId: 'efed51ad-1c55-4817-a164-c70f679e8001',
  questionText: 'La figura azul es un círculo.',
  imageUrl: '/uploads/live/example.png',
  position: 1,
  total: 2,
  version: 1,
  serverNow: 1_000,
  closesAt: 21_000,
  closed: false,
}

describe('partida en vivo', () => {
  it('permite responder Falso y deshabilita el envío al confirmar', () => {
    const onAnswer = vi.fn()
    const { rerender } = render(<LiveRoundPanel round={question} connected pending={false} onAnswer={onAnswer} />)
    expect(screen.getByRole('img')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Falso' }))
    expect(onAnswer).toHaveBeenCalledWith(false)
    rerender(<LiveRoundPanel round={{ ...question, answered: true }} connected pending={false} onAnswer={onAnswer} />)
    expect(screen.getByRole('button', { name: 'Verdadero' })).toBeDisabled()
    expect(screen.getByText('Respuesta registrada')).toBeVisible()
  })

  it('habilita Siguiente para el host después del cierre', () => {
    const onNext = vi.fn()
    const { rerender } = render(<LiveRoundPanel round={question} connected host pending={false} onNext={onNext} />)
    expect(screen.queryByRole('button', { name: 'Siguiente pregunta' })).toBeNull()
    rerender(<LiveRoundPanel round={{ ...question, closed: true, correctAnswer: true }} connected host pending={false} onNext={onNext} />)
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente pregunta' }))
    expect(onNext).toHaveBeenCalledOnce()
  })
})
