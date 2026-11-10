import { lazy, Suspense } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { useAuth } from './auth/useAuth'
import { HostCreateSessionPage } from './pages/HostCreateSessionPage'
import { HostLobbyPage } from './pages/HostLobbyPage'
import { JoinSessionPage } from './pages/JoinSessionPage'
import { PlayerLobbyPage } from './pages/PlayerLobbyPage'

// Production builds remove the dev route, dynamic import and public demo signing key.
const DevLoginButtons = import.meta.env.DEV ? lazy(() => import('./auth/DevLoginButtons')) : null

function LoginPage() {
  return <section className="card">
    <p className="eyebrow">Acceso</p>
    <h1>Integración con Auth Service pendiente</h1>
    {DevLoginButtons
      ? <Suspense fallback={<p>Cargando acceso de demo…</p>}><DevLoginButtons /></Suspense>
      : <p>Solicita un token al Auth Service. El acceso de demo solo está disponible con pnpm dev.</p>}
  </section>
}

function Layout() {
  const { token, user, logout } = useAuth()
  return <>
    <header className="site-header"><Link className="brand" to="/">Quiz en vivo <span>Punto 3</span></Link>
      <nav aria-label="Principal">
        {token ? <><Link to="/host/create">Crear sala</Link><Link to="/join">Unirse</Link><button className="secondary" onClick={logout}>Salir</button></> : <Link to="/login">Acceder</Link>}
      </nav>
    </header>
    <main className="container">{user && <p className="identity">{user.name || user.sub}</p>}<Outlet /></main>
    <footer>Verdadero / Falso · EIF400 · Sala de juego</footer>
  </>
}

function HostLobbyRoute() {
  const { roomCode = '' } = useParams()
  const { user } = useAuth()
  return <HostLobbyPage key={`${roomCode}:${user?.sub}`} roomCode={roomCode} />
}

function PlayerLobbyRoute() {
  const { roomCode = '' } = useParams()
  const { user } = useAuth()
  return <PlayerLobbyPage key={`${roomCode}:${user?.sub}`} roomCode={roomCode} />
}

export default function App() {
  return <Routes><Route element={<Layout />}>
    <Route index element={<Navigate to="/host/create" replace />} />
    <Route path="login" element={<LoginPage />} />
    {import.meta.env.DEV && <Route path="dev-login" element={<LoginPage />} />}
    <Route element={<ProtectedRoute />}>
      <Route path="host/create" element={<HostCreateSessionPage />} />
      <Route path="host/lobby/:roomCode" element={<HostLobbyRoute />} />
      <Route path="join" element={<JoinSessionPage />} />
      <Route path="play/lobby/:roomCode" element={<PlayerLobbyRoute />} />
    </Route>
    <Route path="*" element={<section className="card"><h1>Página no encontrada</h1><Link to="/">Volver al inicio</Link></section>} />
  </Route></Routes>
}
