import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import RegisterSheet from './RegisterSheet'
import TodayPage from './TodayPage'
import LifePage, { CareerPlanPage } from './LifePage'
import DiscoveriesPage from './DiscoveriesPage'
import MemoriesPage from './MemoriesPage'
import ChatCapturePage from './ChatCapturePage'
import RecordDetailPage from './RecordDetailPage'
import ChatInboxPage from './ChatInboxPage'
import ReviewPage from './ReviewPage'
import AskEuPage from './AskEuPage'
import EntityPage from './EntityPage'
import SnapshotsPage from './SnapshotsPage'
import AstrologyPage from './AstrologyPage'
import SecurityCenterPage from './SecurityCenterPage'
import TrashPage from './TrashPage'
import SelfPage from './SelfPage'
import ChaptersPage from './ChaptersPage'
import WrappedPage from './WrappedPage'
import LifeLabPage from './LifeLabPage'
import PhaseThemeSync from './PhaseThemeSync'
import StarterPackImportPage from './StarterPackImportPage'
import MoodPage from './MoodPage'
import CollectionsPage from './CollectionsPage'
import AreaPage from './AreaPage'
import NotificationsPage from './NotificationsPage'
import NotificationRuleSync from './NotificationRuleSync'
import { initPrivacyAutoLock } from './privacy'
import { applyDiscreetMode, haptic } from './securitySettings'
import { emptyExpiredTrash } from './storage'
import { EuIcon } from './v2Ui'

const nav = [
  { path: '/', label: 'Hoje', icon: 'sun' },
  { path: '/vida', label: 'Vida', icon: 'compass' },
  { path: '/descobertas', label: 'Descobertas', icon: 'sparkles' },
  { path: '/memorias', label: 'Memórias', icon: 'search' },
] as const

function NavIcon({ name }: { name: typeof nav[number]['icon'] }) {
  if (name === 'sun') {
    return (
      <svg className="bottom-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3.6" />
        <path d="M12 2.5v2.1M12 19.4v2.1M2.5 12h2.1M19.4 12h2.1M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M18.7 5.3l-1.5 1.5M6.8 17.2l-1.5 1.5" />
      </svg>
    )
  }

  if (name === 'compass') {
    return (
      <svg className="bottom-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.4" />
        <path d="M14.9 9.1l-2 4-3.8 1.8 1.9-3.8 3.9-2z" />
      </svg>
    )
  }

  if (name === 'sparkles') {
    return (
      <svg className="bottom-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.2c.6 4.1 2.7 6.2 6.8 6.8-4.1.6-6.2 2.7-6.8 6.8-.6-4.1-2.7-6.2-6.8-6.8 4.1-.6 6.2-2.7 6.8-6.8z" />
        <path d="M18.6 15.8c.3 2 1.4 3.1 3.4 3.4-2 .3-3.1 1.4-3.4 3.4-.3-2-1.4-3.1-3.4-3.4 2-.3 3.1-1.4 3.4-3.4z" />
      </svg>
    )
  }

  return (
    <svg className="bottom-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.7" cy="10.7" r="6.4" />
      <path d="M15.5 15.5L21 21" />
    </svg>
  )
}

function AppShell({ onRegister }: { onRegister: () => void }) {
  const location = useLocation()
  const showRegister = ['/', '/vida', '/descobertas', '/memorias'].includes(location.pathname)
  return (
    <div className="eu-v2-shell">
      <main className="eu-v2-main">
        <Routes>
          <Route path="/" element={<TodayPage onRegister={onRegister} />} />
          <Route path="/vida" element={<LifePage />} />
          <Route path="/vida/carreira" element={<CareerPlanPage />} />
          <Route path="/vida/area/:id" element={<AreaPage />} />
          <Route path="/descobertas" element={<DiscoveriesPage />} />
          <Route path="/memorias" element={<MemoriesPage />} />
          <Route path="/memorias/humor" element={<MoodPage />} />
          <Route path="/memorias/colecoes" element={<CollectionsPage />} />
          <Route path="/notificacoes" element={<NotificationsPage />} />
          <Route path="/capturar" element={<ChatCapturePage />} />
          <Route path="/registro/:id" element={<RecordDetailPage />} />
          <Route path="/inbox" element={<ChatInboxPage />} />
          <Route path="/revisao" element={<ReviewPage />} />
          <Route path="/pergunte" element={<AskEuPage />} />
          <Route path="/assunto/:slug" element={<EntityPage />} />
          <Route path="/vida/fases" element={<SnapshotsPage />} />
          <Route path="/vida/astrologia" element={<AstrologyPage />} />
          <Route path="/seguranca" element={<SecurityCenterPage />} />
          <Route path="/lixeira" element={<TrashPage />} />
          <Route path="/vida/quem-sou" element={<SelfPage />} />
          <Route path="/vida/capitulos" element={<ChaptersPage />} />
          <Route path="/vida/wrapped" element={<WrappedPage />} />
          <Route path="/vida/lab" element={<LifeLabPage />} />
          <Route path="/importar" element={<StarterPackImportPage />} />

          <Route path="/areas" element={<Navigate to="/vida" replace />} />
          <Route path="/projetos" element={<Navigate to="/vida" replace />} />
          <Route path="/projetos/:id" element={<Navigate to="/vida" replace />} />
          <Route path="/arquivo" element={<Navigate to="/memorias" replace />} />
          <Route path="/evolucao" element={<Navigate to="/vida#sinais" replace />} />
          <Route path="/eu" element={<Navigate to="/vida" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {showRegister && (
        <button className="global-register-pill compact" onClick={() => { haptic('light'); onRegister() }} aria-label="Registrar no EU">
          <span><EuIcon name="plus" /></span>
          registrar
        </button>
      )}

      <nav className="v2-bottom-nav" aria-label="Navegação principal">
        {nav.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === '/'}>
            <span className="bottom-nav-icon-wrap"><NavIcon name={item.icon} /></span>
            <small>{item.label}</small>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  const [registerOpen, setRegisterOpen] = useState(false)

  useEffect(() => {
    applyDiscreetMode()
    const disposePrivacy = initPrivacyAutoLock()
    void emptyExpiredTrash(30)
    return disposePrivacy
  }, [])

  return (
    <>
      <PhaseThemeSync />
      <NotificationRuleSync />
      <AppShell onRegister={() => setRegisterOpen(true)} />
      <RegisterSheet
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSaved={() => window.dispatchEvent(new Event('eu-record-saved'))}
      />
    </>
  )
}
