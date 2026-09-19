import { type ChangeEvent, useMemo, useState } from 'react'
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { groupTimeline, smartSearch } from './intelligence'
import { exportBackup, importBackup, listMoodCheckins, suggestTags } from './storage'
import { useRecords } from './appState'
import { BrandTop, SectionTitle, Tag, formatShortDate, typeTone } from './v2Ui'

export default function MemoriesPage() {
  const records = useRecords()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'search' | 'timeline'>('search')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(params.get('origem') === 'chatgpt' ? 'chatgpt' : 'all')
  const [tagFilter, setTagFilter] = useState(params.get('tag') || '')
  const [message, setMessage] = useState('')
  const moods = listMoodCheckins().slice(-14).reverse()

  const topTags = useMemo(() => {
    const counts = new Map<string, number>()
    records.forEach((record) => {
      const tags = record.tags?.length ? record.tags : suggestTags(record.text, record.area, record.type)
      tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1))
    })
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag)
  }, [records])

  const filtered = useMemo(() => {
    const searched = smartSearch(records, query)
    return searched.filter((record) => {
      const sourceOk = filter === 'all'
        || (filter === 'chatgpt' && record.source === 'chatgpt')
        || (filter === 'favorites' && record.favorite)
        || record.type.toLowerCase() === filter

      const tags = record.tags?.length ? record.tags : suggestTags(record.text, record.area, record.type)
      const tagOk = !tagFilter || tags.includes(tagFilter)
      return sourceOk && tagOk
    })
  }, [records, query, filter, tagFilter])

  const timeline = useMemo(() => groupTimeline(filtered), [filtered])

  async function handleExport() {
    try {
      await exportBackup()
      setMessage('Backup criado. Guarde no app Arquivos ou no iCloud Drive.')
    } catch {
      setMessage('Não consegui criar o backup agora.')
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      await importBackup(file)
      window.dispatchEvent(new Event('eu-records-restored'))
      setMessage('Backup restaurado neste aparelho.')
    } catch {
      setMessage('Esse arquivo não parece ser um backup válido do EU.')
    }
    event.target.value = ''
  }

  function RecordCard({ record }: { record: (typeof records)[number] }) {
    const tags = record.tags?.length ? record.tags : suggestTags(record.text, record.area, record.type)

    return (
      <article className="tappable-card" onClick={() => navigate('/registro/' + record.id)}>
        <div className="memory-icon">{record.favorite ? '♥' : record.source === 'chatgpt' ? '↗' : '•'}</div>
        <div>
          {record.private ? (
            <>
              <div className="feed-meta"><Tag tone="pink">privado</Tag></div>
              <h3>Registro privado</h3>
              <p>{formatShortDate(record.createdAt)}</p>
            </>
          ) : (
            <>
              <div className="feed-meta">
                <Tag tone={typeTone(record.type)}>{record.type}</Tag>
                <span>{record.area}</span>
                {record.source === 'chatgpt' && <Tag tone="ink">do chat</Tag>}
              </div>
              <h3>{record.text || 'Registro com anexo'}</h3>
              <p>{formatShortDate(record.createdAt)}{record.status === 'active' ? ' · em acompanhamento' : ''}</p>
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

      <button className="ask-eu-entry" onClick={() => navigate('/pergunte')}>
        <div>
          <Tag tone="ink">PERGUNTE AO EU</Tag>
          <strong>“O que eu já falei sobre isso?”</strong>
          <span>Pergunte em linguagem natural e veja as fontes.</span>
        </div>
        <b>↗</b>
      </button>

      <div className="memory-mode-switch">
        <button className={mode === 'search' ? 'active' : ''} onClick={() => setMode('search')}>⌕ Buscar</button>
        <button className={mode === 'timeline' ? 'active' : ''} onClick={() => setMode('timeline')}>↕ Linha do tempo</button>
      </div>

      {mode === 'search' && (
        <div className="memory-search">
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: qual era aquele relógio que eu gostei?"
            aria-label="Buscar nas memórias"
          />
        </div>
      )}

      <div className="memory-filters">
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

      {topTags.length > 0 && (
        <div className="memory-tag-strip">
          <button className={!tagFilter ? 'active' : ''} onClick={() => setTagFilter('')}>#todas</button>
          {topTags.map((tag) => (
            <button key={tag} className={tagFilter === tag ? 'active' : ''} onClick={() => setTagFilter(tag)}>#{tag}</button>
          ))}
        </div>
      )}

      {mode === 'search' ? (
        <section className="memory-results">
          <SectionTitle eyebrow="ARQUIVO" title={filtered.length + (filtered.length === 1 ? ' registro' : ' registros')} />
          <div className="memory-list">
            {filtered.map((record) => <RecordCard key={record.id} record={record} />)}
            {!filtered.length && (
              <div className="soft-empty wide">
                <span>⌕</span>
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
          {!timeline.length && <div className="soft-empty wide"><span>↕</span><p>Sua linha do tempo aparece conforme os registros entram.</p></div>}
        </section>
      )}

      {moods.length > 0 && (
        <section className="memory-moods">
          <SectionTitle eyebrow="COMO VOCÊ CHEGOU" title="Últimos check-ins" />
          <div className="mood-history">
            {moods.map((item) => (
              <article key={item.date}>
                <span>{item.mood === 'animado' ? '☺' : item.mood === 'ok' ? '◡' : item.mood === 'cansado' ? '–' : '↟'}</span>
                <small>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(item.date + 'T12:00:00'))}</small>
              </article>
            ))}
          </div>
        </section>
      )}

      <NavLink className="security-entry-card" to="/seguranca">
        <div>
          <Tag tone="cobalt">SEGURANÇA</Tag>
          <strong>Privados, backups e recuperação.</strong>
          <p>PIN local, bloqueio automático, modo discreto, backup criptografado e Lixeira.</p>
        </div>
        <b>↗</b>
      </NavLink>

      <section className="memory-backup">
        <Tag tone="muted">SEU ARQUIVO</Tag>
        <h2>Os dados continuam seus.</h2>
        <p>O EU funciona localmente. Faça um backup de vez em quando para proteger seu histórico.</p>
        <div>
          <button onClick={handleExport}>Criar backup</button>
          <label>Restaurar backup<input type="file" accept="application/json,.json" onChange={handleImport} /></label>
        </div>
        {message && <small>{message}</small>}
      </section>
    </div>
  )
}
