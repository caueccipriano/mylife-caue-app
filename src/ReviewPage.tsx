import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { reviewCandidates } from './intelligence'
import { nextFollowUpDate, updateRecord, type RecordStatus, type StoredRecord } from './storage'
import { useRecords } from './appState'
import { BrandTop, Tag, typeTone } from './v2Ui'

export default function ReviewPage() {
  const records = useRecords()
  const candidates = useMemo(() => reviewCandidates(records), [records])
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(0)
  const record = candidates[index]

  async function act(action: 'keep' | 'completed' | 'paused' | 'abandoned') {
    if (!record) return

    if (action === 'keep') {
      await updateRecord(record.id, {
        status: record.status === 'active' ? 'active' : record.status,
        followUpAt: record.status === 'active' ? nextFollowUpDate(record.followUpDays || 14) : record.followUpAt,
        lastPromptedAt: new Date().toISOString(),
      })
    } else {
      const status = action as RecordStatus
      await updateRecord(record.id, {
        status,
        journeyStage: status === 'completed' ? 'Concluído' : status === 'paused' ? 'Pausado' : 'Desisti',
        completedAt: status === 'completed' ? record.completedAt || new Date().toISOString() : undefined,
        followUpAt: undefined,
        lastPromptedAt: new Date().toISOString(),
      })
    }

    window.dispatchEvent(new Event('eu-record-saved'))
    setDone((value) => value + 1)
    setIndex((value) => value + 1)
  }

  return (
    <div className="v2-page review-page">
      <BrandTop />
      <header className="v2-hero review-hero">
        <Tag tone="amber">REVISÃO</Tag>
        <h1>Isso ainda<br />faz sentido?</h1>
        <p>Uma passada rápida por coisas que ficaram abertas ou antigas. Sem culpa: continuar, concluir, pausar e desistir são respostas válidas.</p>
      </header>

      <div className="review-progress">
        <span>{Math.min(index, candidates.length)} / {candidates.length}</span>
        <div><i style={{ width: candidates.length ? Math.min(100, (index / candidates.length) * 100) + '%' : '100%' }} /></div>
      </div>

      {record ? (
        <article className="review-card">
          <div className="feed-meta">
            <Tag tone={typeTone(record.type)}>{record.type}</Tag>
            <span>{record.area}</span>
            {record.source === 'chatgpt' && <Tag tone="ink">do chat</Tag>}
          </div>
          <h2>{record.private ? 'Registro privado' : record.text}</h2>
          <p>Último movimento: {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(new Date(record.updatedAt || record.createdAt))}</p>

          <div className="review-actions">
            <button className="keep" onClick={() => void act('keep')}>Ainda importa</button>
            <button onClick={() => void act('completed')}>Concluí</button>
            <button onClick={() => void act('paused')}>Pausar</button>
            <button className="quiet" onClick={() => void act('abandoned')}>Deixei pra lá</button>
          </div>

          <NavLink to={'/registro/' + record.id}>ver registro completo ↗</NavLink>
        </article>
      ) : (
        <section className="review-finished">
          <span>✦</span>
          <h2>{done ? 'Revisão feita.' : 'Nada pedindo revisão.'}</h2>
          <p>{done ? done + ' coisas passaram pela sua atenção. Seu EU ficou mais atual.' : 'Seu arquivo está coerente com o que você vem vivendo.'}</p>
          <NavLink to="/">Voltar para Hoje</NavLink>
        </section>
      )}
    </div>
  )
}
