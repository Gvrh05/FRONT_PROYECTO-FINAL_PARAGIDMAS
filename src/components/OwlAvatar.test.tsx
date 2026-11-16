import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OwlAvatar } from './OwlAvatar'
import { AvatarSelector } from './AvatarSelector'

describe('búhos SVG ProfeLink', () => {
  it('dibuja diez variaciones distintas con lentes y bombillo sin recursos externos', () => {
    const { container, rerender } = render(<OwlAvatar variant={1} />)
    const drawings = new Set<string>()
    for (let variant = 1; variant <= 10; variant++) {
      rerender(<OwlAvatar variant={variant} label={`Búho ${variant}`} />)
      const svg = screen.getByRole('img', { name: `Búho ${variant}` })
      expect(svg).toHaveAttribute('viewBox', '0 0 320 320')
      expect(svg.querySelector('.owl-eyes')).not.toBeNull()
      expect(svg.querySelector('.owl-idea')).not.toBeNull()
      expect(svg.querySelector('image')).toBeNull()
      drawings.add(svg.innerHTML)
    }
    expect(drawings.size).toBe(10)
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })

  it('conserva los IDs 0–9 del selector usando variant 1–10', () => {
    const { container } = render(<AvatarSelector value={9} onChange={() => {}} />)
    expect(container.querySelectorAll('svg.profelink-owl')).toHaveLength(10)
    expect(screen.getByRole('button', { name: 'Búho brillante' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('img')).toHaveLength(10)
  })

  it('usa el búho base si recibe una variante inválida', () => {
    const { container, rerender } = render(<OwlAvatar variant={1} />)
    const base = container.innerHTML
    rerender(<OwlAvatar variant={99} />)
    expect(container.innerHTML).toBe(base)
  })
})
