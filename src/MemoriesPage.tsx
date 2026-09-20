import { useMemo, useState } from 'react'
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { groupTimeline, smartSearch } from './intelligence'
import { isRecordVisibleForInsights, listMoodCheckins, suggestTags } from './storage'
import { useRecords } from './appState'
import { BrandTop, EuIcon, SectionTitle, Tag, formatShortDate, typeIcon, typeTone } from './v2Ui'

export default function MemoriesPage() {
  const records = useRecords()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'search' | 'timeline'>(() => localStorage.getItem('eu-memories-mode') === 'timeline' ? 'timeline' : 'search')
  const [query, setQuery] = useState('')
  const initialCollection = params.get('colecao') || ''
  const [filter, setFilter] = useState(params.get('origem') === 'chatgpt' ? 'chatgpt' : initialCollection === 'favorites' ? 'favorites' : initialCollection === 'chat' ? 'chatgpt' : 'all')
  const [tagFilter, setTagFilter] = useState(params.get('tag') || '')
  const [areaFilter, setAreaFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialCollection === 'pinned' ? 'pinned' : initialCollection === 'completed' ? 'completed' : '')
  const [periodFilter, setPeriodFilter] = useState<'all' | '30' | '90' | '365'>('all')
  const [moodFilter, setMoodFilter] = useState('')
  const allMoods = listMoodCheckins()
  const moods = allMoods.slice(-14).reverse()
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

      <header className="v2-hero memories-hero">
        <Tag tone="pink">MEMÓRIAS</Tag>
        <h1>Procure qualquer<br />coisa da sua vida.</h1>
        <p>Decisões, desejos, cursos, conversas, referências e coisas que você nem lembrava que tinha guardado.</p>
      </header>

      <nav className="memory-section-nav" aria-label="Seções de Memórias">
        <NavLink to="/memorias" end><EuIcon name="search" />Buscar</NavLink>
        <NavLink to="/memorias/colecoes"><EuIcon name="collections" />Coleções</NavLink>
        <NavLink to="/memorias/humor"><EuIcon name="mood" />Humor</NavLink>
        <NavLink to="/seguranca"><EuIcon name="settings" />Ajustes</NavLink>
      </nav>

      <NavLink className="ask-eu-entry" to="/pergunte">
        <div>
          <Tag tone="ink">PERGUNTE AO EU</Tag>
          <strong>“O que eu já falei sobre isso?”</strong>
          <span>Pergunte em linguagem natural e veja as fontes.</span>
        </div>
        <b><EuIcon name="arrow-up-right" /></b>
      </NavLink>

      <div className="memory-mode-switch">
        <button className={mode === 'search' ? 'active' : ''} onClick={() => selectMode('search')}><EuIcon name="search" />Buscar</button>
        <button className={mode === 'timeline' ? 'active' : ''} onClick={() => selectMode('timeline')}><EuIcon name="note" />Linha do tempo</button>
      </div>

      {mode === 'search' && (
        <div className="memory-search">
          <span><EuIcon name="search" /></span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: qual era aquele relógio que eu gostei?"
            aria-label="Buscar nas memórias"
          />
          {query && <button className="memory-search-clear" aria-label="Limpar busca" onClick={() => setQuery('')}><EuIcon name="x" /></button>}
        </div>
      )}

      <details className="memory-filter-panel memory-filter-hub">
        <summary>
          <span><EuIcon name="settings" />Filtrar arquivo</span>
          <b>{activeFilterCount ? activeFilterCount + ' ativos' : 'tipo, área, data...'}</b>
        </summary>

        <div className="memory-filter-hub-body">
          <div className="memory-filters" aria-label="Filtros rápidos">
            {[
              ['all', 'Tudo'],
              ['favorites', 'Favoritos'],
              ['chatgpt', 'Do Chat'],
              ['desejo', 'Desejos'],
              ['curso', 'Cursos'],
              ['decisão', 'Decisões'],
              ['insight', 'Insights'],
            ].map(([value, label]) => (
              <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>

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

      {moods.length > 0 && (
        <section className="memory-moods">
          <SectionTitle eyebrow="HUMOR" title="Um preview do seu histórico" action={<button className="quiet-link" onClick={() => navigate('/memorias/humor')}>ver heatmap <EuIcon name="arrow-up-right" /></button>} />
          <div className="mood-history">
            {moods.map((item) => (
              <article key={item.date} className={'mood-history-' + item.mood}>
                <span><EuIcon name={item.mood === 'animado' ? 'smile' : item.mood === 'ok' ? 'neutral' : item.mood === 'cansado' ? 'moon' : 'bolt'} /></span>
                <small>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(item.date + 'T12:00:00'))}</small>
              </article>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
