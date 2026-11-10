import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QuestionImageInput } from './QuestionImageInput'

describe('selector y vista previa de imagen', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('rechaza formatos/tamaños inválidos, permite descartar y revoca la vista previa', async () => {
    const createObjectURL = vi.fn(() => 'blob:preview')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
    const onSelect = vi.fn()
    const user = userEvent.setup()
    const view = render(<QuestionImageInput file={null} onSelect={onSelect} />)
    const input = screen.getByLabelText('Imagen (opcional)')

    fireEvent.change(input, {
      target: { files: [new File(['not image'], 'bad.svg', { type: 'image/svg+xml' })] },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(/debe ser una imagen/i)
    expect(onSelect).toHaveBeenLastCalledWith(null)

    const valid = new File(['png data'], 'photo.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [valid] } })
    expect(onSelect).toHaveBeenLastCalledWith(valid)
    view.rerender(<QuestionImageInput file={valid} onSelect={onSelect} />)
    expect(await screen.findByAltText('Vista previa de la imagen seleccionada')).toHaveAttribute('src', 'blob:preview')
    await user.click(screen.getByRole('button', { name: 'Descartar imagen' }))
    expect(onSelect).toHaveBeenLastCalledWith(null)
    view.unmount()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })
})
