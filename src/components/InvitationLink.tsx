import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export function invitationUrl(id: string, configured = import.meta.env.VITE_PUBLIC_WEB_URL): string {
  const base = new URL(configured || window.location.origin)
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new Error('VITE_PUBLIC_WEB_URL debe ser un origen HTTP(S), sin credenciales ni ruta.')
  return new URL(`/join/${encodeURIComponent(id)}`, base).href
}

export function InvitationLink({ invitationId }: { invitationId: string }) {
  const [notice, setNotice] = useState('')
  let url: string
  try { url = invitationUrl(invitationId) } catch (error) { return <p role="alert">{(error as Error).message}</p> }
  return <section aria-label="Invitación pública"><h2>Invita a tu clase</h2>
    <QRCodeSVG value={url} size={220} title="QR para entrar a la partida" />
    <p><a href={url}>{url}</a></p>
    <button onClick={() => {
      if (!navigator.clipboard?.writeText) { setNotice('Selecciona y copia el enlace. La copia automática requiere HTTPS o localhost.'); return }
      void navigator.clipboard.writeText(url).then(() => setNotice('Enlace copiado'), () => setNotice('No se pudo copiar. Selecciona el enlace.'))
    }}>Copiar enlace</button>
    <p role="status">{notice}</p>
  </section>
}
