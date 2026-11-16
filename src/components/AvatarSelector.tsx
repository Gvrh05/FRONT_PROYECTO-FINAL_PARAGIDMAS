import { OwlAvatar as LogoOwlAvatar } from './OwlAvatar'

export const owlAvatars = [
  { label: 'Búho académico', color: '#1e3a8a' },
  { label: 'Búho musical', color: '#4c1d95' },
  { label: 'Búho real', color: '#713f12' },
  { label: 'Búho espacial', color: '#164e63' },
  { label: 'Búho estrella', color: '#854d0e' },
  { label: 'Búho lector', color: '#14532d' },
  { label: 'Búho artista', color: '#831843' },
  { label: 'Búho veloz', color: '#312e81' },
  { label: 'Búho nocturno', color: '#334155' },
  { label: 'Búho brillante', color: '#115e59' },
]

export function OwlAvatar({ avatarId = 0 }: { avatarId?: number }) {
  const avatar = owlAvatars[avatarId] ?? owlAvatars[0]
  const variant = owlAvatars[avatarId] ? avatarId + 1 : 1
  return <span className="owl-avatar" style={{ backgroundColor: avatar.color }}><LogoOwlAvatar variant={variant} label={avatar.label} /></span>
}

export function AvatarSelector({ value, onChange, disabled = false }: { value: number; onChange: (id: number) => void; disabled?: boolean }) {
  return <fieldset className="avatar-selector" disabled={disabled}><legend>Elige tu búho</legend>
    <div className="avatar-options">{owlAvatars.map((avatar, id) => <button key={id} type="button" aria-label={avatar.label} aria-pressed={value === id} onClick={() => onChange(id)}><OwlAvatar avatarId={id} />{value === id && <span className="avatar-check" aria-hidden="true">✓</span>}</button>)}</div>
  </fieldset>
}

export function savedAvatar(): number {
  const value = Number(sessionStorage.getItem('kahoot:avatar') ?? 0)
  return Number.isInteger(value) && value >= 0 && value < owlAvatars.length ? value : 0
}
