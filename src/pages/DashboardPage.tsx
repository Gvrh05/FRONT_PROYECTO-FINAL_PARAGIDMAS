import { useState } from 'react'
import '../App.css'
import { LoginForm } from '../components/LoginForm'
import { QuizDetail } from '../components/QuizDetail'
import { QuizForm } from '../components/QuizForm'
import { QuizList } from '../components/QuizList'
import { CreateGamePanel } from '../components/CreateGamePanel'
import { ResultsPanel } from '../components/ResultsPanel'
import { SessionProvider, useSession } from '../session/session'
import type { QuizSummary } from '../types'

type View =
  | { name: 'list' }
  | { name: 'detail'; quizId: string }
  | { name: 'create' }
  | { name: 'edit'; quiz: QuizSummary }

type Section = 'quizzes' | 'create-game' | 'results'

function Workspace() {
  const { session, logout } = useSession()
  const [view, setView] = useState<View>({ name: 'list' })
  const [section, setSection] = useState<Section>('quizzes')
  if (!session) return null

  function navigate(next: Section) {
    setSection(next)
    if (next === 'quizzes') setView({ name: 'list' })
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <a className="brand" href="#inicio" onClick={(event) => { event.preventDefault(); navigate('quizzes') }}>
          <span className="brand-mark">P</span><span>Profelink<span className="brand-light">Kahoot</span></span>
        </a>
        <p className="sidebar-label">Espacio de trabajo</p>
        <nav className="sidebar-nav">
          <button className={section === 'quizzes' ? 'active' : ''} onClick={() => navigate('quizzes')}><span>▦</span> Quices</button>
          <button className={section === 'create-game' ? 'active' : ''} onClick={() => navigate('create-game')}><span>▶</span> Crear partida</button>
          <button className={section === 'results' ? 'active' : ''} onClick={() => navigate('results')}><span>▤</span> Resultados</button>
        </nav>
        <div className="sidebar-account">
          <div className="avatar">{session.user.username.slice(0, 1).toUpperCase()}</div>
          <div className="account-copy"><strong>{session.user.username}</strong><small>Docente</small></div>
          <button className="logout-button" aria-label="Cerrar sesión" onClick={() => logout()}>↗</button>
        </div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-topbar"><span>Panel de control</span><span className="online-indicator">Sesión activa</span></header>
        <div className="dashboard-content">
          {section === 'quizzes' ? (
            <>
              {view.name === 'list' ? <QuizList onCreate={() => setView({ name: 'create' })} onOpen={(quizId) => setView({ name: 'detail', quizId })} onEdit={(quiz) => setView({ name: 'edit', quiz })} /> : null}
              {view.name === 'create' ? <QuizForm onCancel={() => setView({ name: 'list' })} onSaved={(quiz) => setView({ name: 'detail', quizId: quiz.id })} /> : null}
              {view.name === 'edit' ? <QuizForm quiz={view.quiz} onCancel={() => setView({ name: 'detail', quizId: view.quiz.id })} onSaved={(quiz) => setView({ name: 'detail', quizId: quiz.id })} /> : null}
              {view.name === 'detail' ? <QuizDetail quizId={view.quizId} onBack={() => setView({ name: 'list' })} onEdit={(quiz) => setView({ name: 'edit', quiz })} /> : null}
            </>
          ) : null}
          {section === 'create-game' ? <CreateGamePanel /> : null}
          {section === 'results' ? <ResultsPanel /> : null}
        </div>
      </main>
    </div>
  )
}

function AuthoringApp() {
  const { session } = useSession()
  const [showLogin, setShowLogin] = useState(false)
  if (session) return <Workspace key={session.generation} />
  if (showLogin) return <div className="auth-page"><button className="back-link" onClick={() => setShowLogin(false)}>← Volver</button><LoginForm /></div>
  return (
    <main className="landing">
      <nav className="landing-nav"><a className="brand landing-brand" href="#home"><span className="brand-mark">P</span><span>Profelink<span className="brand-light">Kahoot</span></span></a><button className="button-quiet" onClick={() => setShowLogin(true)}>Iniciar sesión</button></nav>
      <section className="landing-hero">
        <div className="hero-copy"><span className="hero-kicker"><i /> APRENDER JUGANDO</span><h1>Convierte cada clase en una experiencia <em>inolvidable.</em></h1><p>Crea quices, invita a tu clase y descubre cuánto saben. Todo en un espacio sencillo y hecho para enseñar.</p><button className="hero-cta" onClick={() => setShowLogin(true)}>Entrar a mi espacio <span>→</span></button><small>Tu aula, tus reglas, más participación.</small></div>
        <div className="hero-art" aria-hidden="true"><div className="art-card art-card-back"><span>¿Cuál es la respuesta?</span><div className="art-answer purple">A</div><div className="art-answer coral">B</div><div className="art-answer yellow">C</div><div className="art-answer mint">D</div></div><div className="art-card art-card-front"><span className="art-live"><i /> EN VIVO</span><strong>¡La clase está lista!</strong><div className="art-people"><span>✦</span><span>●</span><span>◆</span><span>+18</span></div><small>23 estudiantes conectados</small></div><span className="art-spark spark-one">✳</span><span className="art-spark spark-two">✦</span></div>
      </section>
      <section className="landing-benefits"><div><span>01</span><strong>Diseña tus quices</strong><small>Preguntas claras, en segundos.</small></div><div><span>02</span><strong>Juega en equipo</strong><small>Una sala, toda la clase.</small></div><div><span>03</span><strong>Ve el progreso</strong><small>Resultados para seguir creciendo.</small></div></section>
      <footer className="landing-footer">PROFELINK KAHOOT <span>ENSEÑAR TAMBIÉN PUEDE SER UN JUEGO.</span></footer>
    </main>
  )
}

export function DashboardPage() {
  return <SessionProvider><AuthoringApp /></SessionProvider>
}
