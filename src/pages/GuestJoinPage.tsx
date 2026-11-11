import axios from 'axios'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { API_URL } from '../api/config'
import { apiErrorMessage } from '../api/http'
import { useSessionLobby } from '../realtime/useSessionLobby'
import { disconnectGameSocket } from '../realtime/socket'
import { ErrorBanner } from '../components/ErrorBanner'
import { FinalScores, LiveRoundPanel } from '../components/LiveRoundPanel'
import { ParticipantList } from '../components/ParticipantList'

const credentialSchema = z.object({ participantId: z.string(), username: z.string(), roomCode: z.string().regex(/^\d{6}$/), guestToken: z.string().min(1), invitationId: z.string() })
type Credential = z.infer<typeof credentialSchema>
const publicApi = axios.create({ baseURL: `${API_URL.replace(/\/$/, '')}/public/invitations`, timeout: 15000 })

export function GuestJoinPage() {
  const { invitationId = '' } = useParams()
  return <GuestInvitation key={invitationId} invitationId={invitationId} />
}

function GuestInvitation({ invitationId }: { invitationId: string }) {
  const key = `kahoot:guest:${invitationId}`
  const [credential, setCredential] = useState<Credential | null>(() => {
    try { const parsed = credentialSchema.parse(JSON.parse(sessionStorage.getItem(key) ?? 'null')); return parsed.invitationId === invitationId ? parsed : null } catch { return null }
  })
  const [invitation, setInvitation] = useState<{ name: string; status: string }>()
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    void publicApi.get(`/${encodeURIComponent(invitationId)}`, { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setInvitation(z.object({ name: z.string(), status: z.string() }).parse(data))
    }).catch((failure: unknown) => { if (!controller.signal.aborted) setError(apiErrorMessage(failure)) })
    return () => controller.abort()
  }, [invitationId])
  if (credential) return <GuestGame credential={credential} onLeave={() => { disconnectGameSocket(); sessionStorage.removeItem(key); setCredential(null) }} />
  return <main className="container"><section className="card"><h1>{invitation?.name || 'Entrar a la partida'}</h1>
    {error && <p role="alert">{error}</p>}
    {invitation && invitation.status !== 'LOBBY' ? <p>Esta sala ya inició o finalizó. No admite nuevos participantes.</p> : <form onSubmit={(event) => {
      event.preventDefault()
      if (busy || !invitation || !username.trim()) return
      setBusy(true); setError('')
      void publicApi.post(`/${encodeURIComponent(invitationId)}/participants`, { username: username.trim() }).then(({ data }) => {
        const next = credentialSchema.parse(data)
        if (next.invitationId !== invitationId) throw new Error('Invitación incorrecta')
        sessionStorage.setItem(key, JSON.stringify(next)); setCredential(next)
      }).catch((failure: unknown) => {
        const status = axios.isAxiosError(failure) ? failure.response?.status : undefined
        setError(status === 409 ? 'Ese nombre ya está en uso o la sala ya inició.' : status === 429 ? 'Demasiados intentos. Espera antes de volver a entrar.' : apiErrorMessage(failure))
      }).finally(() => setBusy(false))
    }}><label htmlFor="guest-name">Tu nombre</label><input id="guest-name" value={username} onChange={(event) => setUsername(event.target.value)} required maxLength={80} autoComplete="nickname" /><button disabled={busy || !invitation || !username.trim()}>Entrar</button></form>}
  </section></main>
}

function GuestGame({ credential, onLeave }: { credential: Credential; onLeave: () => void }) {
  const { session, connected, error, round, finished, pending, send } = useSessionLobby(credential.roomCode, credential.guestToken)
  return <main className="container"><section className="card"><h1>Sala {credential.roomCode}</h1><p>{credential.username}</p>
    <p role="status">{connected ? 'Conectado' : 'Reconectando…'}</p><ErrorBanner error={error} />
    {finished ? <FinalScores scores={finished.scores} /> : round ? <LiveRoundPanel round={round} connected={connected} pending={pending} onAnswer={(answer) => send('submit-answer', round.questionId, answer)} /> : <p>Espera al anfitrión.</p>}
    {session && <ParticipantList participants={session.participants} hostId={session.hostId} />}
    <button onClick={onLeave}>Salir de la partida</button>
  </section></main>
}
