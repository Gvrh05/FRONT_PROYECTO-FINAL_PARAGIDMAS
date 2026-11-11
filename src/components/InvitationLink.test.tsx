import { expect, it } from 'vitest'
import { invitationUrl } from './InvitationLink'

it('genera enlace público sin credenciales y rechaza orígenes inseguros o ambiguos', () => {
  expect(invitationUrl('room-id', 'https://aula.example')).toBe('https://aula.example/join/room-id')
  for (const origin of ['javascript:alert(1)', 'https://token@aula.example', 'https://aula.example/path', 'https://aula.example?token=secret']) expect(() => invitationUrl('room-id', origin)).toThrow()
})
