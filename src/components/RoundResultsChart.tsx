import type { CSSProperties } from 'react'

export function RoundResultsChart({ counts, correctAnswer }: { counts: { true: number; false: number }; correctAnswer?: boolean }) {
  const options = [{ label: 'Verdadero', answer: true, count: counts.true, icon: '✓' }, { label: 'Falso', answer: false, count: counts.false, icon: '✕' }]
  const maximum = Math.max(1, counts.true, counts.false)
  return <figure className="round-results-chart" aria-labelledby="round-chart-title">
    <figcaption id="round-chart-title">Resultados de la ronda</figcaption>
    <div className="round-chart-columns">{options.map((option) => <div className={`round-chart-column ${option.answer ? 'column-true' : 'column-false'}`} key={option.label}>
      <div className="round-bar-space" aria-hidden="true"><div className="round-bar-prism" style={{ '--bar-height': `${option.count / maximum * 160}px` } as CSSProperties}><span>{option.count}</span></div></div>
      <div className={`round-vote-base ${correctAnswer === option.answer ? 'correct-option' : ''}`}><span className="vote-option-icon" aria-hidden="true">{option.icon}</span><strong>{option.label}</strong><span>{option.count} {option.count === 1 ? 'voto' : 'votos'}</span>{correctAnswer === option.answer && <span className="correct-option-label">✔ Correcta</span>}</div>
    </div>)}</div>
  </figure>
}
