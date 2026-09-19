import { type FormEvent, useMemo, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { defaultJourneyStage, deleteRecord, suggestTags, updateRecord, type RecordStatus, type StoredAttachment } from './storage'
import { useRecords } from './appState'
import { BrandTop, Tag, formatShortDate, typeTone } from './v2Ui'

const areaOptions = ['Carreira', 'Dinheiro', 'Estudos', 'Casa', 'Viagens', 'Compras', 'Lazer', 'Pessoal']
const typeOptions = ['Memória', 'Preferência', 'Desejo', 'Pesquisa', 'Curso', 'Pendência', 'Objetivo', 'Projeto', 'Decisão', 'Insight', 'Ideia', 'Marco', 'Contexto', 'Conquista']

function stagesFor(type: string) {
  const value = type.toLowerCase()
  if (value.includes('pesquisa') || value.includes('desejo')) return ['Gostei', 'Pesquisando', 'Considerando', 'Decidi', 'Comprei', 'Desisti']
  if (value.includes('curso')) return ['Quero fazer', 'Comecei', 'Em andamento', 'Concluído', 'Pausado', 'Desisti']
  if (value.includes('projeto') || value.includes('objetivo')) return ['Ideia', 'Planejando', 'Em andamento', 'Concluído', 'Pausado', 'Desisti']
  if (value.includes('pend')) return ['Preciso fazer', 'Em andamento', 'Concluído', 'Pausado', 'Desisti']
  return ['Em andamento', 'Concluído', 'Pausado', 'Desisti']
}

function statusFromStage(stage: string, current?: RecordStatus): RecordStatus | undefined {
  if (stage === 'Concluído' || stage === 'Comprei') return 'completed'
  if (stage === 'Pausado') return 'paused'
  if (stage === 'Desisti') return 'abandoned'
  if (stage === 'Em andamento' || stage === 'Comecei' || stage === 'Pesquisando' || stage === 'Considerando' || stage === 'Planejando' || stage === 'Preciso fazer') return 'active'
  return current
}

function attachmentIcon(attachment: StoredAttachment) {
  if (attachment.kind === 'photo') return '◫'
  if (attachment.kind === 'audio') return '◉'
  if (attachment.kind === 'link') return '↗'
  return '□'
}

export default function RecordDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const records = useRecords()
  const record = records.find((item) => item.id === id)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [type, setType] = useState('')
  const [area, setArea] = useState('')
  const [tagDraft, setTagDraft] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [journeyStage, setJourneyStage] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const relatedSuggestions = useMemo(() => {
    if (!record) return []
    const recordTags = new Set(record.tags ?? suggestTags(record.text, record.area, record.type))
    return records
      .filter((item) => item.id !== record.id)
      .map((item) => {
        const itemTags = item.tags ?? suggestTags(item.text, item.area, item.type)
        const overlap = itemTags.filter((tag) => recordTags.has(tag)).length
        const score = overlap * 3 + (item.area === record.area ? 2 : 0) + (item.type === record.type ? 1 : 0)
        return { item, score }
      })
      .filter(({ score, item }) => score > 1 && !(record.relatedIds ?? []).includes(item.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ item }) => item)
  }, [record, records])

  if (!record) {
    return (
      <div className="v2-page record-detail-page">
        <BrandTop />
        <div className="record-not-found">
          <Tag tone="muted">ARQUIVO</Tag>
          <h1>Esse registro não está mais aqui.</h1>
          <NavLink to="/memorias">Voltar às Memórias</NavLink>
        </div>
      </div>
    )
  }

  const actualTags = record.tags?.length ? record.tags : suggestTags(record.text, record.area, record.type)
  const stage = record.journeyStage || defaultJourneyStage(record.type, record.status)
  const related = records.filter((item) => (record.relatedIds ?? []).includes(item.id))

  function beginEdit() {
    setText(record.text)
    setType(record.type)
    setArea(record.area)
    setTags(actualTags)
    setJourneyStage(stage)
    setEditing(true)
    setMessage('')
  }

  function addTag() {
    const value = tagDraft.trim().toLowerCase().replace(/^#/, '')
    if (!value || tags.includes(value)) return
    setTags((current) => [...current, value].slice(0, 12))
    setTagDraft('')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!text.trim() || saving) return

    setSaving(true)
    try {
      const nextStatus = statusFromStage(journeyStage, record.status)
      await updateRecord(record.id, {
        text: text.trim(),
        type,
        area,
        tags,
        journeyStage,
        status: nextStatus,
        completedAt: nextStatus === 'completed' ? record.completedAt || new Date().toISOString() : undefined,
        followUpAt: nextStatus === 'active' ? record.followUpAt : undefined,
      })
      window.dispatchEvent(new Event('eu-record-saved'))
      setEditing(false)
      setMessage('Atualizado.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleFlag(flag: 'favorite' | 'pinned' | 'private') {
    await updateRecord(record.id, { [flag]: !record[flag] })
    window.dispatchEvent(new Event('eu-record-saved'))
  }

  async function setStatus(status: RecordStatus) {
    await updateRecord(record.id, {
      status,
      journeyStage: status === 'completed' ? 'Concluído' : status === 'paused' ? 'Pausado' : status === 'abandoned' ? 'Desisti' : stage,
      completedAt: status === 'completed' ? record.completedAt || new Date().toISOString() : undefined,
      followUpAt: status === 'active' ? record.followUpAt : undefined,
    })
    window.dispatchEvent(new Event('eu-record-saved'))
  }

  async function connect(otherId: string) {
    const other = records.find((item) => item.id === otherId)
    if (!other) return

    await updateRecord(record.id, { relatedIds: [...new Set([...(record.relatedIds ?? []), otherId])] })
    await updateRecord(other.id, { relatedIds: [...new Set([...(other.relatedIds ?? []), record.id])] })
    window.dispatchEvent(new Event('eu-record-saved'))
  }

  async function disconnect(otherId: string) {
    const other = records.find((item) => item.id === otherId)
    await updateRecord(record.id, { relatedIds: (record.relatedIds ?? []).filter((value) => value !== otherId) })
    if (other) {
      await updateRecord(other.id, { relatedIds: (other.relatedIds ?? []).filter((value) => value !== record.id) })
    }
    window.dispatchEvent(new Event('eu-record-saved'))
  }

  async function remove() {
    if (!window.confirm('Excluir este registro do EU? Essa ação não pode ser desfeita.')) return
    await deleteRecord(record.id)
    window.dispatchEvent(new Event('eu-record-saved'))
    navigate('/memorias')
  }

  function openAttachment(attachment: StoredAttachment) {
    if (attachment.url) {
      window.open(attachment.url, '_blank', 'noopener,noreferrer')
      return
    }
    if (attachment.blob) {
      const url = URL.createObjectURL(attachment.blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    }
  }

  return (
    <div className="v2-page record-detail-page">
      <BrandTop />
      <button className="back-button-v2" onClick={() => navigate(-1)}>← voltar</button>

      {!editing ? (
        <>
          <header className="record-detail-hero">
            <div className="feed-meta">
              <Tag tone={typeTone(record.type)}>{record.type}</Tag>
              <span>{record.area}</span>
              {record.source === 'chatgpt' && <Tag tone="ink">do chat</Tag>}
              {record.private && <Tag tone="pink">privado</Tag>}
            </div>
            <h1>{record.text || 'Registro com anexo'}</h1>
            <p>{formatShortDate(record.createdAt)}{record.updatedAt && record.updatedAt !== record.createdAt ? ' · editado' : ''}</p>
          </header>

          <div className="record-actions-row">
            <button onClick={beginEdit}>Editar</button>
            <button className={record.favorite ? 'active' : ''} onClick={() => void toggleFlag('favorite')}>{record.favorite ? '♥ Favorito' : '♡ Favoritar'}</button>
            <button className={record.pinned ? 'active' : ''} onClick={() => void toggleFlag('pinned')}>{record.pinned ? '⌖ Fixado' : '⌖ Fixar'}</button>
            <button className={record.private ? 'active' : ''} onClick={() => void toggleFlag('private')}>{record.private ? '◉ Privado' : '○ Privado'}</button>
          </div>

          {stage && (
            <section className="record-journey">
              <Tag tone="coral">JORNADA</Tag>
              <h2>{stage}</h2>
              <div className="journey-steps">
                {stagesFor(record.type).map((item) => <span key={item} className={item === stage ? 'active' : ''}>{item}</span>)}
              </div>
              <div className="journey-actions">
                {record.status !== 'completed' && <button onClick={() => void setStatus('completed')}>Concluir</button>}
                {record.status !== 'paused' && <button onClick={() => void setStatus('paused')}>Pausar</button>}
                {record.status !== 'abandoned' && <button onClick={() => void setStatus('abandoned')}>Desisti</button>}
                {(record.status === 'paused' || record.status === 'abandoned') && <button onClick={() => void setStatus('active')}>Retomar</button>}
              </div>
            </section>
          )}

          <section className="record-belongs">
            <Tag tone="amber">ISSO FAZ PARTE DE…</Tag>
            <div className="belongs-chips">
              <span>{record.area}</span>
              {actualTags.map((tag) => <span key={tag}>#{tag}</span>)}
              {record.source === 'chatgpt' && <span>Do Chat</span>}
              {record.status === 'active' && <span>Em movimento</span>}
            </div>
          </section>

          {(record.attachments ?? []).length > 0 && (
            <section className="record-section">
              <Tag tone="muted">ANEXOS</Tag>
              <div className="record-attachments">
                {(record.attachments ?? []).map((attachment) => (
                  <button key={attachment.id} onClick={() => openAttachment(attachment)}>
                    <span>{attachmentIcon(attachment)}</span>
                    <div><strong>{attachment.name}</strong><small>{attachment.kind}</small></div>
                    <b>↗</b>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="record-section">
            <div className="record-section-heading">
              <div><Tag tone="green">CONEXÕES</Tag><h2>Relacionado a</h2></div>
            </div>

            <div className="connection-list">
              {related.map((item) => (
                <article key={item.id}>
                  <NavLink to={'/registro/' + item.id}>
                    <Tag tone={typeTone(item.type)}>{item.type}</Tag>
                    <p>{item.private ? 'Registro privado' : item.text}</p>
                  </NavLink>
                  <button onClick={() => void disconnect(item.id)}>×</button>
                </article>
              ))}
              {!related.length && <p className="muted-copy">Nenhuma conexão confirmada ainda.</p>}
            </div>

            {relatedSuggestions.length > 0 && (
              <div className="connection-suggestions">
                <small>O EU acha que também pode ter relação:</small>
                {relatedSuggestions.map((item) => (
                  <button key={item.id} onClick={() => void connect(item.id)}>
                    <span>＋</span>
                    <div><strong>{item.type} · {item.area}</strong><p>{item.private ? 'Registro privado' : item.text}</p></div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <button className="delete-record-button" onClick={() => void remove()}>Excluir registro</button>
          {message && <p className="record-message">{message}</p>}
        </>
      ) : (
        <form className="record-edit-form" onSubmit={save}>
          <Tag tone="coral">EDITAR REGISTRO</Tag>
          <h1>Ajuste do seu jeito.</h1>

          <label>
            Texto
            <textarea value={text} onChange={(event) => setText(event.target.value)} rows={6} />
          </label>

          <div className="record-edit-grid">
            <label>
              Tipo
              <select value={type} onChange={(event) => setType(event.target.value)}>
                {typeOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Área
              <select value={area} onChange={(event) => setArea(event.target.value)}>
                {areaOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <label>
            Etapa
            <select value={journeyStage} onChange={(event) => setJourneyStage(event.target.value)}>
              {stagesFor(type).map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <div className="tag-editor">
            <span>Tags</span>
            <div className="editable-tags">
              {tags.map((tag) => (
                <button type="button" key={tag} onClick={() => setTags((current) => current.filter((item) => item !== tag))}>#{tag} ×</button>
              ))}
            </div>
            <div className="tag-add-row">
              <input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} placeholder="nova tag" onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addTag()
                }
              }} />
              <button type="button" onClick={addTag}>Adicionar</button>
            </div>
          </div>

          <div className="record-edit-actions">
            <button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</button>
            <button type="button" onClick={() => setEditing(false)}>Cancelar</button>
          </div>
        </form>
      )}
    </div>
  )
}
