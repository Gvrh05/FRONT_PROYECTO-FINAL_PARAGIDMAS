import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { RegisterPage } from './RegisterPage'

it('permite mostrar y ocultar la contraseña al crear un perfil', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter><RegisterPage /></MemoryRouter>)

  const password = screen.getByLabelText('Contraseña')
  expect(password).toHaveAttribute('type', 'password')
  await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
  expect(password).toHaveAttribute('type', 'text')
  await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
  expect(password).toHaveAttribute('type', 'password')
})
