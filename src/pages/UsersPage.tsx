import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AUTH_API_URL } from '../api/config'
import { createHttp, apiErrorMessage } from '../api/http'
import { useSession } from '../session/session'

interface User { id: string; username: string; role: 'MASTER' | 'PROFESOR'; active: boolean; isSystem: boolean; credentialVersion: number }

export function UsersPage() {
  const { session } = useSession()
  if (session?.user.role !== 'MASTER') return <Navigate to="/dashboard" replace />
  return <UsersManager key={session.generation} />
}

function UsersManager() {
  const { session, isCurrent, logout } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [reload, setReload] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [verified, setVerified] = useState(false)
  const [pending, setPending] = useState(false)
  const [selected, setSelected] = useState<User | null>(null)
  const [mode, setMode] = useState<'create' | 'edit' | 'password'>('create')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const generation = session!.generation
  const api = useMemo(() => createHttp({ baseURL: AUTH_API_URL, getToken: () => isCurrent(generation) ? session!.accessToken : null, onUnauthorized: () => { if (isCurrent(generation)) logout() } }), [generation, session, isCurrent, logout])
  useEffect(() => {
    const controller = new AbortController()
    void api.get<User>('/me', { signal: controller.signal }).then(({ data }) => {
      if (data.role !== 'MASTER' || !data.active) throw new Error('Esta sección requiere una cuenta MASTER activa.')
      if (!isCurrent(generation) || controller.signal.aborted) return Promise.reject(new Error('Sesión cambiada'))
      setVerified(true)
      return api.get<{ items: User[]; total: number }>('/users', { params: { page, limit: 20 }, signal: controller.signal })
    }).then(({ data }) => {
      if (isCurrent(generation) && !controller.signal.aborted) { setUsers(data.items); setTotal(data.total) }
    }).catch((failure: unknown) => { if (isCurrent(generation) && !controller.signal.aborted) setError(apiErrorMessage(failure)) })
    return () => controller.abort()
  }, [api, page, reload, generation, isCurrent])
  async function mutate(action: () => Promise<unknown>) {
    if (!verified || pending || !isCurrent(generation)) return
    setPending(true); setError(''); setNotice('')
    try {
      await action()
      if (!isCurrent(generation)) return
      setReload((value) => value + 1); setPassword(''); setUsername(''); setSelected(null); setMode('create'); setNotice('Cambios guardados.')
    } catch (failure) { if (isCurrent(generation)) setError(apiErrorMessage(failure)) }
    finally { if (isCurrent(generation)) setPending(false) }
  }
  if (!verified) return <section className="card"><h1>Usuarios</h1>{error ? <p role="alert">{error}</p> : <p role="status">Verificando permisos…</p>}</section>
  return <section className="card"><h1>Usuarios</h1><p>Las cuentas nuevas son PROFESOR.</p>
    {error && <p role="alert">{error}</p>}<p role="status">{notice}</p>
    <form onSubmit={(event) => {
      event.preventDefault()
      if (mode !== 'create' && !window.confirm('¿Confirmar el cambio de esta cuenta?')) return
      void mutate(() => mode === 'create' ? api.post('/users', { username: username.trim(), password }) : mode === 'edit' ? api.patch(`/users/${selected!.id}`, { username: username.trim() }) : api.post(`/users/${selected!.id}/reset-password`, { password }))
    }}><h2>{mode === 'create' ? 'Crear profesor' : mode === 'edit' ? 'Editar usuario' : `Restablecer contraseña: ${selected?.username}`}</h2>
      {mode !== 'password' && <label>Nombre de usuario<input required value={username} onChange={(event) => setUsername(event.target.value)} disabled={pending} autoComplete="off" /></label>}
      {mode !== 'edit' && <label>Contraseña<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} autoComplete="new-password" /></label>}
      <button disabled={pending || (mode !== 'password' && !username.trim())}>Guardar</button>
      {selected && <button type="button" disabled={pending} onClick={() => { setMode('create'); setSelected(null); setUsername(''); setPassword('') }}>Cancelar</button>}
    </form>
    <ul>{users.map((user) => <li key={user.id}><strong>{user.username}</strong> · {user.role} · {user.active ? 'Activo' : 'Inactivo'} {user.isSystem && <span>Cuenta de sistema protegida</span>}
      <div className="actions"><button disabled={pending} onClick={() => { setSelected(user); setMode('edit'); setUsername(user.username); setPassword('') }}>Editar</button>
        <button disabled={pending} onClick={() => { setSelected(user); setMode('password'); setPassword('') }}>Restablecer contraseña</button>
        <button disabled={pending || user.isSystem || user.role === 'MASTER'} onClick={() => {
          if (user.isSystem || user.role === 'MASTER' || !window.confirm(`¿${user.active ? 'Desactivar' : 'Activar'} a ${user.username}?`)) return
          void mutate(() => api.patch(`/users/${user.id}`, { active: !user.active }))
        }}>{user.active ? 'Desactivar' : 'Activar'}</button></div>
    </li>)}</ul>
    <button disabled={page === 1 || pending} onClick={() => setPage(page - 1)}>Anterior</button><span> Página {page} · {total} usuarios </span><button disabled={page * 20 >= total || pending} onClick={() => setPage(page + 1)}>Siguiente</button>
  </section>
}
