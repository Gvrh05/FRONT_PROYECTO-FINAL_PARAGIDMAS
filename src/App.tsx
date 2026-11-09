import { useState } from 'react'
import './App.css'
import { LoginForm } from './components/LoginForm'
import { QuizDetail } from './components/QuizDetail'
import { QuizForm } from './components/QuizForm'
import { QuizList } from './components/QuizList'
import { SessionProvider, useSession } from './session/session'
import type { QuizSummary } from './types'

type View =
  | { name: 'list' }
  | { name: 'detail'; quizId: string }
  | { name: 'create' }
  | { name: 'edit'; quiz: QuizSummary }

function Workspace() {
  const { session, logout } = useSession()
  const [view, setView] = useState<View>({ name: 'list' })

  if (!session) return null

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Profelink</p>
          <h1>Kahoot</h1>
        </div>
        <div className="session-info">
          <span>
            Sesión de <strong>{session.user.username}</strong>
          </span>
          <button type="button" onClick={() => logout()}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="workspace">
        {view.name === 'list' ? (
          <QuizList
            onCreate={() => setView({ name: 'create' })}
            onOpen={(quizId) => setView({ name: 'detail', quizId })}
            onEdit={(quiz) => setView({ name: 'edit', quiz })}
          />
        ) : null}

        {view.name === 'create' ? (
          <QuizForm
            onCancel={() => setView({ name: 'list' })}
            onSaved={(quiz) => setView({ name: 'detail', quizId: quiz.id })}
          />
        ) : null}

        {view.name === 'edit' ? (
          <QuizForm
            quiz={view.quiz}
            onCancel={() => setView({ name: 'detail', quizId: view.quiz.id })}
            onSaved={(quiz) => setView({ name: 'detail', quizId: quiz.id })}
          />
        ) : null}

        {view.name === 'detail' ? (
          <QuizDetail
            quizId={view.quizId}
            onBack={() => setView({ name: 'list' })}
            onEdit={(quiz) => setView({ name: 'edit', quiz })}
          />
        ) : null}
      </main>
    </div>
  )
}

function AuthoringApp() {
  const { session } = useSession()
  if (!session) return <LoginForm />
  return <Workspace key={session.generation} />
}

function App() {
  return (
    <SessionProvider>
      <AuthoringApp />
    </SessionProvider>
  )
}

export default App
