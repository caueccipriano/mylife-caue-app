import { type ChangeEvent, useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import RegisterSheet from './RegisterSheet'
import { archiveItems, areas, projects } from './data'
import { exportBackup, importBackup, listRecords, saveRecord, type StoredRecord } from './storage'

const nav = [
  ['/', 'Agora'],
  ['/areas', 'Áreas'],
  ['/projetos', 'Projetos'],
  ['/arquivo', 'Arquivo'],
  ['/eu', 'Eu'],
] as const

function todayLabel() {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date()).toUpperCase()
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function useStoredRecords() {
  const [records, setRecords] = useState<StoredRecord[]>([])

  useEffect(() => {
    const refresh = () => {
      void listRecords().then(setRecords)
    }

    refresh()
    window.addEventListener('eu-record-saved', refresh)
    window.addEventListener('eu-records-restored', refresh)

    return () => {
      window.removeEventListener('eu-record-saved', refresh)
      window.removeEventListener('eu-records-restored', refresh)
    }
  }, [])

  return records
}

function Layout({ onRegister }: { onRegister: () => void }) {
  return (
    <div className="app-frame">
      <aside className="side-rail">
        <NavLink className="brand" to="/">EU</NavLink>
        <nav>
          {nav.map(([path, label]) => (
            <NavLink key={path} to={path} end={path === '/'}>{label}</NavLink>
          ))}
        </nav>
        <button className="rail-register" onClick={onRegister}>Registrar</button>
      </aside>

      <main className="main-canvas">
        <Routes>
          <Route path="/" element={<AgoraPage onRegister={onRegister} />} />
          <Route path="/areas" element={<AreasPage />} />
          <Route path="/projetos" element={<ProjectsPage />} />
          <Route path="/projetos/:id" element={<ProjectPage />} />
          <Route path="/arquivo" element={<ArchivePage />} />
          <Route path="/eu" element={<MePage />} />
          <Route path="/capturar" element={<ChatGPTCapturePage />} />
        </Routes>
      </main>

      <button className="floating-register" onClick={onRegister}>Registrar</button>
      <nav className="bottom-nav" aria-label="Navegação principal">
        {nav.map(([path, label]) => (
          <NavLink key={path} to={path} end={path === '/'}>{label}</NavLink>
        ))}
      </nav>
    </div>
  )
}

function AgoraPage({ onRegister }: { onRegister: () => void }) {
  const records = useStoredRecords()
  const navigate = useNavigate()

  const focus = [
    { label: 'CARREIRA', title: 'Evolução profissional', summary: 'Base sólida em custos, com dados entrando no próximo capítulo.', next: 'consolidar portfólio', path: '/projetos/evolucao-profissional' },
    { label: 'COMPRAS', title: 'Trocar de carro', summary: 'Pesquisa ativa dentro de uma faixa de referência já definida.', next: 'selecionar candidatos reais', path: '/projetos/trocar-de-carro' },
    { label: 'PESSOAL', title: 'EU', summary: 'O arquivo vivo começou a ganhar forma.', next: 'validar a primeira experiência', path: '/projetos/eu' },
  ]

  return (
    <div className="page page-home">
      <header className="hero home-hero">
        <div className="mobile-home-bar" aria-hidden="true">
          <span className="mobile-wordmark">EU</span>
          <span className="mobile-edition">ARQUIVO VIVO</span>
        </div>
        <p className="eyebrow home-date">{todayLabel()}</p>
        <h1>{greeting()}, Cauê.</h1>
        <p className="hero-copy">Esta é a sua vida agora.</p>
      </header>

      <section className="home-section">
        <div className="section-heading">
          <h2>Em foco</h2>
          <span>o que está em movimento</span>
        </div>
        <div className="focus-grid">
          {focus.map((item) => (
            <button className="focus-card" key={item.title} onClick={() => navigate(item.path)}>
              <p className="eyebrow">{item.label}</p>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <div className="next-line">Próximo <span>→</span> {item.next}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <h2>Recentes</h2>
          <NavLink className="section-link" to="/arquivo">Ver arquivo →</NavLink>
        </div>
        <div className="recent-list">
          {records.length ? records.slice(0, 4).map((record) => (
            <div className="recent-row" key={record.id}>
              <span>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(record.createdAt))}</span>
              <strong>{record.type}</strong>
              <p>{record.text}</p>
            </div>
          )) : (
            <>
              <div className="recent-row"><span>18 set</span><strong>Decisão</strong><p>Direção visual do EU definida</p></div>
              <div className="recent-row"><span>18 set</span><strong>Projeto</strong><p>EU iniciado</p></div>
              <div className="recent-row"><span>17 set</span><strong>Referência</strong><p>Paleta arquitetônica salva</p></div>
            </>
          )}
        </div>
      </section>

      <button className="register-panel" onClick={onRegister}>
        <span>REGISTRAR</span>
        <strong>Guarde qualquer coisa da sua vida.</strong>
        <em>Escreva do seu jeito. O EU organiza depois →</em>
      </button>
    </div>
  )
}

function AreasPage() {
  const [selected, setSelected] = useState(areas[0].id)
  const area = areas.find((item) => item.id === selected) ?? areas[0]

  return (
    <div className="page">
      <header className="page-title">
        <p className="eyebrow">ÁREAS</p>
        <h1>As partes permanentes da sua vida.</h1>
        <p>Não são pastas. São contextos que continuam existindo mesmo quando os projetos mudam.</p>
      </header>

      <div className="area-layout">
        <div className="area-list">
          {areas.map((item) => (
            <button className={selected === item.id ? 'active' : ''} onClick={() => setSelected(item.id)} key={item.id}>
              <span>{item.name}</span>
              <small>{item.status}</small>
            </button>
          ))}
        </div>

        <article className="area-sheet">
          <div className="status-row">
            <p className="eyebrow">{area.name.toUpperCase()}</p>
            <span className="status-chip">{area.status}</span>
          </div>
          <h2>{area.now}</h2>
          <dl className="executive-grid">
            <div><dt>AGORA</dt><dd>{area.now}</dd></div>
            <div><dt>DIREÇÃO</dt><dd>{area.direction}</dd></div>
            <div>
              <dt>EM ANDAMENTO</dt>
              <dd>{area.active.length ? area.active.map((item) => <span className="line-item" key={item}>{item}</span>) : 'Nenhum item ativo.'}</dd>
            </div>
            <div><dt>DECISÕES</dt><dd>{area.decisions} registradas</dd></div>
            <div><dt>DOCUMENTOS</dt><dd>Nenhum documento destacado.</dd></div>
            <div><dt>HISTÓRICO</dt><dd><span className="timeline-years">2026 — 2025 — 2024</span></dd></div>
          </dl>
        </article>
      </div>
    </div>
  )
}

function ProjectsPage() {
  const navigate = useNavigate()
  return (
    <div className="page">
      <header className="page-title">
        <p className="eyebrow">PROJETOS</p>
        <h1>Coisas que têm um ciclo de vida.</h1>
        <p>Começam, mudam, terminam. Cada projeto guarda contexto, decisões e próximos movimentos.</p>
      </header>
      <div className="project-list">
        {projects.map((project) => (
          <button key={project.id} className="project-row" onClick={() => navigate('/projetos/' + project.id)}>
            <div>
              <p className="eyebrow">{project.area.toUpperCase()} · {project.status.toUpperCase()}</p>
              <h3>{project.name}</h3>
              <p>{project.summary}</p>
            </div>
            <div className="project-meta">
              <span>{project.phase}</span>
              <span>{project.deadline}</span>
              <b>→</b>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const project = projects.find((item) => item.id === id)

  if (!project) return <div className="page"><p>Projeto não encontrado.</p></div>

  return (
    <div className="page">
      <button className="back-link" onClick={() => navigate('/projetos')}>← Projetos</button>
      <header className="project-hero">
        <div className="status-row">
          <p className="eyebrow">{project.area.toUpperCase()}</p>
          <span className="status-chip terra">{project.status}</span>
        </div>
        <h1>{project.name}</h1>
        <p>{project.summary}</p>
      </header>

      <div className="project-summary-grid">
        <div><span>META</span><strong>{project.deadline}</strong></div>
        <div><span>FASE</span><strong>{project.phase}</strong></div>
        <div><span>RECURSO</span><strong>{project.resource || 'Não se aplica'}</strong></div>
      </div>

      <section className="narrative-block">
        <p className="eyebrow">CONTEXTO</p>
        <p>{project.context}</p>
      </section>

      <div className="two-column">
        <section>
          <p className="eyebrow">DECISÕES TOMADAS</p>
          {project.decisions.map((item) => <div className="check-row done" key={item}><span>✓</span>{item}</div>)}
        </section>
        <section>
          <p className="eyebrow">PRÓXIMOS PASSOS</p>
          {project.next.map((item) => <div className="check-row" key={item}><span>○</span>{item}</div>)}
        </section>
      </div>

      <section className="narrative-block">
        <p className="eyebrow">LINHA DO TEMPO</p>
        <div className="project-timeline">
          <span>18 SET</span><p>Projeto atualizado</p>
          <span>INÍCIO</span><p>Contexto inicial registrado</p>
        </div>
      </section>
    </div>
  )
}

function ArchivePage() {
  const [query, setQuery] = useState('')
  const records = useStoredRecords()
  const dynamicItems = records.map((record) => ({
    type: record.type,
    title: record.text,
    meta: `${record.area} · ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(record.createdAt))}`,
  }))
  const filtered = [...dynamicItems, ...archiveItems].filter((item) =>
    (item.title + item.type + item.meta).toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="page">
      <header className="page-title archive-title">
        <p className="eyebrow">ARQUIVO</p>
        <h1>Encontre qualquer coisa da sua vida.</h1>
      </header>
      <input className="archive-search" placeholder="Procure qualquer coisa da sua vida" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="facet-row">
        {['Pessoas', 'Lugares', 'Compras', 'Decisões', 'Referências'].map((facet) => <button key={facet}>{facet}</button>)}
      </div>
      <div className="archive-results">
        {filtered.map((item, index) => (
          <article key={item.type + item.title + index}>
            <p className="eyebrow">{item.type.toUpperCase()}</p>
            <h3>{item.title}</h3>
            <p>{item.meta}</p>
          </article>
        ))}
        {!filtered.length && <p className="empty">Nada encontrado com esse termo.</p>}
      </div>
    </div>
  )
}


function ChatGPTCapturePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [state, setState] = useState<'ready' | 'saving' | 'saved' | 'error'>('ready')

  const params = new URLSearchParams(location.search)
  const text = params.get('texto')?.trim() || ''
  const type = params.get('tipo')?.trim() || 'Nota'
  const area = params.get('area')?.trim() || 'Pessoal'

  async function save() {
    if (!text || state === 'saving') return

    setState('saving')

    try {
      await saveRecord({
        id: crypto.randomUUID(),
        text,
        type,
        area,
        source: 'chatgpt',
        createdAt: new Date().toISOString(),
      })

      window.dispatchEvent(new Event('eu-record-saved'))
      setState('saved')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="page capture-page">
      <header className="page-title capture-title">
        <p className="eyebrow">DO CHATGPT PARA O EU</p>
        <h1>{text ? 'Pronto para guardar.' : 'Nada para importar.'}</h1>
        <p>
          {text
            ? 'Confira o registro antes de colocá-lo no arquivo local deste aparelho.'
            : 'Este link não contém um registro válido.'}
        </p>
      </header>

      {text && (
        <article className="capture-card">
          <div className="capture-card-meta">
            <span>{type}</span>
            <span>{area}</span>
          </div>
          <p>{text}</p>
        </article>
      )}

      {state === 'saved' ? (
        <div className="capture-success">
          <p className="eyebrow">GUARDADO</p>
          <h2>Entrou no seu EU.</h2>
          <div className="backup-actions">
            <button className="primary-button" onClick={() => navigate('/arquivo')}>Ver no Arquivo</button>
            <button className="secondary-button" onClick={() => navigate('/')}>Voltar ao Agora</button>
          </div>
        </div>
      ) : text ? (
        <div className="capture-actions">
          <button className="primary-button" onClick={save} disabled={state === 'saving'}>
            {state === 'saving' ? 'Guardando…' : 'Guardar no EU'}
          </button>
          <button className="secondary-button" onClick={() => navigate('/')}>Cancelar</button>
          {state === 'error' && <p className="inline-error">Não consegui salvar neste aparelho. Tente novamente.</p>}
        </div>
      ) : (
        <button className="secondary-button" onClick={() => navigate('/')}>Voltar</button>
      )}
    </div>
  )
}

function MePage() {
  const [backupMessage, setBackupMessage] = useState('')

  async function handleExport() {
    try {
      await exportBackup()
      setBackupMessage('Backup criado. Guarde o arquivo no app Arquivos ou no iCloud Drive.')
    } catch {
      setBackupMessage('Não consegui criar o backup agora.')
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      await importBackup(file)
      setBackupMessage('Backup restaurado neste aparelho.')
      window.dispatchEvent(new Event('eu-records-restored'))
    } catch {
      setBackupMessage('Esse arquivo não parece ser um backup válido do EU.')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="page dossier">
      <header className="me-header">
        <p className="eyebrow">EU</p>
        <h1>Cauê</h1>
        <p>28 anos</p>
      </header>

      <section className="me-now">
        <p className="eyebrow">AGORA</p>
        <h2>Construindo uma fase mais intencional da vida profissional, financeira e pessoal.</h2>
      </section>

      <div className="dossier-grid">
        <article><p className="eyebrow">TRABALHO</p><h3>Custos, controladoria e análise</h3><p>Experiência industrial com interesse crescente em dados.</p></article>
        <article><p className="eyebrow">ESTUDOS</p><h3>Formação em andamento</h3><p>Graduação, dados, idiomas e repertório profissional.</p></article>
        <article><p className="eyebrow">OBJETIVOS ATUAIS</p><h3>Avançar sem perder contexto</h3><p>Carreira, projetos pessoais e decisões maiores organizadas no mesmo arquivo.</p></article>
        <article><p className="eyebrow">INTERESSES</p><h3>Dados, design, leitura e tecnologia</h3><p>Assuntos que aparecem com frequência nos registros.</p></article>
        <article><p className="eyebrow">PREFERÊNCIAS</p><h3>Clareza, estética limpa e escolhas bem comparadas</h3><p>Preferências se refinam automaticamente ao longo do tempo.</p></article>
      </div>

      <div className="history-links">
        <button><span>2026</span><strong>Ver meu ano</strong><b>→</b></button>
        <button><span>HISTÓRIA</span><strong>Minha linha do tempo</strong><b>→</b></button>
      </div>

      <section className="backup-block">
        <p className="eyebrow">DADOS DESTE IPHONE</p>
        <h2>Seu arquivo fica no aparelho.</h2>
        <p>O EU funciona sem conta e sem servidor pago. Faça um backup de vez em quando para não depender apenas do armazenamento do navegador.</p>
        <div className="backup-actions">
          <button className="primary-button" onClick={handleExport}>Criar backup</button>
          <label className="secondary-button">
            Restaurar backup
            <input type="file" accept="application/json,.json" onChange={handleImport} />
          </label>
        </div>
        {backupMessage && <p className="backup-message">{backupMessage}</p>}
      </section>
    </div>
  )
}

export default function App() {
  const [registerOpen, setRegisterOpen] = useState(false)

  function saved() {
    window.dispatchEvent(new Event('eu-record-saved'))
  }

  return (
    <>
      <Layout onRegister={() => setRegisterOpen(true)} />
      <RegisterSheet open={registerOpen} onClose={() => setRegisterOpen(false)} onSaved={saved} />
    </>
  )
}
