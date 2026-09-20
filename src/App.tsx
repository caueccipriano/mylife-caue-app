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
          <NavLink key={item.path} to={item.path} end={item.path === '/'} onClick={() => haptic('light')}>
            <span className="bottom-nav-icon-wrap"><EuIcon name={item.icon} className="bottom-nav-icon" /></span>
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
