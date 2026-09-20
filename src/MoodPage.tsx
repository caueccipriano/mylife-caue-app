import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { listMoodCheckins, type MoodValue } from './storage'
import { useRecords } from './appState'
import { deriveMoodInsights, moodLabel } from './uxFeatures'
import { BrandTop, SectionTitle, Tag } from './v2Ui'

const moods: Array<{ value: MoodValue; label: string; icon: string }> = [
  { value: 'animado', label: 'bem', icon: '☺' },
  { value: 'ok', label: 'ok', icon: '◡' },
  { value: 'cansado', label: 'cansado', icon: '–' },
  { value: 'pilhado', label: 'pilhado', icon: '↟' },
]

function key(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function lastDays(days = 365) {
  const result: Date[] = []
  const today = new Date()
  today.setHours(12,0,0,0)
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(date.getDate() - offset)
    result.push(date)
  }
  return result
}

export default function MoodPage() {
  const records = useRecords()
  const checkins = listMoodCheckins()
  const insights = useMemo(() => deriveMoodInsights(checkins, records), [records, checkins.length])
  const byDate = useMemo(() => new Map(checkins.map((item) => [item.date, item])), [checkins])
  const days = useMemo(() => lastDays(365), [])
  const recent = checkins.slice(-30).reverse()

  const counts = moods.map((mood) => ({
    ...mood,
    count: checkins.filter((item) => item.mood === mood.value).length,
  }))

  return (
    <div className="v2-page mood-page">
      <BrandTop />
      <NavLink className="back-v2" to="/memorias">← Memórias</NavLink>

      <header className="v2-hero mood-hero">
        <Tag tone="sky">HUMOR</Tag>
        <h1>Seu ano,<br />em pequenas cores.</h1>
        <p>Um registro leve do jeito que você chegou nos dias — sem transformar humor em nota, meta ou diagnóstico.</p>
      </header>

      <section className="mood-heatmap-card">
        <div className="mood-heatmap-head">
          <div>
            <Tag tone="cobalt">HEATMAP</Tag>
            <h2>Últimos 365 dias</h2>
          </div>
          <span>{checkins.length} check-ins no histórico</span>
        </div>

        <div className="mood-heatmap-scroll">
          <div className="mood-heatmap-grid" aria-label="Heatmap de humor dos últimos 365 dias">
            {days.map((date) => {
              const item = byDate.get(key(date))
              return (
                <div
                  key={key(date)}
                  className={'mood-day' + (item ? ' mood-day-' + item.mood : ' mood-day-empty')}
                  title={new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date) + (item ? ' · ' + moodLabel(item.mood) : ' · sem check-in')}
                />
              )
            })}
          </div>
        </div>

        <div className="mood-legend">
          <span><i className="mood-day mood-day-animado" /> bem</span>
          <span><i className="mood-day mood-day-ok" /> ok</span>
          <span><i className="mood-day mood-day-cansado" /> cansado</span>
          <span><i className="mood-day mood-day-pilhado" /> pilhado</span>
          <span><i className="mood-day mood-day-empty" /> sem registro</span>
        </div>
      </section>

      <section className="mood-insight-panel">
        <Tag tone="lilac">O EU PERCEBEU</Tag>
        <h2>{insights.text}</h2>
        <div className="mood-insight-numbers">
          <article><strong>{insights.checkins30}</strong><span>check-ins / 30 dias</span></article>
          <article><strong>{insights.checkinRate}%</strong><span>dos últimos 30 dias</span></article>
          <article><strong>{insights.dominant ? moodLabel(insights.dominant) : '—'}</strong><span>mais frequente</span></article>
        </div>
      </section>

      <section className="mood-summary-block">
        <SectionTitle eyebrow="DISTRIBUIÇÃO" title="Como os humores apareceram" />
        <div className="mood-summary-grid">
          {counts.map((item) => (
            <article key={item.value} className={'mood-summary mood-summary-' + item.value}>
              <span>{item.icon}</span>
              <strong>{item.count}</strong>
              <small>{item.label}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="mood-recent-block">
        <SectionTitle eyebrow="RECENTE" title="Últimos check-ins" />
        <div className="mood-recent-list">
          {recent.length ? recent.map((item) => (
            <article key={item.date}>
              <span className={'mood-recent-dot mood-day-' + item.mood} />
              <div>
                <strong>{moodLabel(item.mood)}</strong>
                <small>{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(item.date + 'T12:00:00'))}</small>
              </div>
            </article>
          )) : (
            <div className="soft-empty wide"><span>◌</span><p>Quando você fizer check-ins, o histórico aparece aqui.</p></div>
          )}
        </div>
      </section>
    </div>
  )
}
