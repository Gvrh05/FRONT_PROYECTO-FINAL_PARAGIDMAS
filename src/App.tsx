import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { GuestJoinPage } from './pages/GuestJoinPage'
import { RegisterPage } from './pages/RegisterPage'
import { UsersPage } from './pages/UsersPage'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { useAuth } from './auth/useAuth'
import { HostCreateSessionPage } from './pages/HostCreateSessionPage'
import { HostLobbyPage } from './pages/HostLobbyPage'
import { JoinSessionPage } from './pages/JoinSessionPage'
import { PlayerLobbyPage } from './pages/PlayerLobbyPage'
import { DashboardPage } from './pages/DashboardPage'
import { QuizList } from './components/QuizList'
import { QuizForm } from './components/QuizForm'
import { QuizDetail } from './components/QuizDetail'
import { CreateGamePanel } from './components/CreateGamePanel'
import { ResultsPanel } from './components/ResultsPanel'
import { LoginForm } from './components/LoginForm'
import { SessionProvider, useSession } from './session/session'
import { getQuiz } from './api/quizzes'
import { apiErrorMessage } from './api/http'
import type { QuizSummary } from './types'

// Production builds remove the dev route, dynamic import and public demo signing key.
const DevLoginButtons = import.meta.env.DEV ? lazy(() => import('./auth/DevLoginButtons')) : null

function DevLoginPage() {
  return <section className="card">
    <p className="eyebrow">Acceso</p>
    <h1>Integración con Auth Service pendiente</h1>
    {DevLoginButtons
      ? <Suspense fallback={<p>Cargando acceso de demo…</p>}><DevLoginButtons /></Suspense>
      : <p>Solicita un token al Auth Service. El acceso de demo solo está disponible con pnpm dev.</p>}
  </section>
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  return <div className="auth-page">
    {location.state?.registered && <p role="status">Perfil creado. Inicia sesión para jugar.</p>}
    <LoginForm onSuccess={() => navigate('/dashboard', { replace: true })} />
    <Link to="/register">Crear perfil</Link>
  </div>
}

function Layout() {
  const { token, user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  return <>
    <header className="site-header"><Link className="brand" to="/">Quiz en vivo <span>Punto 3</span></Link>
      <nav aria-label="Principal">
        {token ? <><Link to="/dashboard">Dashboard</Link><Link to="/quizzes">Quizzes</Link><Link to="/host/create">Crear sala</Link><Link to="/join">Unirse</Link><button className="secondary" onClick={() => {
          if (location.pathname.startsWith('/host/lobby/') && !window.confirm('Cerrar sesión interrumpe temporalmente tu control de la sala, sin terminarla. Puedes volver a entrar. ¿Continuar?')) return
          logout()
          window.dispatchEvent(new StorageEvent('storage', { key: 'token', storageArea: sessionStorage }))
          navigate('/login', { replace: true })
        }}>Cerrar sesión</button>{user?.role === 'MASTER' && <Link to="/users">Usuarios</Link>}</> : <Link to="/login">Acceder</Link>}
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

function QuizListPage() {
  const navigate = useNavigate()
  return <QuizList
    onCreate={() => navigate('/quizzes/new')}
    onOpen={(quizId) => navigate(`/quizzes/${quizId}`)}
    onEdit={(quiz) => navigate(`/quizzes/${quiz.id}/edit`)}
  />
}

function QuizFormPage() {
  const { quizId } = useParams()
  return <QuizFormRoute key={quizId ?? 'new'} quizId={quizId} />
}

function QuizFormRoute({ quizId }: { quizId?: string }) {
  const navigate = useNavigate()
  const { api, session, isCurrent } = useSession()
  const [loaded, setLoaded] = useState<{ quiz?: QuizSummary; error?: string; generation: number } | null>(null)
  useEffect(() => {
    if (!quizId || !api || !session) return
    const generation = session.generation
    const controller = new AbortController()
    void getQuiz(api, quizId, controller.signal).then((quiz) => {
      if (!controller.signal.aborted && isCurrent(generation)) setLoaded({ quiz, generation })
    }, (error: unknown) => {
      if (!controller.signal.aborted && isCurrent(generation)) setLoaded({ error: apiErrorMessage(error), generation })
    })
    return () => controller.abort()
  }, [quizId, api, session, isCurrent])
  if (quizId && (!loaded || loaded.generation !== session?.generation)) return <p role="status">Cargando cuestionario…</p>
  if (quizId && loaded?.error) return <section className="card"><p role="alert">{loaded.error}</p><Link to="/quizzes">Volver al listado</Link></section>
  return <QuizForm key={`${quizId ?? 'new'}:${session?.generation}`} quiz={quizId ? loaded?.quiz : undefined}
    onCancel={() => navigate('/quizzes')}
    onSaved={(quiz) => navigate(`/quizzes/${quiz.id}`)}
  />
}

function QuizDetailPage() {
  const { quizId = '' } = useParams()
  const navigate = useNavigate()
  return <QuizDetail key={quizId} quizId={quizId}
    onBack={() => navigate('/quizzes')}
    onEdit={(quiz) => navigate(`/quizzes/${quiz.id}/edit`)}
  />
}

function CreateGamePanelPage() {
  return <CreateGamePanel />
}

function ResultsPanelPage() {
  return <ResultsPanel />
}

export default function App() {
  return <SessionProvider><Routes><Route path="join/:invitationId" element={<GuestJoinPage />} /><Route element={<Layout />}>
    <Route index element={<Navigate to="/dashboard" replace />} />
    <Route path="login" element={<LoginPage />} />
    <Route path="register" element={<RegisterPage />} />
    {import.meta.env.DEV && <Route path="dev-login" element={<DevLoginPage />} />}
    <Route element={<ProtectedRoute />}>
      <Route path="users" element={<UsersPage />} />
      <Route path="host/create" element={<HostCreateSessionPage />} />
      <Route path="host/lobby/:roomCode" element={<HostLobbyRoute />} />
      <Route path="join" element={<JoinSessionPage />} />
      <Route path="play/lobby/:roomCode" element={<PlayerLobbyRoute />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="quizzes" element={<QuizListPage />} />
      <Route path="quizzes/new" element={<QuizFormPage />} />
      <Route path="quizzes/:quizId" element={<QuizDetailPage />} />
      <Route path="quizzes/:quizId/edit" element={<QuizFormPage />} />
      <Route path="create-game" element={<CreateGamePanelPage />} />
      <Route path="results" element={<ResultsPanelPage />} />
    </Route>
    <Route path="*" element={<section className="card"><h1>Página no encontrada</h1><Link to="/">Volver al inicio</Link></section>} />
  </Route></Routes></SessionProvider>
}
