import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { activeFollowUps, isRecordVisibleForInsights, nextFollowUpDate, saveMoodCheckin, updateRecord, type MoodValue, type StoredRecord } from './storage'
import { derivePatterns, lifePulse, reviewCandidates } from './intelligence'
import { deriveEcosystemInsights } from './ecosystem'
import { askEuBrain } from './euBrain'
import { dueCapsules, getSimpleDayMode, setSimpleDayMode } from './v3Life'
import { deriveContinue, deriveWeeklyDigest, getFocusAreas } from './uxFeatures'
import { useBridges, useChatInbox, useMood, useMoodHistory, usePersonalProfile, useRecords } from './appState'
import { BrandTop, EuIcon, SectionTitle, Tag, formatShortDate, typeTone, type EuIconName } from './v2Ui'
import { AstroTodayPreview } from './AstrologyPage'
import { haptic } from './securitySettings'
import LifeCommandCenter from './LifeCommandCenter'
import { deriveAttentionBudget } from './lifeCommandCenter'
import { deriveAmbientProfile } from './ambientHome'
import { deriveCarryOver, deriveCrossSignals, deriveDriftSignals, deriveWaiting, isWaitingRecord } from './lifeOSIntelligence'
import { deriveOneEuConnections } from './oneEu'
import OneEuConnections from './OneEuConnections'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function dayLabel() {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(new Date())
}

function sameLocalDay(value: string) {
  const date = new Date(value)
  const now = new Date()
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
}

function advice(mood: MoodValue | undefined, due: StoredRecord[], activeCount: number) {
  if (due.length) {
    const first = due[0]
    if (mood === 'cansado') return 'Tem algo esperando por você, mas hoje pode bastar decidir: continuar, pausar ou deixar para depois.'
    if (mood === 'pilhado' || mood === 'animado') return 'Sua energia está boa. Talvez seja um ótimo momento pra avançar em “' + first.text.slice(0, 52) + '”.'
    return 'Tem uma coisa que você começou e merece uma resposta: “' + first.text.slice(0, 52) + '”.'
  }

  if (mood === 'cansado') return 'Hoje não precisa render muito. Registrar o que está passando pela sua cabeça já conta.'
  if (mood === 'pilhado') return 'Energia alta: use em uma decisão importante, não em dez coisas ao mesmo tempo.'
  if (mood === 'animado') return 'Bom momento para mexer em algo que você quer ver andando de verdade.'
  if (activeCount) return 'Você tem coisas vivas em andamento. O EU vai trazendo cada uma de volta na hora certa.'
  return 'Comece simples: guarde uma coisa que você gostou, decidiu, começou ou quer lembrar.'
}

const moods: { value: MoodValue; icon: EuIconName; label: string }[] = [
  { value: 'animado', icon: 'smile', label: 'bem' },
  { value: 'ok', icon: 'neutral', label: 'ok' },
  { value: 'cansado', icon: 'moon', label: 'cansado' },
  { value: 'pilhado', icon: 'bolt', label: 'pilhado' },
]

export default function TodayPage({ onRegister }: { onRegister: () => void }) {
  const records = useRecords()
  const profile = usePersonalProfile()
  const mood = useMood()
  const moodHistory = useMoodHistory()
  const { bridges } = useBridges()
  const moneyBridge = bridges.find((card) => card.id === 'folego')
  const oneEuConnections = useMemo(() => deriveOneEuConnections(records, bridges), [records, bridges])
  const inbox = useChatInbox()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedView = searchParams.get('view')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [simpleDay, setSimpleDay] = useState(() => getSimpleDayMode())
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem('eu-focus-mode-v1') === 'on')
  const [todayView, setTodayView] = useState<'now' | 'signals'>(() => {
    if (requestedView === 'signals' || requestedView === 'now') return requestedView
    return localStorage.getItem('eu-today-view') === 'signals' ? 'signals' : 'now'
  })
  const [focusAreas, setFocusAreasState] = useState(() => getFocusAreas())
  const [ambientNow, setAmbientNow] = useState(() => new Date())

  const followups = useMemo(() => activeFollowUps(records), [records])
  const due = followups.filter((item) => item.due && isRecordVisibleForInsights(item.record)).map((item) => item.record)
  const active = followups.filter((item) => isRecordVisibleForInsights(item.record)).map((item) => item.record)
  const todayRecords = records.filter((record) => sameLocalDay(record.createdAt)).slice(0, 3)
  const chatToday = todayRecords.filter((record) => record.source === 'chatgpt')
  const review = useMemo(() => reviewCandidates(records), [records])
  const patterns = useMemo(() => derivePatterns(records), [records])
  const weekly = useMemo(() => deriveWeeklyDigest(records, moodHistory), [records, moodHistory])
  const pulse = useMemo(() => lifePulse(records), [records])
  const continueRecords = useMemo(() => deriveContinue(records, focusAreas), [records, focusAreas])
  const ecosystemInsights = useMemo(() => deriveEcosystemInsights(records, bridges), [records, bridges])
  const euKnows = useMemo(() => askEuBrain(records, bridges, 'O que eu preciso saber agora?'), [records, bridges])
  const readyCapsules = useMemo(() => dueCapsules(records), [records])
  const waiting = useMemo(() => deriveWaiting(records), [records])
  const carryOver = useMemo(() => deriveCarryOver(records), [records])
  const driftSignals = useMemo(() => deriveDriftSignals(records, focusAreas), [records, focusAreas])
  const crossSignals = useMemo(() => deriveCrossSignals(records), [records])
  const ambientAttention = useMemo(() => deriveAttentionBudget(records, inbox.length), [records, inbox.length])
  const ambient = useMemo(() => deriveAmbientProfile(ambientNow, ambientAttention.level), [ambientNow, ambientAttention.level])
  const focusRecords = useMemo(() => {
    const seen = new Set<string>()
    return [...due.filter((record) => !isWaitingRecord(record)), ...carryOver, ...continueRecords.filter((record) => !isWaitingRecord(record))]
      .filter((record) => {
        if (seen.has(record.id)) return false
        seen.add(record.id)
        return true
      })
      .slice(0, 3)
  }, [due, carryOver, continueRecords])

  useEffect(() => {
    if (requestedView === 'signals') setTodayView('signals')
    if (requestedView === 'now') setTodayView('now')
  }, [requestedView])

  function toggleFocusMode() {
    const next = !focusMode
    setFocusMode(next)
    localStorage.setItem('eu-focus-mode-v1', next ? 'on' : 'off')
    if (next) setTodayView('now')
    haptic('light')
  }

  useEffect(() => {
    const timer = window.setInterval(() => setAmbientNow(new Date()), 5 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
    const previousThemeColor = meta?.content

    root.dataset.euAmbient = ambient.period
    root.dataset.euPressure = ambient.pressure
    if (meta) meta.content = ambient.themeColor

    return () => {
      delete root.dataset.euAmbient
      delete root.dataset.euPressure
      if (meta && previousThemeColor) meta.content = previousThemeColor
    }
  }, [ambient])

  useEffect(() => {
    const refreshSimple = () => setSimpleDay(getSimpleDayMode())
    const refreshFocus = () => setFocusAreasState(getFocusAreas())
    window.addEventListener('eu-simple-day-updated', refreshSimple)
    window.addEventListener('eu-focus-updated', refreshFocus)
    return () => {
      window.removeEventListener('eu-simple-day-updated', refreshSimple)
      window.removeEventListener('eu-focus-updated', refreshFocus)
    }
  }, [])

  async function complete(record: StoredRecord) {
    setBusyId(record.id)
    await updateRecord(record.id, { status: 'completed', completedAt: new Date().toISOString(), followUpAt: undefined })
    window.dispatchEvent(new Event('eu-record-saved'))
    setBusyId(null)
  }

  async function snooze(record: StoredRecord, days = record.followUpDays || 7) {
    setBusyId(record.id)
    await updateRecord(record.id, {
      status: 'active',
      followUpDays: days,
      followUpAt: nextFollowUpDate(days),
      lastPromptedAt: new Date().toISOString(),
    })
    window.dispatchEvent(new Event('eu-record-saved'))
    setBusyId(null)
  }

  return (
    <div className={'v2-page today-page today-view-' + todayView + ' ambient-' + ambient.period + ' ambient-pressure-' + ambient.pressure + (simpleDay ? ' simple-day' : '') + (focusMode ? ' focus-mode-on' : '')}>
      <BrandTop />

      <section className="today-glance" aria-label="Seu dia no EU">
        <section className="today-hello">
        <p className="today-date-row"><span>{dayLabel()}</span><span className="ambient-state-chip"><i /><b>{ambient.label}</b><em>{ambient.note}</em></span></p>
        <h1>{greeting()}{profile.displayName ? ', ' + profile.displayName : ''}</h1>
        <span>como tá seu humor hoje?</span>
      </section>

      <section className="mood-checkin" aria-label="Check-in do dia">
        <div className="mood-row">
          {moods.map((item) => (
            <button
              key={item.value}
              className={'mood-option mood-' + item.value + (mood?.mood === item.value ? ' active' : '')}
              onClick={() => { saveMoodCheckin(item.value); haptic('light') }}
              aria-label={item.label}
              aria-pressed={mood?.mood === item.value}
              title={item.label}
            >
              <span className="mood-icon"><EuIcon name={item.icon} /></span>
              <small>{item.label}</small>
            </button>
          ))}
        </div>
        <span className={'mood-skip' + (mood ? ' saved' : '')} aria-live="polite">{mood ? <><EuIcon name="check" />salvo para hoje</> : 'opcional, sempre'}</span>
      </section>

      <section className={'eu-knows-card confidence-' + euKnows.confidence}>
        <div className="eu-knows-top">
          <div>
            <Tag tone="cobalt">EU SABE</Tag>
            <span className="eu-knows-live"><i />contexto vivo</span>
          </div>
          <button className="simple-day-toggle" aria-pressed={simpleDay} onClick={() => { const next = !simpleDay; setSimpleDayMode(next); setSimpleDay(next) }}><EuIcon name={simpleDay ? 'sparkles' : 'moon'} />{simpleDay ? 'mostrar tudo' : 'hoje sem administrar'}</button>
        </div>
        <h2>{euKnows.answer}</h2>
        {euKnows.detail && <p>{euKnows.detail}</p>}
        <div className="eu-knows-foot">
          <div className="eu-knows-chips">
            {ambientAttention.overdueCount > 0 && <span>{ambientAttention.overdueCount} pedindo ação</span>}
            {waiting.length > 0 && <span>{waiting.length} aguardando</span>}
            {euKnows.sources.length > 0 && <span>{euKnows.sources.length} evidência{euKnows.sources.length === 1 ? '' : 's'}</span>}
            {!ambientAttention.overdueCount && !waiting.length && <span>nenhuma urgência real</span>}
          </div>
          <NavLink to="/pergunte?q=O%20que%20eu%20preciso%20saber%20agora%3F">entender <EuIcon name="arrow-up-right" /></NavLink>
        </div>
      </section>

      <div className="today-core-nav-v39">
        <button className={'focus-mode-toggle' + (focusMode ? ' active' : '')} aria-pressed={focusMode} onClick={toggleFocusMode}>
          <EuIcon name={focusMode ? 'check' : 'pin'} />
          {focusMode ? 'em foco' : 'modo foco'}
        </button>
        <NavLink to="/sistema"><EuIcon name="collections" />Central</NavLink>
        <NavLink to="/vida/lab"><EuIcon name="sparkles" />Sinais</NavLink>
      </div>
      </section>

      <LifeCommandCenter records={records} inboxCount={inbox.length} compact />

      {focusMode && (
        <section className="focus-stage-v32 now-only" aria-label="Modo foco">
          <header>
            <div>
              <span><EuIcon name="pin" /></span>
              <div><small>MODO FOCO</small><h2>O resto pode esperar.</h2></div>
            </div>
            <button onClick={toggleFocusMode}>sair do foco</button>
          </header>
          <p>O EU reduziu a tela para as poucas coisas que merecem movimento agora.</p>
          <div className="focus-stage-list-v32">
            {focusRecords.length ? focusRecords.map((record, index) => (
              <NavLink key={record.id} to={'/registro/' + record.id}>
                <b>{String(index + 1).padStart(2, '0')}</b>
                <div>
                  <span>{record.area}</span>
                  <strong>{record.text}</strong>
                  <small>{record.nextMove || 'Continuar de onde parou'}</small>
                </div>
                <EuIcon name="arrow-up-right" />
              </NavLink>
            )) : (
              <div className="focus-stage-empty-v32"><strong>Nada está pedindo foco agora.</strong><p>Você pode usar o modo assim mesmo para deixar o EU quieto.</p></div>
            )}
          </div>
        </section>
      )}

      {!focusMode && (
        <section className="today-priority-v39 now-only" aria-label="O que merece sua atenção agora">
          <div className="today-priority-head-v39">
            <div><small>AGORA</small><h2>{focusRecords.length ? 'O que merece sua atenção.' : 'Nada está cobrando você.'}</h2></div>
            <NavLink to="/sistema">ver Central <EuIcon name="arrow-up-right" /></NavLink>
          </div>
          {focusRecords.length ? (
            <div className="today-priority-grid-v39">
              <NavLink className="today-priority-main-v39" to={'/registro/' + focusRecords[0].id}>
                <span><Tag tone={due.some((item) => item.id === focusRecords[0].id) ? 'coral' : focusRecords[0].pinned ? 'cobalt' : typeTone(focusRecords[0].type)}>{due.some((item) => item.id === focusRecords[0].id) ? 'AGORA' : focusRecords[0].area}</Tag></span>
                <strong>{focusRecords[0].text}</strong>
                <p>{focusRecords[0].nextMove || 'Continuar de onde parou.'}</p>
                <small>abrir <EuIcon name="arrow-up-right" /></small>
              </NavLink>
              {focusRecords.length > 1 && (
                <div className="today-priority-secondary-v39">
                  {focusRecords.slice(1, 3).map((record) => (
                    <NavLink key={record.id} to={'/registro/' + record.id}>
                      <span>{record.area}</span>
                      <strong>{record.text}</strong>
                      <EuIcon name="arrow-up-right" />
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="today-priority-empty-v39">
              <span><EuIcon name="check" /></span>
              <div><strong>Seu sistema está quieto.</strong><p>Use o espaço para registrar, pensar ou simplesmente seguir o dia.</p></div>
            </div>
          )}
        </section>
      )}

      {!focusMode && <OneEuConnections items={oneEuConnections} limit={1} compact title="Uma coisa conversa com outra." />}

      <details className="today-more-drawer now-only">
        <summary>
          <div><span><EuIcon name="collections" /></span><div><strong>Mais contexto</strong><small>dinheiro, ideia do dia e detalhes leves</small></div></div>
          <b>{(moneyBridge?.bridge ? 1 : 0) + readyCapsules.length}</b>
          <EuIcon name="arrow-right" />
        </summary>
        <div className="today-more-body">
        {moneyBridge?.bridge && (
          <NavLink className="today-money-pulse now-only" to="/dinheiro">
            <div className="today-money-pulse-mark"><EuIcon name="wallet" /></div>
            <div className="today-money-pulse-copy">
              <small>DINHEIRO</small>
              <strong>{typeof moneyBridge.bridge.metrics.dailyFolego === 'number'
                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(moneyBridge.bridge.metrics.dailyFolego) + ' por dia'
                : 'Seu dinheiro está no EU'}</strong>
              <p>{moneyBridge.bridge.summary}</p>
            </div>
            <EuIcon name="arrow-up-right" />
          </NavLink>
        )}
  
        {readyCapsules.length > 0 && (
          <button className="capsule-ready-callout now-only" onClick={() => navigate('/vida/lab')}>
            <Tag tone="lilac">CÁPSULA DO FUTURO</Tag>
            <strong>{readyCapsules.length === 1 ? 'Uma mensagem sua chegou.' : readyCapsules.length + ' mensagens suas chegaram.'}</strong>
            <span>abrir no EU Lab <EuIcon name="arrow-up-right" /></span>
          </button>
        )}
  
        {focusRecords.length > 0 && (
          <section className="today-block continue-block now-only today-admin-context-v39">
            <SectionTitle
              eyebrow="FOCO"
              title="Seu foco agora"
              action={<span className="focus-inline-label">{focusRecords.length}/3 · {focusAreas.length ? focusAreas.join(' + ') : 'só o que importa'}</span>}
            />
            <p className="today-focus-principle">No máximo três coisas. O resto continua guardado no sistema sem disputar sua atenção.</p>
            <div className="continue-strip">
              {focusRecords.map((record, index) => (
                <NavLink key={record.id} className={'continue-card continue-card-' + index} to={'/registro/' + record.id}>
                  <div>
                    <Tag tone={due.some((item) => item.id === record.id) ? 'coral' : record.pinned ? 'cobalt' : typeTone(record.type)}>
                      {due.some((item) => item.id === record.id) ? 'AGORA' : record.pinned ? 'FIXADO' : record.type}
                    </Tag>
                    <span>{record.area}</span>
                  </div>
                  <h3>{record.text}</h3>
                  <p>{record.nextMove || (record.progressLevel ? 'Retomar o progresso' : record.followUpAt ? 'Tem continuidade marcada' : 'Continuar de onde parou')}</p>
                  <small>abrir <EuIcon name="arrow-up-right" /></small>
                </NavLink>
              ))}
            </div>
            <NavLink className="today-system-link" to="/sistema">ver o restante na Central <EuIcon name="arrow-up-right" /></NavLink>
          </section>
        )}
  
        {waiting.length > 0 && (
          <NavLink className="waiting-strip now-only today-admin-context-v39" to="/sistema?view=panel#aguardando">
            <span className="waiting-strip-icon"><EuIcon name="clock" /></span>
            <div>
              <small>AGUARDANDO</small>
              <strong>{waiting.length === 1 ? 'Uma coisa não depende de você agora.' : waiting.length + ' coisas não dependem de você agora.'}</strong>
              <p>Ficam acompanhadas sem ocupar sua lista de ação.</p>
            </div>
            <EuIcon name="arrow-up-right" />
          </NavLink>
        )}
  
        <section className="daily-idea now-only">
          <span className="daily-idea-icon" aria-hidden="true"><EuIcon name="sparkles" /></span>
          <div>
            <small>UMA IDEIA PRA HOJE</small>
            <p>{advice(mood?.mood, due, active.length)}</p>
          </div>
        </section>
  
        <AstroTodayPreview />
  
        {inbox.length > 0 && (
          <NavLink className="adaptive-callout chat-inbox-callout now-only today-admin-context-v39" to="/inbox">
            <div>
              <Tag tone="ink">CAIXA DO CHAT</Tag>
              <h2>{inbox.length === 1 ? 'Uma conversa esperando por você.' : inbox.length + ' conversas esperando por você.'}</h2>
              <p>Revise o que vale guardar antes de entrar no seu EU.</p>
            </div>
            <span className="callout-arrow"><EuIcon name="arrow-up-right" /></span>
          </NavLink>
        )}
  
        {review.length > 0 && (
          <NavLink className="adaptive-callout review-callout now-only today-admin-context-v39" to="/revisao">
            <div>
              <Tag tone="amber">REVISÃO</Tag>
              <h2>{review.length === 1 ? 'Uma coisa pede uma resposta.' : review.length + ' coisas pedem uma resposta.'}</h2>
              <p>Continuar, concluir, pausar ou deixar pra lá. Leva poucos minutos.</p>
            </div>
            <span className="callout-arrow"><EuIcon name="arrow-up-right" /></span>
          </NavLink>
        )}
  
        {due.length > 0 && (
          <section className="today-block now-only today-admin-context-v39">
            <SectionTitle eyebrow="VOLTOU PRA VOCÊ" title="Isso ainda está vivo?" />
            <div className="followup-stack">
              {due.slice(0, 3).map((record) => (
                <article className="followup-card" key={record.id}>
                  <div className="feed-meta">
                    <Tag tone={typeTone(record.type)}>{record.type}</Tag>
                    <span>{record.area}</span>
                  </div>
                  <h3>{record.text}</h3>
                  <p>Você começou isso há algum tempo. Quer manter em movimento?</p>
                  <div className="followup-actions">
                    <button onClick={() => complete(record)} disabled={busyId === record.id}><EuIcon name="check" />Concluí</button>
                    <button onClick={() => snooze(record, 3)} disabled={busyId === record.id}><EuIcon name="clock" />Daqui uns dias</button>
                    <button onClick={() => snooze(record, 7)} disabled={busyId === record.id}><EuIcon name="clock" />1 semana</button>
                    <button onClick={() => snooze(record, 30)} disabled={busyId === record.id}><EuIcon name="clock" />Mês que vem</button>
                    <button onClick={() => navigate('/registro/' + record.id)}>Abrir <EuIcon name="arrow-up-right" /></button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
  
  
        </div>
      </details>

      <section className="today-block signals-only">
        <SectionTitle eyebrow="ESSA SEMANA" title="O que sua vida contou" action={<button className="quiet-link" onClick={() => navigate('/memorias/humor')}>humor <EuIcon name="arrow-up-right" /></button>} />
        <article className="weekly-story-card weekly-story-v2">
          <div className="weekly-story-number">
            <span>{weekly.records}</span>
            <small>registros</small>
          </div>
          <div className="weekly-story-copy">
            <p>{weekly.text}</p>
            <div>
              {weekly.topArea && <Tag tone="green">{weekly.topArea}</Tag>}
              {weekly.completed > 0 && <Tag tone="cobalt">{weekly.completed} concluído{weekly.completed > 1 ? 's' : ''}</Tag>}
              {weekly.mood && <Tag tone="lilac">humor: {weekly.mood === 'animado' ? 'bem' : weekly.mood}</Tag>}
            </div>
          </div>
        </article>
      </section>

      {driftSignals.length > 0 && (
        <section className="today-block signals-only">
          <SectionTitle eyebrow="EU DRIFT" title="Prioridade x atenção real" />
          <div className="drift-grid">
            {driftSignals.map((signal) => (
              <article key={signal.id} className={'drift-card drift-' + signal.tone}>
                <Tag tone={signal.tone}>{signal.tone === 'amber' ? 'FORA DO RADAR' : 'ATENÇÃO MIGROU'}</Tag>
                <h3>{signal.title}</h3>
                <p>{signal.detail}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {crossSignals.length > 0 && (
        <section className="today-block signals-only">
          <SectionTitle eyebrow="INTELIGÊNCIA CRUZADA" title="Coisas que fazem mais sentido juntas" />
          <div className="cross-signal-grid">
            {crossSignals.map((signal) => (
              <article key={signal.id}>
                <span><EuIcon name="sparkles" /></span>
                <div><strong>{signal.title}</strong><p>{signal.detail}</p></div>
              </article>
            ))}
          </div>
        </section>
      )}

      {patterns.length > 0 && (
        <section className="today-block signals-only">
          <SectionTitle eyebrow="PADRÕES" title="Coisas que o EU percebeu" />
          <div className="pattern-grid">
            {patterns.map((pattern) => (
              <article key={pattern.id} className={'pattern-card pattern-' + pattern.tone}>
                <Tag tone={pattern.tone}>{pattern.id === 'top-tag' ? 'TEMA' : pattern.id === 'stale' ? 'ATENÇÃO' : 'SINAL'}</Tag>
                <h3>{pattern.title}</h3>
                <p>{pattern.detail}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="today-block signals-only">
        <SectionTitle eyebrow="NESTA FASE" title="Um olhar rápido" />
        <div className="life-pulse">
          {pulse.map((item) => (
            <article key={item.label}>
              <strong>{item.label}</strong>
              <span>{item.state}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="today-block now-only">
        <SectionTitle
          eyebrow="HOJE"
          title="O que entrou na sua vida"
          action={<button className="quiet-link" onClick={() => navigate('/memorias')}>ver tudo <EuIcon name="arrow-up-right" /></button>}
        />

        <div className="today-feed">
          {todayRecords.length ? todayRecords.map((record) => (
            <NavLink className="feed-card tappable-card" key={record.id} to={'/registro/' + record.id}>
              {record.private ? (
                <>
                  <div className="feed-meta"><Tag tone="pink">privado</Tag></div>
                  <p>Registro privado</p>
                </>
              ) : record.revealAt && !record.capsuleOpenedAt && new Date(record.revealAt).getTime() > Date.now() ? (
                <>
                  <div className="feed-meta"><Tag tone="lilac">cápsula fechada</Tag></div>
                  <p>Uma mensagem para o futuro.</p>
                </>
              ) : (
                <>
                  <div className="feed-meta">
                    <Tag tone={typeTone(record.type)}>{record.type}</Tag>
                    <span>{record.area}</span>
                    {record.source === 'chatgpt' && <Tag tone="ink">do chat</Tag>}
                  </div>
                  <p>{record.text || 'Registro com anexo'}</p>
                  {record.status === 'active' && <small className="feed-followup"><EuIcon name="refresh" />em acompanhamento</small>}
                </>
              )}
            </NavLink>
          )) : (
            <div className="soft-empty today-empty">
              <span><EuIcon name="note" /></span>
              <p>Ainda está quieto por aqui hoje. Registre qualquer coisa do seu jeito.</p>
              <button onClick={onRegister}><EuIcon name="plus" />registrar algo</button>
            </div>
          )}
        </div>
      </section>

      <section className="today-block signals-only">
        <SectionTitle
          eyebrow="SINAIS"
          title="Seu ecossistema"
          action={<button className="quiet-link" onClick={() => navigate('/vida#sinais')}>ver na Vida <EuIcon name="arrow-up-right" /></button>}
        />
        <div className="signal-mini-grid">
          {bridges.map((card) => (
            <article key={card.id} className={'signal-mini signal-' + card.id}>
              <strong>{card.title}</strong>
              <p>{card.bridge?.summary || 'Ainda sem resumo neste aparelho.'}</p>
              <span>{card.stale ? 'resumo antigo · atualizar' : card.bridge?.status || 'aguardando'}</span>
            </article>
          ))}
        </div>
      </section>

      {ecosystemInsights.length > 0 && (
        <section className="today-block signals-only">
          <SectionTitle eyebrow="CONEXÕES" title="O que isso significa junto" />
          <div className="ecosystem-insights compact">
            {ecosystemInsights.slice(0, 2).map((insight) => (
              <article key={insight.id} className={'ecosystem-insight insight-' + insight.tone}>
                <Tag tone={insight.tone}>SINAL CRUZADO</Tag>
                <h3>{insight.title}</h3>
                <p>{insight.detail}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {chatToday.length > 0 && (
        <section className="chat-receipt now-only">
          <Tag tone="ink">CHATGPT → EU</Tag>
          <p>{chatToday.length === 1 ? '1 coisa da nossa conversa entrou no EU hoje.' : chatToday.length + ' coisas das nossas conversas entraram no EU hoje.'}</p>
          <button onClick={() => navigate('/memorias?origem=chatgpt')}>Ver do Chat <EuIcon name="arrow-up-right" /></button>
        </section>
      )}

    </div>
  )
}
