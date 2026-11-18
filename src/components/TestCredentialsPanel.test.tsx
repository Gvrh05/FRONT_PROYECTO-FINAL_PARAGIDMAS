import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { TestCredentialsPanel } from './TestCredentialsPanel'
afterEach(() => vi.unstubAllGlobals())
it('copia los tres textos sin enviar el formulario ni cambiar la sesión', async () => {
  const copy = vi.fn().mockResolvedValue(undefined), submit = vi.fn()
  vi.stubGlobal('navigator', { clipboard: { writeText: copy } })
  render(<form onSubmit={submit}><TestCredentialsPanel /></form>)
  fireEvent.click(screen.getByRole('button', { name: 'Copiar usuario' }))
  expect(copy).toHaveBeenCalledWith('profesor_test')
  await screen.findByText('Usuario copiado')
  fireEvent.click(screen.getByRole('button', { name: 'Copiar contraseña' }))
  expect(copy).toHaveBeenCalledWith('Profesor123!')
  await screen.findByText('Contraseña copiada')
  fireEvent.click(screen.getByRole('button', { name: 'Copiar acceso del alumno' }))
  expect(copy).toHaveBeenCalledWith('Invitado por QR')
  await screen.findByText('Acceso del alumno copiado')
  expect(submit).not.toHaveBeenCalled()
})
it('ofrece copia manual cuando el navegador deniega Clipboard', async () => {
  vi.stubGlobal('navigator', {})
  render(<TestCredentialsPanel />)
  fireEvent.click(screen.getByRole('button', { name: 'Copiar usuario' }))
  expect(await screen.findByText(/Selecciona el texto/)).toBeVisible()
})
