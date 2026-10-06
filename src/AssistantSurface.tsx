import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { derivePatterns } from './intelligence'
import { deriveCrossSignals } from './lifeOSIntelligence'
import { deriveWeeklyDigest } from './uxFeatures'
import { isRecordVisibleForInsights, type MoodCheckin, type StoredRecord } from './storage'
import { EuIcon, Tag, typeTone } from './v2Ui'

function short(value: string, size = 92) {
  const clean = value.trim()
  return clean.length > size ? clean.slice(0, size - 1).trimEnd() + '…' : clean
}

function when(value: string) {
  const date = new Date(value)
  const now = new Date()
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  if (sameDay) return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date)
}

export default function AssistantSurface({ records, moods }: { records: StoredRecord[]; moods: MoodCheckin[] }) {
  const weekly = useMemo(() => deriveWeeklyDigest(records, moods), [records, moods])
  const noticed = useMemo(() => {
    const patterns = derivePatterns(records).slice(0, 2).map((item) => ({
      id: 'pattern:' + item.id,
      title: item.title,
      detail: item.detail,
      tone: item.tone,
    }))
    const cross = deriveCrossSignals(records).slice(0, 1).map((item) => ({
      id: 'cross:' + item.id,
      title: item.title,
      detail: item.detail,
      tone: 'cobalt' as const,
    }))
    return [...patterns, ...cross].slice(0, 3)
  }, [records])

  const timeline = useMemo(() => records
    .filter(isRecordVisibleForInsights)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 5), [records])

  return (
    <section className="assistant-surface now-only" aria-label="Leitura viva do EU">
      <header className="assistant-surface-head">
        <div>
          <small>EU · EM MOVIMENTO</small>
          <h2>O que está acontecendo<br />sem você procurar.</h2>
        </div>
        <NavLink to="/?view=signals">ver sinais <EuIcon name="arrow-up-right" /></NavLink>
      </header>

      <div className="assistant-surface-grid">
        <article className="eu-noticed-v32">
          <div className="assistant-card-top">
            <span className="assistant-card-icon noticed"><EuIcon name="sparkles" /></span>
            <div><small>EU PERCEBEU</small><strong>{noticed.length ? 'Alguns padrões estão se formando.' : 'Nada precisa virar padrão ainda.'}</strong></div>
          </div>

          <div className="noticed-list-v32">
            {noticed.length ? noticed.map((item, index) => (
              <div className="noticed-row-v32" key={item.id}>
                <span className={'noticed-index tone-' + item.tone}>{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{item.title}</strong><p>{item.detail}</p></div>
              </div>
            )) : (
              <div className="noticed-soft-empty"><p>O EU continua observando sem transformar pouca evidência em conclusão.</p></div>
            )}
          </div>
        </article>

        <article className="weekly-brief-v32">
          <div className="assistant-card-top">
            <span className="assistant-card-icon week"><EuIcon name="sun" /></span>
            <div><small>SUA SEMANA</small><strong>{weekly.text}</strong></div>
          </div>

          <div className="weekly-metrics-v32">
            <span><b>{weekly.records}</b><small>entraram</small></span>
            <span><b>{weekly.completed}</b><small>fecharam</small></span>
            <span><b>{weekly.decisions}</b><small>decisões</small></span>
          </div>

          <div className="weekly-context-v32">
            {weekly.topArea && <Tag tone="green">{weekly.topArea}</Tag>}
            {weekly.mood && <Tag tone="lilac">humor: {weekly.mood === 'animado' ? 'bem' : weekly.mood}</Tag>}
          </div>
        </article>
      </div>

      <article className="life-thread-v32">
        <div className="life-thread-head-v32">
          <div>
            <small>SEU FIO</small>
            <strong>Sua vida continua daqui.</strong>
          </div>
          <NavLink to="/memorias?mode=timeline">linha do tempo <EuIcon name="arrow-up-right" /></NavLink>
        </div>

        <div className="life-thread-track-v32">
          {timeline.map((record, index) => (
            <NavLink key={record.id} to={'/registro/' + record.id} className="life-thread-item-v32">
              <span className="life-thread-rail-v32"><i /><em>{index === timeline.length - 1 ? '' : ''}</em></span>
              <div className="life-thread-time-v32">{when(record.updatedAt || record.createdAt)}</div>
              <div className="life-thread-copy-v32">
                <div><Tag tone={typeTone(record.type)}>{record.type}</Tag><small>{record.area}</small></div>
                <strong>{short(record.text || 'Registro com anexo')}</strong>
              </div>
              <EuIcon name="arrow-up-right" />
            </NavLink>
          ))}
          {!timeline.length && <div className="noticed-soft-empty"><p>Seu fio aparece quando os primeiros registros entrarem.</p></div>}
        </div>
      </article>
    </section>
  )
}
