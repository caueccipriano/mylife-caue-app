import { useMemo, useState } from 'react'
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { groupTimeline, smartSearch } from './intelligence'
import { deriveMemoryThreads } from './memoryThreads'
import './memory-threads.css'
import { isRecordVisibleForInsights, listMoodCheckins, suggestTags } from './storage'
import { useBridges, useRecords } from './appState'
import { BrandTop, EuIcon, SectionTitle, Tag, formatShortDate, typeIcon, typeTone } from './v2Ui'
import { deriveOneEuConnections } from './oneEu'
import OneEuConnections from './OneEuConnections'
import { deriveMemoryInsights } from './memoryIntelligence'
import MemoryInsights from './MemoryInsights'

export default function MemoriesPage() {
  const records = useRecords()
  const { bridges } = useBridges()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'search' | 'timeline'>(() => params.get('mode') === 'timeline' || localStorage.getItem('eu-memories-mode') === 'timeline' ? 'timeline' : 'search')
  const [query, setQuery] = useState('')
  const initialCollection = params.get('colecao') || ''
  const [filter, setFilter] = useState(params.get('origem') === 'chatgpt' ? 'chatgpt' : initialCollection === 'favorites' ? 'favorites' : initialCollection === 'chat' ? 'chatgpt' : 'all')
  const [tagFilter, setTagFilter] = useState(params.get('tag') || '')
  const [areaFilter, setAreaFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialCollection === 'pinned' ? 'pinned' : initialCollection === 'completed' ? 'completed' : '')
  const [periodFilter, setPeriodFilter] = useState<'all' | '30' | '90' | '365'>('all')
  const [moodFilter, setMoodFilter] = useState('')
  const threads = useMemo(() => deriveMemoryThreads(records, isRecordVisibleForInsights), [records])
  const oneEuConnections = useMemo(() => deriveOneEuConnections(records, bridges), [records, bridges])
  const memoryInsights = useMemo(() => deriveMemoryInsights(records), [records])
  const allMoods = listMoodCheckins()
  const moodByDate = new Map(allMoods.map((item) => [item.date, item.mood]))

  const topTags = useMemo(() => {
    const counts = new Map<string, number>()
    records.filter(isRecordVisibleForInsights).forEach((record) => {
      const tags = record.tags?.length ? record.tags : suggestTags(record.text, record.area, record.type)
      tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1))
    })
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag)
  }, [records])

  const filtered = useMemo(() => {
    const searchBase = query.trim() ? records.filter(isRecordVisibleForInsights) : records
    const searched = smartSearch(searchBase, query)
    return searched.filter((record) => {
      const sourceOk = filter === 'all'
        || (filter === 'chatgpt' && record.source === 'chatgpt')
        || (filter === 'favorites' && record.favorite)
        || record.type.toLowerCase() === filter

      const tags = record.tags?.length ? record.tags : suggestTags(record.text, record.area, record.type)
      const tagOk = !tagFilter || tags.includes(tagFilter)
      const areaOk = !areaFilter || record.area === areaFilter
      const statusOk = !statusFilter
        || (statusFilter === 'pinned' && record.pinned)
        || (statusFilter === 'active' && record.status === 'active')
        || (statusFilter === 'completed' && record.status === 'completed')
        || (statusFilter === 'paused' && record.status === 'paused')
      const periodOk = periodFilter === 'all'
        || new Date(record.createdAt).getTime() >= Date.now() - Number(periodFilter) * 86400000
      const moodOk = !moodFilter || moodByDate.get(record.createdAt.slice(0, 10)) === moodFilter
      const collectionOk = !initialCollection
        || !['wishes','decisions','links'].includes(initialCollection)
        || (initialCollection === 'wishes' && ['Desejo','Pesquisa','Preferência'].includes(record.type))
        || (initialCollection === 'decisions' && record.type === 'Decisão')
        || (initialCollection === 'links' && (record.attachments ?? []).some((attachment) => attachment.kind === 'link'))
      return sourceOk && tagOk && areaOk && statusOk && periodOk && moodOk && collectionOk
    })
  }, [records, query, filter, tagFilter, areaFilter, statusFilter, periodFilter, moodFilter, initialCollection, moodByDate])

  function selectMode(value: 'search' | 'timeline') {
    setMode(value)
    localStorage.setItem('eu-memories-mode', value)
  }

  const timeline = useMemo(() => groupTimeline(filtered), [filtered])
  const activeFilterCount = [
    filter !== 'all',
    Boolean(tagFilter),
    Boolean(areaFilter),
    Boolean(statusFilter),
    periodFilter !== 'all',
    Boolean(moodFilter),
  ].filter(Boolean).length

  function resetFilters() {
    setQuery('')
    setFilter('all')
    setTagFilter('')
    setAreaFilter('')
    setStatusFilter('')
    setPeriodFilter('all')
    setMoodFilter('')
    navigate('/memorias', { replace: true })
  }

  function selectQuickFilter(value: 'recent' | 'favorites' | 'chatgpt' | 'decisão' | 'all') {
    setMode('search')
    setQuery('')
    setTagFilter('')
    setAreaFilter('')
    setStatusFilter('')
    setMoodFilter('')
    if (value === 'recent') {
      setFilter('all')
      setPeriodFilter('30')
    } else {
      setFilter(value === 'all' ? 'all' : value)
      setPeriodFilter('all')
    }
    navigate('/memorias', { replace: true })
  }

  function askEuFromMemory() {
    const value = query.trim()
    if (!value) return
    navigate('/pergunte?q=' + encodeURIComponent(value))
  }

  function RecordCard({ record }: { record: (typeof records)[number] }) {
    const tags = record.tags?.length ? record.tags : suggestTags(record.text, record.area, record.type)
    const sealedCapsule = Boolean(record.revealAt && !record.capsuleOpenedAt && new Date(record.revealAt).getTime() > Date.now())

    const iconTone = record.favorite ? 'pink' : record.source === 'chatgpt' ? 'ink' : typeTone(record.type)
    const iconName = record.favorite ? 'heart' : record.source === 'chatgpt' ? 'chat' : typeIcon(record.type)

    return (
      <article className={'tappable-card memory-record-card type-border-' + typeTone(record.type)} onClick={() => navigate('/registro/' + record.id)}>
        <div className={'memory-icon memory-icon-' + iconTone}><EuIcon name={iconName} /></div>
        <div>
          {record.private ? (
            <>
              <div className="feed-meta"><Tag tone="pink">privado</Tag></div>
              <h3>Registro privado</h3>
              <p>{formatShortDate(record.createdAt)}</p>
            </>
          ) : sealedCapsule ? (
            <>
              <div className="feed-meta"><Tag tone="lilac">cápsula fechada</Tag></div>
              <h3>Uma mensagem para o futuro.</h3>
              <p>abre em {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(record.revealAt as string))}</p>
            </>
          ) : (
            <>
              <div className="feed-meta">
                <Tag tone={typeTone(record.type)}>{record.type}</Tag>
                <span>{record.area}</span>
                {record.source === 'chatgpt' && <Tag tone="ink">do chat</Tag>}
              </div>
              <h3>{record.text || 'Registro com anexo'}</h3>
              <div className="memory-record-state-row">
                <span>{formatShortDate(record.createdAt)}</span>
                {record.status === 'active' && (
                  <span className="memory-followup-badge"><EuIcon name="refresh" />em acompanhamento</span>
                )}
              </div>
              {tags.length > 0 && (
                <div className="memory-inline-tags">
                  {tags.slice(0, 4).map((tag) => <span key={tag}>#{tag}</span>)}
                </div>
              )}
            </>
          )}
        </div>
      </article>
    )
  }

  return (
    <div className="v2-page memories-page">
      <BrandTop />

      <header className="memory-first-header-v41">
        <Tag tone="pink">MEMÓRIAS</Tag>
        <h1>O que você está<br />tentando lembrar?</h1>
        <p>Procure do jeito que você falaria. O arquivo encontra registros; o EU cruza contexto e responde com fontes.</p>
      </header>

      <section className="memory-first-search-v41" aria-label="Buscar nas Memórias">
        <div className="memory-first-input-v41">
          <span><EuIcon name="search" /></span>
          <input
            value={query}
            onFocus={() => selectMode('search')}
            onChange={(event) => {
              setQuery(event.target.value)
              if (mode !== 'search') selectMode('search')
            }}
            placeholder="Ex.: qual era aquele relógio que eu gostei?"
            aria-label="O que você está tentando lembrar?"
          />
          {query && <button className="memory-search-clear" aria-label="Limpar busca" onClick={() => setQuery('')}><EuIcon name="x" /></button>}
        </div>
        <div className="memory-first-actions-v41">
          <button className="primary" onClick={() => selectMode('search')}><EuIcon name="search" />Buscar no arquivo</button>
          <button className="ask" onClick={askEuFromMemory} disabled={!query.trim()}><EuIcon name="sparkles" />Perguntar ao EU</button>
        </div>
      </section>

      <div className="memory-quick-filters-v41" aria-label="Atalhos de Memórias">
        <button className={filter === 'all' && periodFilter === 'all' && !query ? 'active' : ''} onClick={() => selectQuickFilter('all')}>Tudo</button>
        <button className={filter === 'all' && periodFilter === '30' ? 'active' : ''} onClick={() => selectQuickFilter('recent')}>Recentes</button>
        <button className={filter === 'favorites' ? 'active' : ''} onClick={() => selectQuickFilter('favorites')}><EuIcon name="heart" />Favoritos</button>
        <button className={filter === 'chatgpt' ? 'active' : ''} onClick={() => selectQuickFilter('chatgpt')}><EuIcon name="chat" />Do Chat</button>
        <button className={filter === 'decisão' ? 'active' : ''} onClick={() => selectQuickFilter('decisão')}><EuIcon name="check" />Decisões</button>
      </div>

      <nav className="memory-explore-v41" aria-label="Explorar Memórias">
        <button className={mode === 'search' ? 'active' : ''} onClick={() => selectMode('search')}><EuIcon name="search" />Arquivo</button>
        <button className={mode === 'timeline' ? 'active' : ''} onClick={() => selectMode('timeline')}><EuIcon name="note" />Linha do tempo</button>
        <NavLink to="/memorias/colecoes"><EuIcon name="collections" />Coleções</NavLink>
        <NavLink to="/memorias/humor"><EuIcon name="mood" />Humor</NavLink>
      </nav>

      {mode === 'search' && !query.trim() && activeFilterCount === 0 && !initialCollection && (
        <OneEuConnections items={oneEuConnections} limit={2} compact title="O resto do EU também lembra." />
      )}

      {mode === 'search' && !query.trim() && activeFilterCount === 0 && !initialCollection && (
        <MemoryInsights items={memoryInsights} />
      )}

      {mode === 'search' && !query.trim() && activeFilterCount === 0 && !initialCollection && threads.length > 0 && (
        <section className="memory-threads memory-threads-v41" aria-label="Conexões encontradas no arquivo">
          <div className="memory-threads-head">
            <div>
              <Tag tone="lilac">CONEXÕES</Tag>
              <h2>Coisas que seu arquivo juntou.</h2>
            </div>
          </div>
          <div className="memory-thread-list">
            {threads.slice(0, 4).map((thread) => (
              <button
                type="button"
                key={thread.id}
                className="memory-thread-card"
                onClick={() => navigate('/registro/' + encodeURIComponent(thread.lead.id))}
                aria-label={'Abrir ' + thread.members.length + ' registros relacionados, começando por ' + thread.lead.text.slice(0, 70)}
              >
                <span className="memory-thread-symbol" aria-hidden="true"><EuIcon name="link" /></span>
                <span className="memory-thread-copy">
                  <em>{thread.members.length} registros relacionados · {thread.lead.area}</em>
                  <strong>{thread.lead.text || 'Registro com anexo'}</strong>
                  <small>{thread.members.slice(1, 3).map((item) => item.text || 'Registro com anexo').join(' · ')}</small>
                </span>
                <EuIcon name="arrow-up-right" />
              </button>
            ))}
          </div>
        </section>
      )}

      <details className="memory-filter-panel memory-filter-hub">
        <summary>
          <span><EuIcon name="settings" />Filtros avançados</span>
          <b>{activeFilterCount ? activeFilterCount + ' ativos' : 'área, estado, data...'}</b>
        </summary>

        <div className="memory-filter-hub-body">
          <div className="memory-advanced-filters">
            <label>
              <span>Área</span>
              <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}>
                <option value="">Todas</option>
                {['Carreira','Dinheiro','Estudos','Casa','Viagens','Compras','Lazer','Pessoal'].map((area) => <option key={area}>{area}</option>)}
              </select>
            </label>
            <label>
              <span>Estado</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">Todos</option>
                <option value="pinned">Fixados</option>
                <option value="active">Em movimento</option>
                <option value="completed">Concluídos</option>
                <option value="paused">Pausados</option>
              </select>
            </label>
            <label>
              <span>Período</span>
              <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as 'all' | '30' | '90' | '365')}>
                <option value="all">Todo o tempo</option>
                <option value="30">30 dias</option>
                <option value="90">90 dias</option>
                <option value="365">1 ano</option>
              </select>
            </label>
            <label>
              <span>Humor</span>
              <select value={moodFilter} onChange={(event) => setMoodFilter(event.target.value)}>
                <option value="">Todos</option>
                <option value="animado">Bem</option>
                <option value="ok">Ok</option>
                <option value="cansado">Cansado</option>
                <option value="pilhado">Pilhado</option>
              </select>
            </label>
          </div>

          {topTags.length > 0 && (
            <div className="memory-tag-strip">
              <button className={!tagFilter ? 'active' : ''} onClick={() => setTagFilter('')}>#todas</button>
              {topTags.map((tag) => (
                <button key={tag} className={tagFilter === tag ? 'active' : ''} onClick={() => setTagFilter(tag)}>#{tag}</button>
              ))}
            </div>
          )}
        </div>
      </details>

      {(activeFilterCount > 0 || query) && (
        <div className="memory-filter-status">
          <span>{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'} no recorte atual</span>
          <button onClick={resetFilters}><EuIcon name="x" />limpar</button>
        </div>
      )}

      {mode === 'search' ? (
        <section className="memory-results">
          <SectionTitle eyebrow="ARQUIVO" title={filtered.length + (filtered.length === 1 ? ' registro' : ' registros')} />
          <div className="memory-list">
            {filtered.map((record) => <RecordCard key={record.id} record={record} />)}
            {!filtered.length && (
              <div className="soft-empty wide">
                <span><EuIcon name="search" /></span>
                <p>Nada encontrado. Você pode procurar como falaria comigo: “o que eu já falei sobre SQL?”</p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="memory-timeline">
          <SectionTitle eyebrow="LINHA DO TEMPO" title="Sua vida, em ordem" />
          {timeline.map((group) => (
            <div className="timeline-month" key={group.label}>
              <h3>{group.label}</h3>
              <div className="timeline-line">
                {group.items.map((record) => (
                  <div className="timeline-event" key={record.id}>
                    <i />
                    <RecordCard record={record} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!timeline.length && <div className="soft-empty wide"><span><EuIcon name="note" /></span><p>Sua linha do tempo aparece conforme os registros entram.</p></div>}
        </section>
      )}



    </div>
  )
}
