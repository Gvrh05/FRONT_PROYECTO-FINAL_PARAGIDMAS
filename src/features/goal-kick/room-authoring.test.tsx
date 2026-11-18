import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { QuestionForm } from '../../components/QuestionForm'
import { QuizForm } from '../../components/QuizForm'
import { HostCreateSessionPage } from '../../pages/HostCreateSessionPage'
import { GoalKickRoomForm } from './GoalKickRoomForm'

const mocks = vi.hoisted(() => ({ createRoom: vi.fn(), createTrivia: vi.fn(), list: vi.fn(), navigate: vi.fn() }))
vi.mock('../../api/gameSessions', async original => ({ ...await original<typeof import('../../api/gameSessions')>(), createGoalKickRoom: mocks.createRoom, createGameSession: mocks.createTrivia, listAvailableQuizzes: mocks.list }))
vi.mock('react-router-dom', async original => ({ ...await original<typeof import('react-router-dom')>(), useNavigate: () => mocks.navigate }))
vi.mock('../../session/session', () => ({ useSession: () => ({ api: undefined, session: { generation: 1 }, isCurrent: () => true }) }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.list.mockResolvedValue([])
  mocks.createRoom.mockResolvedValue({ roomCode: '123456', activity: 'GOAL_KICK', quizId: null })
  mocks.createTrivia.mockResolvedValue({ roomCode: '123456' })
})

it('ofrece fútbol junto a opciones múltiples y V/F y pide únicamente los datos de sala', async () => {
  const persisted = vi.fn()
  render(<QuestionForm quizId="existing-quiz" onPersisted={persisted} onClose={vi.fn()} onUnavailable={vi.fn()} />)
  expect(screen.getByRole('option', { name: 'Opción múltiple (2–5 opciones)' })).toBeVisible()
  expect(screen.getByRole('option', { name: 'Verdadero / Falso' })).toBeVisible()
  fireEvent.change(screen.getByLabelText('Tipo de actividad'), { target: { value: 'GOAL_KICK' } })
  expect(screen.queryByLabelText('Enunciado')).toBeNull()
  expect(screen.queryByLabelText('Opción 1')).toBeNull()
  expect(screen.queryByLabelText('Tiempo (segundos)')).toBeNull()
  expect(screen.queryByLabelText('Puntos')).toBeNull()
  expect(screen.getByLabelText('Imagen (opcional)')).toBeVisible()
  fireEvent.change(screen.getByLabelText('Nombre de la sala'), { target: { value: '  Copa del aula  ' } })
  fireEvent.change(screen.getByLabelText('Descripción (opcional)'), { target: { value: '  Juguemos juntos  ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Crear sala de Tiro al Arco' }))
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/host/lobby/123456'))
  expect(mocks.createRoom).toHaveBeenCalledWith({ name: 'Copa del aula', description: 'Juguemos juntos' }, null, expect.any(AbortSignal))
  expect(persisted).not.toHaveBeenCalled()
})

it('conserva el borrador de trivia al volver del modo fútbol sin guardar nada', () => {
  render(<QuestionForm quizId="existing-quiz" onPersisted={vi.fn()} onClose={vi.fn()} onUnavailable={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Enunciado'), { target: { value: 'Mi pregunta pendiente' } })
  fireEvent.change(screen.getByLabelText('Opción 1'), { target: { value: 'Primera' } })
  fireEvent.change(screen.getByLabelText('Tipo de actividad'), { target: { value: 'GOAL_KICK' } })
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.getByLabelText('Enunciado')).toHaveValue('Mi pregunta pendiente')
  expect(screen.getByLabelText('Opción 1')).toHaveValue('Primera')
  expect(mocks.createRoom).not.toHaveBeenCalled()
})

it('conserva las cinco opciones y la correcta al alternar fútbol, y permite reducir hasta dos', () => {
  render(<QuestionForm quizId="existing-quiz" onPersisted={vi.fn()} onClose={vi.fn()} onUnavailable={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Agregar opción' }))
  fireEvent.change(screen.getByLabelText('Opción 5'), { target: { value: 'Respuesta quinta' } })
  fireEvent.click(screen.getByLabelText('Correcta', { selector: 'input[value="4"]' }))
  fireEvent.change(screen.getByLabelText('Tipo de actividad'), { target: { value: 'GOAL_KICK' } })
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.getByLabelText('Opción 5')).toHaveValue('Respuesta quinta')
  expect(screen.getByLabelText('Correcta', { selector: 'input[value="4"]' })).toBeChecked()
  for (let index = 0; index < 3; index++) fireEvent.click(screen.getByRole('button', { name: 'Quitar última opción' }))
  expect(screen.getByLabelText('Opción 2')).toBeVisible()
  expect(screen.queryByLabelText('Opción 3')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Quitar última opción' })).toBeNull()
  expect(screen.getAllByRole('radio').every(radio => !(radio as HTMLInputElement).checked)).toBe(true)
})

it('permite crear fútbol desde Nuevo cuestionario sin guardar un cuestionario', () => {
  const saved = vi.fn()
  render(<QuizForm onSaved={saved} onCancel={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Crear Tiro al Arco sin preguntas' }))
  expect(screen.getByLabelText('Nombre de la sala')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Guardar cuestionario' })).toBeNull()
  expect(saved).not.toHaveBeenCalled()
})

it('permite crear fútbol desde Crear partida aunque no existan cuestionarios', async () => {
  render(<HostCreateSessionPage />)
  await waitFor(() => expect(screen.queryByText('Cargando tus cuestionarios…')).toBeNull())
  fireEvent.change(screen.getByLabelText('Actividad de la sala'), { target: { value: 'goal-kick' } })
  expect(screen.getByLabelText('Nombre de la sala')).toBeVisible()
  expect(screen.queryByLabelText('Tu cuestionario')).toBeNull()
  fireEvent.change(screen.getByLabelText('Nombre de la sala'), { target: { value: 'Recreo' } })
  fireEvent.click(screen.getByRole('button', { name: 'Crear sala de Tiro al Arco' }))
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/host/lobby/123456'))
})

it.each(['classic', 'speed', 'precision'])('mantiene el modo de puntuación %s al crear trivia', async mode => {
  const quizId = '11111111-1111-4111-8111-111111111111'
  mocks.list.mockResolvedValue([{ id: quizId, title: 'Trivia con cinco opciones' }])
  render(<HostCreateSessionPage />)
  await screen.findByLabelText('Tu cuestionario')
  fireEvent.change(screen.getByLabelText('Modo de puntuación'), { target: { value: mode } })
  fireEvent.click(screen.getByRole('button', { name: 'Crear sala' }))
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/host/lobby/123456'))
  expect(mocks.createTrivia).toHaveBeenCalledExactlyOnceWith(quizId, mode)
  expect(mocks.createRoom).not.toHaveBeenCalled()
})

it('no convierte preguntas existentes en salas de fútbol al editarlas', () => {
  render(<QuestionForm quizId="existing-quiz" question={{ id: 'q', quizId: 'existing-quiz', kind: 'TRUE_FALSE', questionText: 'Pregunta', timeLimitSeconds: 20, points: 1, imageUrl: null, options: [{ id: 'a', text: 'Verdadero', isCorrect: true }, { id: 'b', text: 'Falso', isCorrect: false }] }} onPersisted={vi.fn()} onClose={vi.fn()} onUnavailable={vi.fn()} />)
  expect(screen.queryByRole('option', { name: /Tiro al Arco/ })).toBeNull()
  expect(screen.getByLabelText('Enunciado')).toHaveValue('Pregunta')
})

it('valida el nombre y conserva los campos cuando falla la creación de la sala', async () => {
  mocks.createRoom.mockRejectedValue(new Error('No se pudo crear la sala'))
  render(<GoalKickRoomForm />)
  fireEvent.change(screen.getByLabelText('Nombre de la sala'), { target: { value: '   ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Crear sala de Tiro al Arco' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('El nombre es obligatorio.')
  expect(mocks.createRoom).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Nombre de la sala'), { target: { value: 'Copa' } })
  fireEvent.click(screen.getByRole('button', { name: 'Crear sala de Tiro al Arco' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo crear la sala')
  expect(screen.getByLabelText('Nombre de la sala')).toHaveValue('Copa')
  expect(mocks.navigate).not.toHaveBeenCalled()
})
