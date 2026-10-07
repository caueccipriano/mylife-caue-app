import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import RegisterSheet from './RegisterSheet'
import TodayPage from './TodayPage'
import LifeOSPage from './LifeOSPage'
import LifePage from './LifePage'
import MemoriesPage from './MemoriesPage'
import PhaseThemeSync from './PhaseThemeSync'
import NotificationRuleSync from './NotificationRuleSync'
import { initPrivacyAutoLock } from './privacy'
import { applyDiscreetMode, haptic } from './securitySettings'
import { emptyExpiredTrash } from './storage'
import { EuIcon } from './v2Ui'
import { trackRouteVisit } from './personalization'
import VaultAutoSync from './VaultAutoSync'

const MoneyPage = lazy(() => import('./MoneyPage'))
const CareerPlanPage = lazy(() => import('./LifePage').then((module) => ({ default: module.CareerPlanPage })))
const DiscoveriesPage = lazy(() => import('./DiscoveriesPage'))
const ChatCapturePage = lazy(() => import('./ChatCapturePage'))
const RecordDetailPage = lazy(() => import('./RecordDetailPage'))
const ChatInboxPage = lazy(() => import('./ChatInboxPage'))
const ReviewPage = lazy(() => import('./ReviewPage'))
const AskEuPage = lazy(() => import('./AskEuPage'))
const EntityPage = lazy(() => import('./EntityPage'))
const SnapshotsPage = lazy(() => import('./SnapshotsPage'))
const AstrologyPage = lazy(() => import('./AstrologyPage'))
const SecurityCenterPage = lazy(() => import('./SecurityCenterPage'))
const TrashPage = lazy(() => import('./TrashPage'))
const SelfPage = lazy(() => import('./SelfPage'))
const ChaptersPage = lazy(() => import('./ChaptersPage'))
const WrappedPage = lazy(() => import('./WrappedPage'))
const LifeLabPage = lazy(() => import('./LifeLabPage'))
const StarterPackImportPage = lazy(() => import('./StarterPackImportPage'))
const MoodPage = lazy(() => import('./MoodPage'))
const CollectionsPage = lazy(() => import('./CollectionsPage'))
const AreaPage = lazy(() => import('./AreaPage'))
const NotificationsPage = lazy(() => import('./NotificationsPage'))
const SearchPage = lazy(() => import('./SearchPage'))
const DecidePage = lazy(() => import('./DecidePage'))
const PeoplePage = lazy(() => import('./PeoplePage'))

const nav = [
  { path: '/', label: 'Hoje', icon: 'sun' },
  { path: '/dinheiro', label: 'Dinheiro', icon: 'wallet' },
  { path: '/sistema', label: 'Central', icon: 'collections' },
  { path: '/vida', label: 'Vida', icon: 'compass' },
  { path: '/memorias', label: 'Memórias', icon: 'sparkles' },
] as const

function RouteScrollMemory() {
  const location = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    const key = 'eu-scroll-' + location.key
    const nextTop = navigationType === 'POP' ? Number(sessionStorage.getItem(key) || 0) : 0
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: nextTop, left: 0, behavior: 'auto' }))

    return () => {
      window.cancelAnimationFrame(frame)
      sessionStorage.setItem(key, String(window.scrollY))
    }
  }, [location.key, navigationType])

  return null
}

function AppShell({ onRegister }: { onRegister: () => void }) {
  const location = useLocation()
  const showRegister = ['/', '/sistema', '/vida', '/descobertas', '/memorias'].includes(location.pathname)
  const showPrimaryDock = ['/', '/dinheiro', '/sistema', '/vida', '/memorias'].includes(location.pathname)
  const [chromeCompact, setChromeCompact] = useState(false)
  const fabMinimized = chromeCompact || location.pathname !== '/'

  useEffect(() => {
    trackRouteVisit(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false

    const update = () => {
      const nextY = window.scrollY
      const goingDown = nextY > lastY + 4
      const goingUp = nextY < lastY - 4

      if (nextY < 72) setChromeCompact(false)
      else if (goingDown) setChromeCompact(true)
      else if (goingUp) setChromeCompact(false)

      lastY = nextY
      ticking = false
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [location.pathname])

  const routeTone = location.pathname.startsWith('/dinheiro')
    ? 'money'
    : location.pathname.startsWith('/memorias')
      ? 'memory'
      : location.pathname.startsWith('/vida')
        ? 'life'
        : location.pathname.startsWith('/sistema')
          ? 'central'
          : 'today'

  return (
    <div className={'eu-v2-shell route-' + routeTone + (chromeCompact ? ' chrome-compact' : '') + (!showPrimaryDock ? ' no-primary-dock' : '')}>
      <RouteScrollMemory />
      <main className="eu-v2-main">
        <div className="route-stage" key={location.pathname}>
        <Suspense fallback={<div className="v2-page route-loading-v51"><span /><p>Abrindo…</p></div>}>
        <Routes>
          <Route path="/" element={<TodayPage onRegister={onRegister} />} />
          <Route path="/sistema" element={<LifeOSPage />} />
          <Route path="/dinheiro" element={<MoneyPage />} />
          <Route path="/vida" element={<LifePage />} />
          <Route path="/vida/carreira" element={<CareerPlanPage />} />
          <Route path="/vida/area/:id" element={<AreaPage />} />
          <Route path="/descobertas" element={<DiscoveriesPage />} />
          <Route path="/memorias" element={<MemoriesPage />} />
          <Route path="/memorias/humor" element={<MoodPage />} />
          <Route path="/memorias/colecoes" element={<CollectionsPage />} />
          <Route path="/notificacoes" element={<NotificationsPage />} />
          <Route path="/decidir" element={<DecidePage />} />
          <Route path="/pessoas" element={<PeoplePage />} />
          <Route path="/capturar" element={<ChatCapturePage />} />
          <Route path="/registro/:id" element={<RecordDetailPage />} />
          <Route path="/inbox" element={<ChatInboxPage />} />
          <Route path="/revisao" element={<ReviewPage />} />
          <Route path="/pergunte" element={<AskEuPage />} />
          <Route path="/buscar" element={<SearchPage />} />
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
          <Route path="/objetivos" element={<Navigate to="/sistema?view=goals" replace />} />
          <Route path="/projetos" element={<Navigate to="/sistema?view=projects" replace />} />
          <Route path="/agenda" element={<Navigate to="/sistema?view=agenda" replace />} />
          <Route path="/projetos/:id" element={<Navigate to="/sistema?view=projects" replace />} />
          <Route path="/arquivo" element={<Navigate to="/memorias" replace />} />
          <Route path="/evolucao" element={<Navigate to="/vida#sinais" replace />} />
          <Route path="/eu" element={<Navigate to="/vida" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </div>
      </main>

      {showRegister && (
        <button className={'global-register-pill compact smart-fab' + (fabMinimized ? ' minimized' : '')} onClick={() => { haptic('light'); onRegister() }} aria-label="Registrar no EU">
          <span><EuIcon name="plus" /></span>
          <b>registrar</b>
        </button>
      )}

      {showPrimaryDock && (
        <nav className={'v2-bottom-nav' + (chromeCompact ? ' dock-compact' : '')} aria-label="Navegação principal">
          {nav.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} onClick={() => haptic('light')}>
              <span className="bottom-nav-icon-wrap"><EuIcon name={item.icon} className="bottom-nav-icon" /></span>
              <small>{item.label}</small>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}

export default function App() {
  const [registerOpen, setRegisterOpen] = useState(false)
  const [showSplash, setShowSplash] = useState(() => sessionStorage.getItem('eu-splash-v18-4') !== 'seen')

  useEffect(() => {
    if (!showSplash) return
    sessionStorage.setItem('eu-splash-v18-4', 'seen')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => setShowSplash(false), reduceMotion ? 120 : 820)
    return () => window.clearTimeout(timer)
  }, [showSplash])

  useEffect(() => {
    applyDiscreetMode()
    const disposePrivacy = initPrivacyAutoLock()
    void emptyExpiredTrash(30)
    return disposePrivacy
  }, [])

  return (
    <>
      {showSplash && (
        <div className="eu-splash" aria-hidden="true">
          <div className="eu-splash-orbit" />
          <div className="eu-splash-mark">
            <strong>EU</strong>
            <i>✦</i>
          </div>
          <span>central pessoal</span>
        </div>
      )}
      <PhaseThemeSync />
      <NotificationRuleSync />
      <VaultAutoSync />
      <AppShell onRegister={() => setRegisterOpen(true)} />
      <RegisterSheet
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSaved={() => window.dispatchEvent(new Event('eu-record-saved'))}
      />
    </>
  )
}
