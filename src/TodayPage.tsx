import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { activeFollowUps, nextFollowUpDate, saveMoodCheckin, updateRecord, type MoodValue, type StoredRecord } from './storage'
import { useBridges, useMood, useRecords } from './appState'
import { BrandTop, SectionTitle, Tag, formatShortDate, typeTone } from './v2Ui'

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
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState<string | null>(null)

  const followups = useMemo(() => activeFollowUps(records), [records])
  const due = followups.filter((item) => item.due).map((item) => item.record)
  const active = followups.map((item) => item.record)
  const todayRecords = records.filter((record) => sameLocalDay(record.createdAt)).slice(0, 8)
  const chatToday = todayRecords.filter((record) => record.source === 'chatgpt')

  async function complete(record: StoredRecord) {
    setBusyId(record.id)
    await updateRecord(record.id, { status: 'completed', completedAt: new Date().toISOString(), followUpAt: undefined })
    window.dispatchEvent(new Event('eu-record-saved'))
    setBusyId(null)
  }

  async function snooze(record: StoredRecord) {
    setBusyId(record.id)
    await updateRecord(record.id, {
      status: 'active',
      followUpAt: nextFollowUpDate(record.followUpDays || 7),
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

      <section className="daily-idea">
        <span aria-hidden="true">✦</span>
        <div>
          <small>UMA IDEIA PRA HOJE</small>
          <p>{advice(mood?.mood, due, active.length)}</p>
        </div>
      </section>

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
                  <button onClick={() => snooze(record)} disabled={busyId === record.id}>Lembrar depois</button>
                  <button onClick={() => navigate('/vida')}>Ver na Vida</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="today-block">
        <SectionTitle
          eyebrow="HOJE"
          title="O que entrou na sua vida"
          action={<button className="quiet-link" onClick={() => navigate('/memorias')}>ver tudo ↗</button>}
        />

        <div className="today-feed">
          {todayRecords.length ? todayRecords.map((record) => (
            <article className="feed-card" key={record.id}>
              <div className="feed-meta">
                <Tag tone={typeTone(record.type)}>{record.type}</Tag>
                <span>{record.area}</span>
                {record.source === 'chatgpt' && <Tag tone="ink">do chat</Tag>}
              </div>
              <p>{record.private ? 'Registro privado' : record.text || 'Registro com anexo'}</p>
              {record.status === 'active' && <small>↻ em acompanhamento</small>}
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
