import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OwlAvatar } from './OwlAvatar'
import { AvatarSelector } from './AvatarSelector'

describe('búhos SVG ProfeLink', () => {
  it('dibuja diez temas distintos con lentes, degradados y animación sin recursos externos', () => {
    const { container, rerender } = render(<OwlAvatar variant={1} />)
    const drawings = new Set<string>()
    for (let variant = 1; variant <= 10; variant++) {
      rerender(<OwlAvatar variant={variant} label={`Búho ${variant}`} />)
      const svg = screen.getByRole('img', { name: `Búho ${variant}` })
      expect(svg).toHaveAttribute('viewBox', '0 0 320 320')
      expect(svg.querySelector('.owl-eyes')).not.toBeNull()
      expect(svg.querySelector('.owl-character')).not.toBeNull()
      expect(svg.querySelectorAll('linearGradient')).toHaveLength(3)
      expect(svg).toHaveAttribute('data-theme', String(variant))
      expect(svg.querySelector('image')).toBeNull()
      drawings.add(svg.innerHTML)
    }
    expect(drawings.size).toBe(10)
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })

  it('conserva los IDs 0–9 del selector usando variant 1–10', () => {
    const { container } = render(<AvatarSelector value={9} onChange={() => {}} />)
    expect(container.querySelectorAll('svg.profelink-owl')).toHaveLength(10)
    expect(screen.getByRole('button', { name: 'Búho músico' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('img')).toHaveLength(10)
  })

  it('cada tema tiene sus accesorios y todos conservan el fondo transparente', () => {
    const { container } = render(<AvatarSelector value={0} onChange={() => {}} />)
    for (const selector of ['.owl-idea', '.owl-katana', '.owl-doctor', '.owl-graduate', '.owl-gamepad', '.owl-chef', '.owl-cape', '.owl-detective', '.owl-wand', '.owl-guitar']) expect(container.querySelector(selector)).not.toBeNull()
    for (const wrapper of container.querySelectorAll<HTMLElement>('.owl-avatar')) expect(wrapper.style.backgroundColor).toBe('')
  })

  it('usa IDs de degradados únicos en selector, lobby y podio simultáneos', () => {
    const { container } = render(<><AvatarSelector value={0} onChange={() => {}} /><OwlAvatar variant={1} /><OwlAvatar variant={1} /></>)
    const ids = [...container.querySelectorAll('[id]')].map(node => node.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const svg of container.querySelectorAll('svg')) {
      const localIds = [...svg.querySelectorAll('[id]')].map(node => node.id)
      for (const node of svg.querySelectorAll('[fill], [stroke]')) {
        for (const attribute of ['fill', 'stroke']) {
          const reference = node.getAttribute(attribute)?.match(/^url\(#(.+)\)$/)
          if (reference) expect(localIds).toContain(reference[1])
        }
      }
    }
  })

  it('usa el búho base si recibe una variante inválida', () => {
    const { container, rerender } = render(<OwlAvatar variant={1} />)
    const base = container.innerHTML
    rerender(<OwlAvatar variant={99} />)
    expect(container.innerHTML).toBe(base)
  })
})
