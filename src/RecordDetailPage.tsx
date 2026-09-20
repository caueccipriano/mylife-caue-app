import { type FormEvent, useMemo, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { defaultJourneyStage, deleteRecord, nextFollowUpDate, suggestTags, updateRecord, type ObjectState, type RecordFreshness, type RecordOutcome, type RecordProgress, type RecordStatus, type StoredAttachment } from './storage'
import { hasPrivacyPin, isPrivateUnlocked, unlockPrivateRecords } from './privacy'
import { useBridges, useRecords } from './appState'
import { BrandTop, EuIcon, Tag, formatShortDate, sourceLabel, sourceTone, typeTone, type EuIconName } from './v2Ui'
import { crossAppHint } from './uxFeatures'

const areaOptions = ['Carreira', 'Dinheiro', 'Estudos', 'Casa', 'Viagens', 'Compras', 'Lazer', 'Pessoal']
const typeOptions = ['Memória', 'Preferência', 'Desejo', 'Pesquisa', 'Curso', 'Pendência', 'Objetivo', 'Projeto', 'Decisão', 'Insight', 'Ideia', 'Marco', 'Contexto', 'Conquista', 'Depois', 'Cápsula', 'Objeto']

function stagesFor(type: string) {
  const value = type.toLowerCase()
  if (value.includes('pesquisa') || value.includes('desejo')) return ['Gostei', 'Pesquisando', 'Considerando', 'Decidi', 'Comprei', 'Desisti']
  if (value.includes('curso')) return ['Quero fazer', 'Comecei', 'Em andamento', 'Concluído', 'Pausado', 'Desisti']
  if (value.includes('projeto') || value.includes('objetivo')) return ['Ideia', 'Planejando', 'Em andamento', 'Concluído', 'Pausado', 'Desisti']
  if (value.includes('pend')) return ['Preciso fazer', 'Em andamento', 'Concluído', 'Pausado', 'Desisti']
  if (value.includes('depois')) return ['Depois', 'Planejando', 'Em andamento', 'Concluído', 'Desisti']
  return ['Em andamento', 'Concluído', 'Pausado', 'Desisti']
}

function statusFromStage(stage: string, current?: RecordStatus): RecordStatus | undefined {
  if (stage === 'Concluído' || stage === 'Comprei') return 'completed'
  if (stage === 'Pausado') return 'paused'
  if (stage === 'Desisti') return 'abandoned'
  if (stage === 'Em andamento' || stage === 'Comecei' || stage === 'Pesquisando' || stage === 'Considerando' || stage === 'Planejando' || stage === 'Preciso fazer') return 'active'
  return current
}

function attachmentIcon(attachment: StoredAttachment): EuIconName {
  if (attachment.kind === 'photo') return 'image'
  if (attachment.kind === 'audio') return 'mic'
  if (attachment.kind === 'link') return 'link'
  return 'file'
}

export default function RecordDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const records = useRecords()
  const { bridges } = useBridges()
  const record = records.find((item) => item.id === id)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [type, setType] = useState('')
  const [area, setArea] = useState('')
  const [tagDraft, setTagDraft] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [journeyStage, setJourneyStage] = useState('')
  const [followUpDays, setFollowUpDays] = useState(7)
  const [whyItMatters, setWhyItMatters] = useState('')
  const [freshness, setFreshness] = useState<RecordFreshness>('current')
  const [progressLevel, setProgressLevel] = useState<RecordProgress | ''>('')
  const [nextMove, setNextMove] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [expectation, setExpectation] = useState('')
  const [confidence, setConfidence] = useState(70)
  const [objectName, setObjectName] = useState('')
  const [objectState, setObjectState] = useState<ObjectState>('researching')
  const [place, setPlace] = useState('')
  const [editAttachments, setEditAttachments] = useState<StoredAttachment[]>([])
  const [favorite, setFavorite] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [directStatus, setDirectStatus] = useState<RecordStatus | ''>('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [privacyUnlocked, setPrivacyUnlocked] = useState(() => isPrivateUnlocked())
  const [privacyPin, setPrivacyPin] = useState('')
  const [privacyError, setPrivacyError] = useState('')

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

  const currentRecord = record
  const capsuleLocked = Boolean(
    currentRecord.revealAt
    && !currentRecord.capsuleOpenedAt
    && new Date(currentRecord.revealAt).getTime() > Date.now(),
  )

  if (capsuleLocked) {
    return (
      <div className="v2-page record-detail-page">
        <BrandTop />
        <button className="back-button-v2" onClick={() => navigate(-1)}><EuIcon name="arrow-left" />voltar</button>
        <section className="capsule-lock-screen">
          <Tag tone="lilac">CÁPSULA FECHADA</Tag>
          <span><EuIcon name="clock" /></span>
          <h1>Isso é para você do futuro.</h1>
          <p>O conteúdo fica escondido até {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(currentRecord.revealAt as string))}.</p>
          <NavLink to="/vida/lab">Ver suas cápsulas</NavLink>
        </section>
      </div>
    )
  }

  if (currentRecord.private && hasPrivacyPin() && !privacyUnlocked) {
    async function unlock() {
      const valid = await unlockPrivateRecords(privacyPin)
      if (!valid) {
        setPrivacyError('PIN incorreto.')
        return
      }
      setPrivacyUnlocked(true)
      setPrivacyPin('')
      setPrivacyError('')
    }

    return (
      <div className="v2-page record-detail-page">
        <BrandTop />
        <button className="back-button-v2" onClick={() => navigate(-1)}><EuIcon name="arrow-left" />voltar</button>
        <section className="private-lock-screen">
          <Tag tone="pink">PRIVADO</Tag>
          <span><EuIcon name="lock" /></span>
          <h1>Esse registro está trancado.</h1>
          <p>Digite seu PIN local para abrir nesta sessão.</p>
          <div>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={privacyPin}
              onChange={(event) => setPrivacyPin(event.target.value.replace(/\D/g, ''))}
              placeholder="PIN"
              onKeyDown={(event) => {
                if (event.key === 'Enter') void unlock()
              }}
            />
            <button onClick={() => void unlock()} disabled={privacyPin.length < 4}>Abrir</button>
          </div>
          {privacyError && <small>{privacyError}</small>}
        </section>
      </div>
    )
  }

  const actualTags = currentRecord.tags?.length ? currentRecord.tags : suggestTags(currentRecord.text, currentRecord.area, currentRecord.type)
  const stage = currentRecord.journeyStage || defaultJourneyStage(currentRecord.type, currentRecord.status)
  const related = records.filter((item) => (currentRecord.relatedIds ?? []).includes(item.id))
  const appHint = crossAppHint(currentRecord.area)
  const linkedApp = appHint ? bridges.find((card) => card.id === appHint.id) : null
  const quickTags = [
    currentRecord.area === 'Compras' ? 'comprar' : null,
    currentRecord.area === 'Estudos' ? 'estudar' : null,
    currentRecord.area === 'Carreira' ? 'carreira' : null,
    currentRecord.type === 'Decisão' ? 'decidir' : null,
    currentRecord.type === 'Pesquisa' ? 'pesquisando' : null,
    'importante',
    'lembrar',
  ].filter((tag): tag is string => Boolean(tag)).filter((tag, index, all) => all.indexOf(tag) === index).slice(0, 5)

  function beginEdit() {
    setText(currentRecord.text)
    setType(currentRecord.type)
    setArea(currentRecord.area)
    setTags(actualTags)
    setJourneyStage(stage)
    setFollowUpDays(currentRecord.followUpDays || 7)
    setWhyItMatters(currentRecord.whyItMatters || '')
    setFreshness(currentRecord.freshness || 'current')
    setProgressLevel(currentRecord.progressLevel || '')
    setNextMove(currentRecord.nextMove || '')
    setChapterId(currentRecord.chapterId || '')
    setExpectation(currentRecord.expectation || '')
    setConfidence(currentRecord.confidence ?? 70)
    setObjectName(currentRecord.objectName || '')
    setObjectState(currentRecord.objectState || 'researching')
    setPlace(currentRecord.place || '')
    setEditAttachments(currentRecord.attachments ?? [])
    setFavorite(Boolean(currentRecord.favorite))
    setPinned(Boolean(currentRecord.pinned))
    setIsPrivate(Boolean(currentRecord.private))
    setDirectStatus(currentRecord.status || '')
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
      const nextStatus = directStatus || statusFromStage(journeyStage, currentRecord.status)
      await updateRecord(currentRecord.id, {
        text: text.trim(),
        type,
        area,
        tags,
        journeyStage,
        status: nextStatus,
        whyItMatters: whyItMatters.trim() || undefined,
        freshness,
        progressLevel: progressLevel || undefined,
        nextMove: nextMove.trim() || undefined,
        chapterId: chapterId.trim() || undefined,
        expectation: expectation.trim() || undefined,
        confidence: type === 'Decisão' ? confidence : currentRecord.confidence,
        objectName: objectName.trim() || undefined,
        objectState: (area === 'Compras' || type === 'Objeto') ? objectState : currentRecord.objectState,
        place: place.trim() || undefined,
        completedAt: nextStatus === 'completed' ? currentRecord.completedAt || new Date().toISOString() : undefined,
        followUpDays: nextStatus === 'active' ? followUpDays : undefined,
        followUpAt: nextStatus === 'active'
          ? nextFollowUpDate(followUpDays)
          : undefined,
        attachments: editAttachments,
        favorite,
        pinned,
        private: isPrivate,
      })
      window.dispatchEvent(new Event('eu-record-saved'))
      setEditing(false)
      setMessage('Atualizado.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleFlag(flag: 'favorite' | 'pinned' | 'private') {
    await updateRecord(currentRecord.id, { [flag]: !currentRecord[flag] })
    window.dispatchEvent(new Event('eu-record-saved'))
  }

  async function toggleQuickTag(tag: string) {
    const currentTags = currentRecord.tags?.length ? currentRecord.tags : suggestTags(currentRecord.text, currentRecord.area, currentRecord.type)
    const next = currentTags.includes(tag)
      ? currentTags.filter((item) => item !== tag)
      : [...currentTags, tag].slice(0, 12)
    await updateRecord(currentRecord.id, { tags: next })
    window.dispatchEvent(new Event('eu-record-saved'))
  }

  async function setStatus(status: RecordStatus) {
    await updateRecord(currentRecord.id, {
      status,
      journeyStage: status === 'completed' ? 'Concluído' : status === 'paused' ? 'Pausado' : status === 'abandoned' ? 'Desisti' : stage,
      progressLevel: status === 'completed' && currentRecord.type === 'Curso' ? 'done' : currentRecord.progressLevel,
      completedAt: status === 'completed' ? currentRecord.completedAt || new Date().toISOString() : undefined,
      followUpAt: status === 'active' ? currentRecord.followUpAt : undefined,
    })
    window.dispatchEvent(new Event('eu-record-saved'))
  }

  async function connect(otherId: string) {
    const other = records.find((item) => item.id === otherId)
    if (!other) return

    await updateRecord(currentRecord.id, { relatedIds: [...new Set([...(currentRecord.relatedIds ?? []), otherId])] })
    await updateRecord(other.id, { relatedIds: [...new Set([...(other.relatedIds ?? []), currentRecord.id])] })
    window.dispatchEvent(new Event('eu-record-saved'))
  }

  async function disconnect(otherId: string) {
    const other = records.find((item) => item.id === otherId)
    await updateRecord(currentRecord.id, { relatedIds: (currentRecord.relatedIds ?? []).filter((value) => value !== otherId) })
    if (other) {
      await updateRecord(other.id, { relatedIds: (other.relatedIds ?? []).filter((value) => value !== currentRecord.id) })
    }
    window.dispatchEvent(new Event('eu-record-saved'))
  }

  async function remove() {
    if (!window.confirm('Mover este registro para a Lixeira? Você poderá restaurá-lo por 30 dias.')) return
    await deleteRecord(currentRecord.id)
    window.dispatchEvent(new Event('eu-record-saved'))
    navigate('/memorias')
  }

  async function setOutcome(outcome: RecordOutcome) {
    await updateRecord(currentRecord.id, {
      outcome,
      outcomeAt: new Date().toISOString(),
    })
    window.dispatchEvent(new Event('eu-record-saved'))
  }

  async function setCourseProgress(progressLevel: RecordProgress) {
    await updateRecord(currentRecord.id, {
      progressLevel,
      status: progressLevel === 'done' ? 'completed' : 'active',
      journeyStage: progressLevel === 'done' ? 'Concluído' : 'Em andamento',
      completedAt: progressLevel === 'done' ? currentRecord.completedAt || new Date().toISOString() : undefined,
    })
    window.dispatchEvent(new Event('eu-record-saved'))
  }

  async function setObjectStateQuick(objectState: ObjectState) {
    await updateRecord(currentRecord.id, {
      objectState,
      journeyStage: objectState === 'bought' || objectState === 'using' ? 'Comprei' : currentRecord.journeyStage,
      status: objectState === 'sold' || objectState === 'replaced' ? 'completed' : currentRecord.status,
    })
    window.dispatchEvent(new Event('eu-record-saved'))
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
      <button className="back-button-v2" onClick={() => navigate(-1)}><EuIcon name="arrow-left" />voltar</button>

      {!editing ? (
        <>
          <header className="record-detail-hero">
            <div className="record-detail-kicker">
              <div className="feed-meta">
              <Tag tone={typeTone(currentRecord.type)}>{currentRecord.type}</Tag>
              <span>{currentRecord.area}</span>
              <Tag tone={sourceTone(currentRecord.source)}>{sourceLabel(currentRecord.source)}</Tag>
              {currentRecord.private && <Tag tone="pink">privado</Tag>}
              {currentRecord.freshness === 'maybe-stale' && <Tag tone="amber">pode ter mudado</Tag>}
              {currentRecord.freshness === 'historical' && <Tag tone="muted">histórico</Tag>}
              </div>
              <button className="record-inline-edit" onClick={beginEdit}><EuIcon name="edit" />Editar tudo</button>
            </div>
            <h1 className={
              currentRecord.text.length > 170 ? 'record-title record-title-xlong'
              : currentRecord.text.length > 100 ? 'record-title record-title-long'
              : currentRecord.text.length > 55 ? 'record-title record-title-medium'
              : 'record-title record-title-short'
            }>{currentRecord.text || 'Registro com anexo'}</h1>
            <p>{formatShortDate(currentRecord.createdAt)}{currentRecord.updatedAt && currentRecord.updatedAt !== currentRecord.createdAt ? ' · editado' : ''}</p>
          </header>

          <div className="record-actions-row">
            <button onClick={beginEdit}><EuIcon name="edit" />Editar tudo</button>
            <button className={currentRecord.favorite ? 'active' : ''} onClick={() => void toggleFlag('favorite')}><EuIcon name="heart" />{currentRecord.favorite ? 'Favorito' : 'Favoritar'}</button>
            <button className={currentRecord.pinned ? 'active' : ''} onClick={() => void toggleFlag('pinned')}><EuIcon name="pin" />{currentRecord.pinned ? 'Fixado' : 'Fixar'}</button>
            <button className={currentRecord.private ? 'active' : ''} onClick={() => void toggleFlag('private')}><EuIcon name="lock" />{currentRecord.private ? 'Privado' : 'Privado'}</button>
          </div>

          <section className="record-quick-organize">
            <div>
              <small>TAGS RÁPIDAS</small>
              <span>um toque pra organizar</span>
            </div>
            <div className="quick-tag-row">
              {quickTags.map((tag) => (
                <button key={tag} className={actualTags.includes(tag) ? 'active' : ''} onClick={() => void toggleQuickTag(tag)}>#{tag}</button>
              ))}
            </div>
          </section>

          {linkedApp && linkedApp.bridge && (
            <a className={'record-cross-app cross-app-' + linkedApp.id} href={linkedApp.href} target="_blank" rel="noopener noreferrer">
              <div>
                <Tag tone={linkedApp.id === 'folego' ? 'green' : linkedApp.id === 'traco' ? 'cobalt' : 'amber'}>OUTRO APP</Tag>
                <strong>Isso também conversa com {linkedApp.title}.</strong>
                <p>{linkedApp.bridge.summary || linkedApp.description}</p>
              </div>
              <span className="record-cross-app-arrow"><EuIcon name="arrow-up-right" /></span>
            </a>
          )}

          {currentRecord.whyItMatters && (
            <section className="record-context-card why-card">
              <Tag tone="lilac">POR QUE ISSO IMPORTA</Tag>
              <p>{currentRecord.whyItMatters}</p>
            </section>
          )}

          {currentRecord.type === 'Decisão' && (currentRecord.expectation || currentRecord.confidence != null) && (
            <section className="record-context-card decision-context-card">
              <Tag tone="wine">ANTES DO RESULTADO</Tag>
              {currentRecord.expectation && <p>{currentRecord.expectation}</p>}
              {currentRecord.confidence != null && <strong>{currentRecord.confidence}% de confiança quando decidiu</strong>}
            </section>
          )}

          {(currentRecord.objectName || currentRecord.area === 'Compras') && (
            <section className="record-context-card object-context-card">
              <Tag tone="pink">OBJETO COM HISTÓRIA</Tag>
              <h2>{currentRecord.objectName || currentRecord.text}</h2>
              <p>{currentRecord.objectState === 'bought' ? 'Comprado' : currentRecord.objectState === 'using' ? 'Em uso' : currentRecord.objectState === 'sold' ? 'Vendido' : currentRecord.objectState === 'replaced' ? 'Substituído' : 'Pesquisando'}</p>
              <div className="object-state-row">
                {[
                  ['researching','Pesquisando'],
                  ['bought','Comprei'],
                  ['using','Uso'],
                  ['sold','Vendi'],
                  ['replaced','Troquei'],
                ].map(([value,label]) => (
                  <button key={value} className={currentRecord.objectState === value ? 'active' : ''} onClick={() => void setObjectStateQuick(value as ObjectState)}>{label}</button>
                ))}
              </div>
            </section>
          )}

          {currentRecord.place && (
            <section className="record-context-card place-context-card">
              <Tag tone="sky">LUGAR</Tag>
              <h2>{currentRecord.place}</h2>
              <p>Esse lugar passa a fazer parte do seu mapa pessoal no EU.</p>
            </section>
          )}

          {currentRecord.type === 'Curso' && (
            <section className="record-context-card progress-card">
              <Tag tone="lime">PROGRESSO LEVE</Tag>
              <h2>{currentRecord.progressLevel === 'done' ? 'Concluído' : currentRecord.progressLevel === 'almost' ? 'Quase terminando' : currentRecord.progressLevel === 'half' ? 'Na metade' : currentRecord.progressLevel === 'quarter' ? 'Pegando ritmo' : 'Começou'}</h2>
              <div className="progress-choice-row">
                {[
                  ['started','Comecei'],
                  ['quarter','25%'],
                  ['half','Metade'],
                  ['almost','Quase lá'],
                  ['done','Concluí'],
                ].map(([value,label]) => (
                  <button key={value} className={currentRecord.progressLevel === value ? 'active' : ''} onClick={() => void setCourseProgress(value as RecordProgress)}>{label}</button>
                ))}
              </div>
            </section>
          )}

          {(currentRecord.type === 'Projeto' || currentRecord.type === 'Objetivo' || currentRecord.type === 'Pendência') && (
            <section className="record-context-card next-move-card">
              <Tag tone="coral">PRÓXIMO MOVIMENTO</Tag>
              <h2>{currentRecord.nextMove || 'Ainda não definido.'}</h2>
              <button onClick={beginEdit}>{currentRecord.nextMove ? 'mudar próximo movimento' : 'definir o que destrava isso'} <EuIcon name="arrow-up-right" /></button>
            </section>
          )}

          {(currentRecord.type === 'Decisão' || currentRecord.journeyStage === 'Comprei' || currentRecord.status === 'completed') && (
            <section className="record-context-card outcome-card">
              <Tag tone="wine">COMO ISSO SAIU?</Tag>
              <h2>{currentRecord.outcome === 'good' ? 'Valeu a pena.' : currentRecord.outcome === 'mixed' ? 'Mais ou menos.' : currentRecord.outcome === 'regret' ? 'Eu faria diferente.' : currentRecord.outcome === 'unknown' ? 'Ainda não sei.' : 'O EU pode voltar nisso depois.'}</h2>
              <div className="outcome-choice-row">
                <button className={currentRecord.outcome === 'good' ? 'active' : ''} onClick={() => void setOutcome('good')}>Foi uma boa escolha</button>
                <button className={currentRecord.outcome === 'mixed' ? 'active' : ''} onClick={() => void setOutcome('mixed')}>Mais ou menos</button>
                <button className={currentRecord.outcome === 'regret' ? 'active' : ''} onClick={() => void setOutcome('regret')}>Me arrependi</button>
                <button className={currentRecord.outcome === 'unknown' ? 'active' : ''} onClick={() => void setOutcome('unknown')}>Ainda não sei</button>
              </div>
            </section>
          )}

          {stage && currentRecord.type !== 'Cápsula' && (
            <section className="record-journey">
              <Tag tone="coral">JORNADA</Tag>
              <h2>{stage}</h2>
              <div className="journey-steps">
                {stagesFor(currentRecord.type).map((item) => <span key={item} className={item === stage ? 'active' : ''}>{item}</span>)}
              </div>
              <div className="journey-actions">
                {currentRecord.status !== 'completed' && <button onClick={() => void setStatus('completed')}>Concluir</button>}
                {currentRecord.status !== 'paused' && <button onClick={() => void setStatus('paused')}>Pausar</button>}
                {currentRecord.status !== 'abandoned' && <button onClick={() => void setStatus('abandoned')}>Desisti</button>}
                {(currentRecord.status === 'paused' || currentRecord.status === 'abandoned') && <button onClick={() => void setStatus('active')}>Retomar</button>}
              </div>
            </section>
          )}

          <section className="record-belongs">
            <Tag tone="amber">ISSO FAZ PARTE DE…</Tag>
            <div className="belongs-chips">
              <span>{currentRecord.area}</span>
              {actualTags.map((tag) => <span key={tag}>#{tag}</span>)}
              {currentRecord.source === 'chatgpt' && <span>Do Chat</span>}
              {currentRecord.status === 'active' && <span>Em movimento</span>}
            </div>
          </section>

          {(currentRecord.attachments ?? []).length > 0 && (
            <section className="record-section">
              <Tag tone="muted">ANEXOS</Tag>
              <div className="record-attachments">
                {(currentRecord.attachments ?? []).map((attachment) => (
                  <button key={attachment.id} onClick={() => openAttachment(attachment)}>
                    <span><EuIcon name={attachmentIcon(attachment)} /></span>
                    <div><strong>{attachment.name}</strong><small>{attachment.kind}</small></div>
                    <b><EuIcon name="arrow-up-right" /></b>
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
                  <button aria-label="Desconectar registro" onClick={() => void disconnect(item.id)}><EuIcon name="x" /></button>
                </article>
              ))}
              {!related.length && <p className="muted-copy">Nenhuma conexão confirmada ainda.</p>}
            </div>

            {relatedSuggestions.length > 0 && (
              <div className="connection-suggestions">
                <small>O EU acha que também pode ter relação:</small>
                {relatedSuggestions.map((item) => (
                  <button key={item.id} onClick={() => void connect(item.id)}>
                    <span><EuIcon name="plus" /></span>
                    <div><strong>{item.type} · {item.area}</strong><p>{item.private ? 'Registro privado' : item.text}</p></div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {(currentRecord.revisions ?? []).length > 0 && (
            <section className="record-section revision-history">
              <Tag tone="cobalt">HISTÓRICO</Tag>
              <h2>Como esse registro mudou</h2>
              <div>
                {[...(currentRecord.revisions ?? [])].reverse().slice(0, 8).map((revision, index) => (
                  <article key={revision.at + index}>
                    <span>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(revision.at))}</span>
                    <p>{revision.text}</p>
                    <small>{revision.type} · {revision.area}{revision.journeyStage ? ' · ' + revision.journeyStage : ''}</small>
                  </article>
                ))}
              </div>
            </section>
          )}

          <button className="delete-record-button" onClick={() => void remove()}><EuIcon name="x" />Mover para a Lixeira</button>
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
                {[...new Set([currentRecord.area, ...areaOptions])].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <section className="record-edit-organize">
            <div>
              <span>Organização</span>
              <small>Você pode mudar tudo isso depois.</small>
            </div>
            <div className="record-edit-toggle-grid">
              <button type="button" className={favorite ? 'active favorite' : ''} onClick={() => setFavorite((value) => !value)} aria-pressed={favorite}><EuIcon name="heart" />Favorito</button>
              <button type="button" className={pinned ? 'active pinned' : ''} onClick={() => setPinned((value) => !value)} aria-pressed={pinned}><EuIcon name="pin" />Fixado</button>
              <button type="button" className={isPrivate ? 'active private' : ''} onClick={() => setIsPrivate((value) => !value)} aria-pressed={isPrivate}><EuIcon name="lock" />Privado</button>
            </div>
          </section>

          <label>
            Estado
            <select value={directStatus} onChange={(event) => setDirectStatus(event.target.value as RecordStatus | '')}>
              <option value="">Automático pela etapa</option>
              <option value="active">Em movimento</option>
              <option value="completed">Concluído</option>
              <option value="paused">Pausado</option>
              <option value="abandoned">Desisti</option>
            </select>
          </label>

          <label>
            Etapa
            <select value={journeyStage} onChange={(event) => setJourneyStage(event.target.value)}>
              {stagesFor(type).map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          {statusFromStage(journeyStage, currentRecord.status) === 'active' && (
            <label>
              Voltar a me lembrar em
              <div className="followup-edit-row">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={followUpDays}
                  onChange={(event) => setFollowUpDays(Math.max(1, Number(event.target.value) || 1))}
                />
                <span>dias</span>
              </div>
            </label>
          )}

          {editAttachments.length > 0 && (
            <div className="edit-attachments">
              <span>Anexos</span>
              {editAttachments.map((attachment) => (
                <div key={attachment.id}>
                  <b><EuIcon name={attachmentIcon(attachment)} /></b>
                  <div><strong>{attachment.name}</strong><small>{attachment.kind}</small></div>
                  <button type="button" onClick={() => setEditAttachments((current) => current.filter((item) => item.id !== attachment.id))}><EuIcon name="x" />remover</button>
                </div>
              ))}
            </div>
          )}

          <label>
            Por que isso importa? <span className="optional-label">opcional</span>
            <textarea value={whyItMatters} onChange={(event) => setWhyItMatters(event.target.value)} rows={3} placeholder="O contexto que você gostaria de lembrar daqui a alguns meses." />
          </label>

          {type === 'Decisão' && (
            <div className="record-edit-grid decision-edit-grid">
              <label>
                O que você espera que aconteça?
                <textarea value={expectation} onChange={(event) => setExpectation(event.target.value)} rows={3} placeholder="Sua expectativa antes de conhecer o resultado" />
              </label>
              <label>
                Confiança · {confidence}%
                <input type="range" min="0" max="100" step="5" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} />
              </label>
            </div>
          )}

          {(area === 'Compras' || type === 'Objeto') && (
            <div className="record-edit-grid">
              <label>
                Nome do objeto
                <input className="record-text-input" value={objectName} onChange={(event) => setObjectName(event.target.value)} placeholder="Ex.: Casio AQ-230" />
              </label>
              <label>
                Etapa do objeto
                <select value={objectState} onChange={(event) => setObjectState(event.target.value as ObjectState)}>
                  <option value="researching">Pesquisando</option>
                  <option value="bought">Comprei</option>
                  <option value="using">Em uso</option>
                  <option value="sold">Vendi</option>
                  <option value="replaced">Troquei/substituí</option>
                </select>
              </label>
            </div>
          )}

          {(type === 'Projeto' || type === 'Objetivo' || type === 'Pendência') && (
            <label>
              Próximo movimento
              <input className="record-text-input" value={nextMove} onChange={(event) => setNextMove(event.target.value)} placeholder="Uma coisa que destrava isso" />
            </label>
          )}

          {type === 'Curso' && (
            <label>
              Progresso
              <select value={progressLevel} onChange={(event) => setProgressLevel(event.target.value as RecordProgress | '')}>
                <option value="">Sem progresso definido</option>
                <option value="started">Comecei</option>
                <option value="quarter">25%</option>
                <option value="half">Metade</option>
                <option value="almost">Quase terminando</option>
                <option value="done">Concluído</option>
              </select>
            </label>
          )}

          <details className="record-advanced-edit">
            <summary>
              <span><EuIcon name="settings" />Detalhes avançados</span>
              <small>lugar, capítulo, tags e frescor</small>
            </summary>
            <div className="record-advanced-edit-body">
              <label>
                Lugar <span className="optional-label">opcional</span>
                <input className="record-text-input" value={place} onChange={(event) => setPlace(event.target.value)} placeholder="Ex.: Ouro Preto, MG" />
              </label>

              <div className="record-edit-grid">
                <label>
                  Frescor da memória
                  <select value={freshness} onChange={(event) => setFreshness(event.target.value as RecordFreshness)}>
                    <option value="current">Atual</option>
                    <option value="maybe-stale">Pode ter mudado</option>
                    <option value="historical">Histórico</option>
                  </select>
                </label>
                <label>
                  Capítulo
                  <input className="record-text-input" value={chapterId} onChange={(event) => setChapterId(event.target.value)} placeholder="Ex.: Aptar 2026" />
                </label>
              </div>

              <div className="tag-editor">
                <span>Tags</span>
                <div className="editable-tags">
                  {tags.map((tag) => (
                    <button type="button" key={tag} onClick={() => setTags((current) => current.filter((item) => item !== tag))}>#{tag}<EuIcon name="x" /></button>
                  ))}
                </div>
                <div className="tag-add-row">
                  <input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} placeholder="nova tag" onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addTag()
                    }
                  }} />
                  <button type="button" onClick={addTag}><EuIcon name="plus" />Adicionar</button>
                </div>
              </div>
            </div>
          </details>

          <div className="record-edit-actions">
            <button type="submit" disabled={saving}><EuIcon name="check" />{saving ? 'Salvando…' : 'Salvar alterações'}</button>
            <button type="button" onClick={() => setEditing(false)}><EuIcon name="x" />Cancelar</button>
          </div>
        </form>
      )}
    </div>
  )
}
