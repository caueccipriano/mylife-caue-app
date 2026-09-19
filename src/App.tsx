import { useState } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import RegisterSheet from './RegisterSheet'
import TodayPage from './TodayPage'
import LifePage, { CareerPlanPage } from './LifePage'
import DiscoveriesPage from './DiscoveriesPage'
import MemoriesPage from './MemoriesPage'
import ChatCapturePage from './ChatCapturePage'
import RecordDetailPage from './RecordDetailPage'
import ChatInboxPage from './ChatInboxPage'
import ReviewPage from './ReviewPage'

const nav = [
  { path: '/', label: 'Hoje', icon: '☀' },
  { path: '/vida', label: 'Vida', icon: '◇' },
  { path: '/descobertas', label: 'Descobertas', icon: '✦' },
  { path: '/memorias', label: 'Memórias', icon: '⌕' },
] as const

function AppShell({ onRegister }: { onRegister: () => void }) {
  return (
    <div className="eu-v2-shell">
      <main className="eu-v2-main">
        <Routes>
          <Route path="/" element={<TodayPage onRegister={onRegister} />} />
          <Route path="/vida" element={<LifePage />} />
          <Route path="/vida/carreira" element={<CareerPlanPage />} />
          <Route path="/descobertas" element={<DiscoveriesPage />} />
          <Route path="/memorias" element={<MemoriesPage />} />
          <Route path="/capturar" element={<ChatCapturePage />} />
          <Route path="/registro/:id" element={<RecordDetailPage />} />
          <Route path="/inbox" element={<ChatInboxPage />} />
          <Route path="/revisao" element={<ReviewPage />} />

          <Route path="/areas" element={<Navigate to="/vida" replace />} />
          <Route path="/projetos" element={<Navigate to="/vida" replace />} />
          <Route path="/projetos/:id" element={<Navigate to="/vida" replace />} />
          <Route path="/arquivo" element={<Navigate to="/memorias" replace />} />
          <Route path="/evolucao" element={<Navigate to="/vida#sinais" replace />} />
          <Route path="/eu" element={<Navigate to="/vida" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <button className="global-register-pill" onClick={onRegister} aria-label="Registrar no EU">
        <span>＋</span>
        registrar
      </button>

      <nav className="v2-bottom-nav" aria-label="Navegação principal">
        {nav.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === '/'}>
            <span aria-hidden="true">{item.icon}</span>
            <small>{item.label}</small>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  const [registerOpen, setRegisterOpen] = useState(false)

  return (
    <>
      <AppShell onRegister={() => setRegisterOpen(true)} />
      <RegisterSheet
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSaved={() => window.dispatchEvent(new Event('eu-record-saved'))}
      />
    </>
  )
}
