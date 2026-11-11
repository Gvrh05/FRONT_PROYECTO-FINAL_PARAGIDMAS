import { useState } from 'react'

export function RoomCodeBadge({ roomCode }: { roomCode: string }) {
  const [notice, setNotice] = useState('')
  async function copy() {
    try { await navigator.clipboard.writeText(roomCode); setNotice('Código copiado') }
    catch { setNotice('Selecciona el código y cópialo manualmente.') }
  }
  return <section className="room-badge" aria-label="Código de sala">
    <p>Comparte este código</p>
    <strong className="room-code" data-testid="room-code">{roomCode}</strong>
    <button type="button" className="secondary" onClick={() => void copy()}>Copiar código</button>
    <span className="copy-notice" role="status">{notice}</span>
  </section>
}
