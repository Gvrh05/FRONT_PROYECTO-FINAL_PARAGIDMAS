import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('entorno de pruebas', () => {
  it('renderiza componentes React en un DOM simulado', () => {
    render(<main><h1>Profelink Kahoot</h1></main>)
    expect(screen.getByRole('heading', { name: 'Profelink Kahoot' })).toBeInTheDocument()
  })
})
