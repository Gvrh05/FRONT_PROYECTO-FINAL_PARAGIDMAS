import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { RoundResultsChart } from './RoundResultsChart'

it('renderiza dos pilares proporcionales y marca solo la respuesta correcta', () => {
  const { container } = render(<RoundResultsChart counts={{ true: 4, false: 2 }} correctAnswer={false} />)
  expect(screen.getByRole('figure', { name: 'Resultados de la ronda' })).toBeVisible()
  expect(screen.getByText('4 votos')).toBeVisible()
  expect(screen.getByText('2 votos')).toBeVisible()
  const pillars = container.querySelectorAll<HTMLElement>('.round-bar-prism')
  expect(pillars[0].style.getPropertyValue('--bar-height')).toBe('160px')
  expect(pillars[1].style.getPropertyValue('--bar-height')).toBe('80px')
  expect(container.querySelectorAll('.correct-option')).toHaveLength(1)
  expect(within(container.querySelector('.correct-option') as HTMLElement).getByText('Falso')).toBeVisible()
})

it('tolera una ronda sin votos sin dibujar alturas inválidas', () => {
  const { container } = render(<RoundResultsChart counts={{ true: 0, false: 0 }} correctAnswer />)
  for (const pillar of container.querySelectorAll<HTMLElement>('.round-bar-prism')) expect(pillar.style.getPropertyValue('--bar-height')).toBe('0px')
  expect(screen.getAllByText('0 votos')).toHaveLength(2)
})
