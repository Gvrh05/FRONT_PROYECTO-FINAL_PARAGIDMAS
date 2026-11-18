import { OwlAvatar as LogoOwlAvatar } from './OwlAvatar'

export const owlAvatars = [
  { label: 'Búho clásico', name: 'Clásico' },
  { label: 'Búho ninja', name: 'Ninja' },
  { label: 'Búho doctor', name: 'Doctor' },
  { label: 'Búho graduado', name: 'Graduado' },
  { label: 'Búho gamer', name: 'Gamer' },
  { label: 'Búho chef', name: 'Chef' },
  { label: 'Búho superhéroe', name: 'Superhéroe' },
  { label: 'Búho detective', name: 'Detective' },
  { label: 'Búho mago', name: 'Mago' },
  { label: 'Búho músico', name: 'Músico' },
  { label: 'Búho astronauta', name: 'Astronauta' },
  { label: 'Búho pirata', name: 'Pirata' },
  { label: 'Búho zombie', name: 'Zombie' },
  { label: 'Búho vaquero', name: 'Vaquero' },
  { label: 'Búho científico loco', name: 'Científico' },
]

export function OwlAvatar({ avatarId = 0 }: { avatarId?: number }) {
  const avatar = owlAvatars[avatarId] ?? owlAvatars[0]
  const variant = owlAvatars[avatarId] ? avatarId + 1 : 1
  return <span className="owl-avatar"><LogoOwlAvatar variant={variant} label={avatar.label} /></span>
}

export function AvatarSelector({ value, onChange, disabled = false }: { value: number; onChange: (id: number) => void; disabled?: boolean }) {
  return <fieldset className="avatar-selector" disabled={disabled}><legend>Elige tu búho</legend>
    <div className="avatar-options">{owlAvatars.map((avatar, id) => <button key={id} type="button" aria-label={avatar.label} aria-pressed={value === id} onClick={() => onChange(id)}><OwlAvatar avatarId={id} /><span className="avatar-theme-name">{avatar.name}</span>{value === id && <span className="avatar-check" aria-hidden="true">✓</span>}</button>)}</div>
  </fieldset>
}

export function savedAvatar(): number {
  const value = Number(sessionStorage.getItem('kahoot:avatar') ?? 0)
  return Number.isInteger(value) && value >= 0 && value < owlAvatars.length ? value : 0
}
