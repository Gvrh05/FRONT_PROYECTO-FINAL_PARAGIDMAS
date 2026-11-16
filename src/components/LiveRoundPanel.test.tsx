import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LiveRound } from '../api/gameSessions'
import { LiveRoundPanel } from './LiveRoundPanel'
import { celebrateAnswer } from './answerConfetti'
vi.mock('./answerConfetti', () => ({ celebrateAnswer: vi.fn() }))
beforeEach(() => vi.clearAllMocks())

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
  it('actualiza el contador y la barra con los votos enviados por el servidor', () => {
    const { rerender } = render(<LiveRoundPanel round={{ ...question, votesReceived: 0, eligiblePlayers: 5 }} connected pending={false} />)
    expect(screen.getByText('Votos recibidos: 0 / 5')).toBeVisible()
    rerender(<LiveRoundPanel round={{ ...question, votesReceived: 3, eligiblePlayers: 5 }} connected pending={false} />)
    expect(screen.getByText('Votos recibidos: 3 / 5')).toBeVisible()
    expect(screen.getByRole('progressbar', { name: 'Votos recibidos' })).toHaveAttribute('value', '3')
  })
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

  it('permite al host terminar la votación antes de que se agote el tiempo', () => {
    const close = vi.fn()
    const { rerender } = render(<LiveRoundPanel round={question} connected host pending={false} onClose={close} />)
    fireEvent.click(screen.getByRole('button', { name: 'Terminar votación' }))
    expect(close).toHaveBeenCalledOnce()
    rerender(<LiveRoundPanel round={question} connected host pending onClose={close} />)
    expect(screen.getByRole('button', { name: 'Terminar votación' })).toBeDisabled()
    rerender(<LiveRoundPanel round={{ ...question, closed: true }} connected host pending={false} onClose={close} />)
    expect(screen.queryByRole('button', { name: 'Terminar votación' })).toBeNull()
    expect(screen.getByRole('timer')).toHaveTextContent('Votación cerrada')
  })

  it('celebra la selección y después una respuesta correcta confirmada, una sola vez', () => {
    const answer = vi.fn()
    const { rerender } = render(<LiveRoundPanel round={question} connected pending={false} onAnswer={answer} />)
    fireEvent.click(screen.getByRole('button', { name: 'Verdadero' }))
    expect(answer).toHaveBeenCalledWith(true)
    expect(celebrateAnswer).toHaveBeenCalledWith()
    const result = { ...question, closed: true, answered: true, points: 1, correctAnswer: true }
    rerender(<LiveRoundPanel round={result} connected pending={false} onAnswer={answer} />)
    expect(celebrateAnswer).toHaveBeenCalledWith(true)
    rerender(<LiveRoundPanel round={{ ...result, votesReceived: 3 }} connected pending={false} onAnswer={answer} />)
    expect(celebrateAnswer).toHaveBeenCalledTimes(2)
  })
})
