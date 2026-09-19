import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { activeFollowUps, nextFollowUpDate, saveMoodCheckin, updateRecord, type MoodValue, type StoredRecord } from './storage'
import { derivePatterns, lifePulse, periodStory, reviewCandidates } from './intelligence'
import { deriveEcosystemInsights } from './ecosystem'
import { buildDailyBrief } from './lifeModel'
import { useBridges, useChatInbox, useMood, useRecords } from './appState'
import { BrandTop, SectionTitle, Tag, formatShortDate, typeTone } from './v2Ui'
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

const moods: { value: MoodValue; icon: string; label: string }[] = [
  { value: 'animado', icon: '☺', label: 'bem' },
  { value: 'ok', icon: '◡', label: 'ok' },
  { value: 'cansado', icon: '–', label: 'cansado' },
  { value: 'pilhado', icon: '↟', label: 'pilhado' },
]

export default function TodayPage({ onRegister }: { onRegister: () => void }) {
  const records = useRecords()
  const mood = useMood()
  const { bridges } = useBridges()
  const inbox = useChatInbox()
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState<string | null>(null)

  const followups = useMemo(() => activeFollowUps(records), [records])
  const due = followups.filter((item) => item.due && !item.record.private).map((item) => item.record)
  const active = followups.filter((item) => !item.record.private).map((item) => item.record)
  const todayRecords = records.filter((record) => sameLocalDay(record.createdAt)).slice(0, 8)
  const chatToday = todayRecords.filter((record) => record.source === 'chatgpt')
  const review = useMemo(() => reviewCandidates(records), [records])
  const patterns = useMemo(() => derivePatterns(records), [records])
  const story = useMemo(() => periodStory(records, 7), [records])
  const pulse = useMemo(() => lifePulse(records), [records])
  const ecosystemInsights = useMemo(() => deriveEcosystemInsights(records, bridges), [records, bridges])
  const dailyBrief = useMemo(() => buildDailyBrief(records, bridges), [records, bridges])

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
    <div className="v2-page today-page">
      <BrandTop />

      <section className="today-hello">
        <p>{dayLabel()}</p>
        <h1>{greeting()}, Cauê</h1>
        <span>como você chega hoje?</span>
      </section>

      <section className="mood-checkin" aria-label="Check-in do dia">
        <div className="mood-row">
          {moods.map((item) => (
            <button
              key={item.value}
              className={mood?.mood === item.value ? 'active' : ''}
              onClick={() => saveMoodCheckin(item.value)}
              aria-label={item.label}
              title={item.label}
            >
              <span>{item.icon}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </div>
        <button className="mood-skip" onClick={() => undefined}>opcional, sempre</button>
      </section>

      <section className="daily-brief-card">
        <div className="daily-brief-top">
          <Tag tone="cobalt">DAILY BRIEF</Tag>
          <span>20 segundos</span>
        </div>
        <h2>{dailyBrief.title}</h2>
        <p>{dailyBrief.text}</p>
        <div className="daily-brief-chips">
          {dailyBrief.dueCount > 0 && <span>{dailyBrief.dueCount} pedindo continuidade</span>}
          {dailyBrief.staleCount > 0 && <span>{dailyBrief.staleCount} parados</span>}
          {dailyBrief.topArea && <span>{dailyBrief.topArea} em destaque</span>}
        </div>
      </section>

      <section className="daily-idea">
        <span aria-hidden="true">✦</span>
        <div>
          <small>UMA IDEIA PRA HOJE</small>
          <p>{advice(mood?.mood, due, active.length)}</p>
        </div>
      </section>

      <AstroTodayPreview />

      {inbox.length > 0 && (
        <section className="adaptive-callout chat-inbox-callout" onClick={() => navigate('/inbox')}>
          <div>
            <Tag tone="ink">CAIXA DO CHAT</Tag>
            <h2>{inbox.length === 1 ? 'Uma conversa esperando por você.' : inbox.length + ' conversas esperando por você.'}</h2>
            <p>Revise o que vale guardar antes de entrar no seu EU.</p>
          </div>
          <span>↗</span>
        </section>
      )}

      {review.length > 0 && (
        <section className="adaptive-callout review-callout" onClick={() => navigate('/revisao')}>
          <div>
            <Tag tone="amber">REVISÃO</Tag>
            <h2>{review.length === 1 ? 'Uma coisa pede uma resposta.' : review.length + ' coisas pedem uma resposta.'}</h2>
            <p>Continuar, concluir, pausar ou deixar pra lá. Leva poucos minutos.</p>
          </div>
          <span>↗</span>
        </section>
      )}

      {due.length > 0 && (
        <section className="today-block">
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
                  <button onClick={() => complete(record)} disabled={busyId === record.id}>Concluí</button>
                  <button onClick={() => snooze(record, 3)} disabled={busyId === record.id}>Daqui uns dias</button>
                  <button onClick={() => snooze(record, 7)} disabled={busyId === record.id}>1 semana</button>
                  <button onClick={() => snooze(record, 30)} disabled={busyId === record.id}>Mês que vem</button>
                  <button onClick={() => navigate('/registro/' + record.id)}>Abrir</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="today-block">
        <SectionTitle eyebrow="ESSA SEMANA" title="O que sua vida contou" />
        <article className="weekly-story-card">
          <div>
            <span>{story.count}</span>
            <small>registros</small>
          </div>
          <p>{story.text}</p>
          {story.topArea && <Tag tone="green">{story.topArea} apareceu mais</Tag>}
        </article>
      </section>

      {patterns.length > 0 && (
        <section className="today-block">
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

      <section className="today-block">
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

      <section className="today-block">
        <SectionTitle
          eyebrow="HOJE"
          title="O que entrou na sua vida"
          action={<button className="quiet-link" onClick={() => navigate('/memorias')}>ver tudo ↗</button>}
        />

        <div className="today-feed">
          {todayRecords.length ? todayRecords.map((record) => (
            <article className="feed-card tappable-card" key={record.id} onClick={() => navigate('/registro/' + record.id)}>
              {record.private ? (
                <>
                  <div className="feed-meta"><Tag tone="pink">privado</Tag></div>
                  <p>Registro privado</p>
                </>
              ) : (
                <>
                  <div className="feed-meta">
                    <Tag tone={typeTone(record.type)}>{record.type}</Tag>
                    <span>{record.area}</span>
                    {record.source === 'chatgpt' && <Tag tone="ink">do chat</Tag>}
                  </div>
                  <p>{record.text || 'Registro com anexo'}</p>
                  {record.status === 'active' && <small>↻ em acompanhamento</small>}
                </>
              )}
            </article>
          )) : (
            <div className="soft-empty">
              <span>✎</span>
              <p>Ainda está quieto por aqui hoje. Registre qualquer coisa do seu jeito.</p>
            </div>
          )}
        </div>
      </section>

      <section className="today-block">
        <SectionTitle
          eyebrow="SINAIS"
          title="Seus outros apps"
          action={<button className="quiet-link" onClick={() => navigate('/vida#sinais')}>ver na Vida ↗</button>}
        />
        <div className="signal-mini-grid">
          {bridges.map((card) => (
            <article key={card.id} className={'signal-mini signal-' + card.id}>
              <strong>{card.title}</strong>
              <p>{card.bridge?.summary || 'Ainda sem resumo neste aparelho.'}</p>
              <span>{card.bridge?.status || 'aguardando'}</span>
            </article>
          ))}
        </div>
      </section>

      {ecosystemInsights.length > 0 && (
        <section className="today-block">
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
        <section className="chat-receipt">
          <Tag tone="ink">CHATGPT → EU</Tag>
          <p>{chatToday.length === 1 ? '1 coisa da nossa conversa entrou no EU hoje.' : chatToday.length + ' coisas das nossas conversas entraram no EU hoje.'}</p>
          <button onClick={() => navigate('/memorias?origem=chatgpt')}>Ver do Chat ↗</button>
        </section>
      )}

      <button className="register-pill in-page-register" onClick={onRegister}>
        <span>＋</span> registrar
      </button>
    </div>
  )
}
