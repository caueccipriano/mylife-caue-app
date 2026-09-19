import { type ChangeEvent, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { exportBackup, importBackup, listMoodCheckins } from './storage'
import { useRecords } from './appState'
import { BrandTop, SectionTitle, Tag, formatShortDate, typeTone } from './v2Ui'

export default function MemoriesPage() {
  const records = useRecords()
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(params.get('origem') === 'chatgpt' ? 'chatgpt' : 'all')
  const [message, setMessage] = useState('')
  const moods = listMoodCheckins().slice(-14).reverse()

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return records.filter((record) => {
      const sourceOk = filter === 'all' || (filter === 'chatgpt' && record.source === 'chatgpt') || record.type.toLowerCase() === filter
      const textOk = !normalized || [record.text, record.type, record.area].join(' ').toLowerCase().includes(normalized)
      return sourceOk && textOk
    })
  }, [records, query, filter])

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

  return (
    <div className="v2-page memories-page">
      <BrandTop />

      <header className="v2-hero memories-hero">
        <Tag tone="pink">MEMÓRIAS</Tag>
        <h1>Procure qualquer<br />coisa da sua vida.</h1>
        <p>Decisões, desejos, cursos, conversas, referências, lugares e coisas que você nem lembrava que tinha guardado.</p>
      </header>

      <div className="memory-search">
        <span>⌕</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: aquele relógio que eu gostei..."
          aria-label="Buscar nas memórias"
        />
      </div>

      <div className="memory-filters">
        {[
          ['all', 'Tudo'],
          ['chatgpt', 'Do Chat'],
          ['desejo', 'Desejos'],
          ['curso', 'Cursos'],
          ['decisão', 'Decisões'],
          ['insight', 'Insights'],
        ].map(([value, label]) => (
          <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>

      <section className="memory-results">
        <SectionTitle eyebrow="ARQUIVO" title={filtered.length + (filtered.length === 1 ? ' registro' : ' registros')} />
        <div className="memory-list">
          {filtered.map((record) => (
            <article key={record.id}>
              <div className="memory-icon">{record.source === 'chatgpt' ? '↗' : '•'}</div>
              <div>
                <div className="feed-meta">
                  <Tag tone={typeTone(record.type)}>{record.type}</Tag>
                  <span>{record.area}</span>
                  {record.source === 'chatgpt' && <Tag tone="ink">do chat</Tag>}
                </div>
                <h3>{record.text || 'Registro com anexo'}</h3>
                <p>{formatShortDate(record.createdAt)}{record.status === 'active' ? ' · em acompanhamento' : ''}</p>
              </div>
            </article>
          ))}
          {!filtered.length && (
            <div className="soft-empty wide">
              <span>⌕</span>
              <p>Nada encontrado. Tente procurar pelo assunto, área ou tipo de registro.</p>
            </div>
          )}
        </div>
      </section>

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
