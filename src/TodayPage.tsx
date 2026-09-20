import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { activeFollowUps, isRecordVisibleForInsights, nextFollowUpDate, saveMoodCheckin, updateRecord, type MoodValue, type StoredRecord } from './storage'
import { derivePatterns, lifePulse, reviewCandidates } from './intelligence'
import { deriveEcosystemInsights } from './ecosystem'
import { buildDailyBrief } from './lifeModel'
import { dueCapsules, getSimpleDayMode, setSimpleDayMode } from './v3Life'
import { deriveContinue, deriveWeeklyDigest, getFocusAreas } from './uxFeatures'
import { useBridges, useChatInbox, useMood, useMoodHistory, usePersonalProfile, useRecords } from './appState'
import { BrandTop, EuIcon, SectionTitle, Tag, formatShortDate, typeTone, type EuIconName } from './v2Ui'
import { AstroTodayPreview } from './AstrologyPage'

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
  const inbox = useChatInbox()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedView = searchParams.get('view')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [simpleDay, setSimpleDay] = useState(() => getSimpleDayMode())
  const [todayView, setTodayView] = useState<'now' | 'signals'>(() => requestedView === 'signals' ? 'signals' : 'now')
  const [focusAreas, setFocusAreasState] = useState(() => getFocusAreas())

  const followups = useMemo(() => activeFollowUps(records), [records])
  const due = followups.filter((item) => item.due && isRecordVisibleForInsights(item.record)).map((item) => item.record)
  const active = followups.filter((item) => isRecordVisibleForInsights(item.record)).map((item) => item.record)
  const todayRecords = records.filter((record) => sameLocalDay(record.createdAt)).slice(0, 8)
  const chatToday = todayRecords.filter((record) => record.source === 'chatgpt')
  const review = useMemo(() => reviewCandidates(records), [records])
  const patterns = useMemo(() => derivePatterns(records), [records])
  const weekly = useMemo(() => deriveWeeklyDigest(records, moodHistory), [records, moodHistory])
  const pulse = useMemo(() => lifePulse(records), [records])
  const continueRecords = useMemo(() => deriveContinue(records, focusAreas), [records, focusAreas])
  const ecosystemInsights = useMemo(() => deriveEcosystemInsights(records, bridges), [records, bridges])
  const dailyBrief = useMemo(() => buildDailyBrief(records, bridges), [records, bridges])
  const readyCapsules = useMemo(() => dueCapsules(records), [records])

  useEffect(() => {
    if (requestedView === 'signals') setTodayView('signals')
    if (requestedView === 'now') setTodayView('now')
  }, [requestedView])

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
    <div className={'v2-page today-page today-view-' + todayView + (simpleDay ? ' simple-day' : '')}>
      <BrandTop />

      <section className="today-hello">
        <p>{dayLabel()}</p>
        <h1>{greeting()}{profile.displayName ? ', ' + profile.displayName : ''}</h1>
        <span>como tá seu humor hoje?</span>
      </section>

      <section className="mood-checkin" aria-label="Check-in do dia">
        <div className="mood-row">
          {moods.map((item) => (
            <button
              key={item.value}
              className={'mood-option mood-' + item.value + (mood?.mood === item.value ? ' active' : '')}
              onClick={() => saveMoodCheckin(item.value)}
              aria-label={item.label}
              aria-pressed={mood?.mood === item.value}
              title={item.label}
            >
              <span className="mood-icon"><EuIcon name={item.icon} /></span>
              <small>{item.label}</small>
            </button>
          ))}
        </div>
        <span className="mood-skip">opcional, sempre</span>
      </section>

      <section className="daily-brief-card">
        <div className="daily-brief-top">
          <Tag tone="cobalt">DAILY BRIEF</Tag>
          <button className="simple-day-toggle" onClick={() => { const next = !simpleDay; setSimpleDayMode(next); setSimpleDay(next) }}>{simpleDay ? 'mostrar tudo' : 'hoje sem administrar'}</button>
        </div>
        <h2>{dailyBrief.title}</h2>
        <p>{dailyBrief.text}</p>
        <div className="daily-brief-chips">
          {dailyBrief.dueCount > 0 && <span>{dailyBrief.dueCount} pedindo continuidade</span>}
          {dailyBrief.staleCount > 0 && <span>{dailyBrief.staleCount} parados</span>}
          {dailyBrief.topArea && <span>{dailyBrief.topArea} em destaque</span>}
        </div>
      </section>

      <nav className="today-view-tabs" aria-label="Visões de Hoje">
        <button className={todayView === 'now' ? 'active' : ''} onClick={() => setTodayView('now')}><EuIcon name="bolt" />Agora</button>
        <button className={todayView === 'signals' ? 'active' : ''} onClick={() => setTodayView('signals')}><EuIcon name="sparkles" />Sinais</button>
      </nav>

      {readyCapsules.length > 0 && (
        <button className="capsule-ready-callout now-only" onClick={() => navigate('/vida/lab')}>
          <Tag tone="lilac">CÁPSULA DO FUTURO</Tag>
          <strong>{readyCapsules.length === 1 ? 'Uma mensagem sua chegou.' : readyCapsules.length + ' mensagens suas chegaram.'}</strong>
          <span>abrir no EU Lab <EuIcon name="arrow-up-right" /></span>
        </button>
      )}

      {continueRecords.length > 0 && (
        <section className="today-block continue-block now-only">
          <SectionTitle
            eyebrow="CONTINUAR"
            title="De onde você parou"
            action={focusAreas.length ? <span className="focus-inline-label">foco: {focusAreas.join(' + ')}</span> : undefined}
          />
          <div className="continue-strip">
            {continueRecords.slice(0, 4).map((record, index) => (
              <article key={record.id} className={'continue-card continue-card-' + index} onClick={() => navigate('/registro/' + record.id)}>
                <div>
                  <Tag tone={record.pinned ? 'cobalt' : typeTone(record.type)}>{record.pinned ? 'FIXADO' : record.type}</Tag>
                  <span>{record.area}</span>
                </div>
                <h3>{record.text}</h3>
                <p>{record.nextMove || (record.progressLevel ? 'Retomar o progresso' : record.followUpAt ? 'Tem continuidade marcada' : 'Continuar de onde parou')}</p>
                <small>abrir <EuIcon name="arrow-up-right" /></small>
              </article>
            ))}
          </div>
        </section>
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
        <section className="adaptive-callout chat-inbox-callout now-only" onClick={() => navigate('/inbox')}>
          <div>
            <Tag tone="ink">CAIXA DO CHAT</Tag>
            <h2>{inbox.length === 1 ? 'Uma conversa esperando por você.' : inbox.length + ' conversas esperando por você.'}</h2>
            <p>Revise o que vale guardar antes de entrar no seu EU.</p>
          </div>
          <span className="callout-arrow"><EuIcon name="arrow-up-right" /></span>
        </section>
      )}

      {review.length > 0 && (
        <section className="adaptive-callout review-callout now-only" onClick={() => navigate('/revisao')}>
          <div>
            <Tag tone="amber">REVISÃO</Tag>
            <h2>{review.length === 1 ? 'Uma coisa pede uma resposta.' : review.length + ' coisas pedem uma resposta.'}</h2>
            <p>Continuar, concluir, pausar ou deixar pra lá. Leva poucos minutos.</p>
          </div>
          <span className="callout-arrow"><EuIcon name="arrow-up-right" /></span>
        </section>
      )}

      {due.length > 0 && (
        <section className="today-block now-only">
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
            <article className="feed-card tappable-card" key={record.id} onClick={() => navigate('/registro/' + record.id)}>
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
            </article>
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
          title="Seus outros apps"
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
