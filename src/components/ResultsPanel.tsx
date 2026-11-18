import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiErrorMessage } from '../api/http'
import { useSession } from '../session/session'
import { z } from 'zod'
import { FinalScores } from './LiveRoundPanel'

const resultSchema = z.object({ scores: z.array(z.object({
  playerName: z.string(), score: z.number(), rank: z.number(), avatarId: z.number().int().min(0).max(14).optional().catch(undefined),
})) })

export function ResultsPanel() {
  const { api, logout } = useSession()
  const [pin, setPin] = useState('')
  const [result, setResult] = useState<z.infer<typeof resultSchema> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!api || pending || !pin.trim()) return
    setPending(true)
    setError(null)
    setResult(null)
    try {
      const response = await api.get(`/results/${encodeURIComponent(pin.trim())}`)
      setResult(resultSchema.parse(response.data))
    } catch (reason) {
      if ((reason as { response?: { status?: number } }).response?.status === 401) logout()
      else setError(apiErrorMessage(reason))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="feature-panel" aria-labelledby="results-title">
      <p className="eyebrow">Historial</p>
      <h2 id="results-title">Resultados</h2>
      <p className="muted">Consulta los resultados de una partida con su PIN.</p>
      <form className="result-search" onSubmit={search}>
        <label htmlFor="result-pin">PIN de sala</label>
        <input id="result-pin" inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value)} maxLength={12} required />
        <button type="submit" disabled={pending}>{pending ? 'Buscando…' : 'Consultar resultados'}</button>
      </form>
      {error ? <p role="alert" className="alert">{error}</p> : null}
      {result !== null ? <FinalScores scores={result.scores} /> : null}
    </section>
  )
}
