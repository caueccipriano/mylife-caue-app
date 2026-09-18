import { type ChangeEvent, type ReactNode, useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import RegisterSheet from './RegisterSheet'
import { archiveItems, areas, projects } from './data'
import { exportBackup, importBackup, listRecords, saveRecord, type StoredRecord } from './storage'

const primaryNav = [
  ['/', 'Hoje'],
  ['/eu', 'Eu'],
] as const

type StickerTone = 'ink' | 'sage' | 'sand' | 'stone' | 'blue'

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

function Sticker({ children, tone = 'ink', tilt = 0 }: { children: ReactNode; tone?: StickerTone; tilt?: number }) {
  return (
    <span
      className={'brand-sticker sticker-' + tone}
      style={{ transform: 'rotate(' + tilt + 'deg)' }}
    >
      {children}
    </span>
  )
}

function BrandHeader() {
  return (
    <div className="brand-header">
      <NavLink to="/" className="brand-lockup" aria-label="EU, voltar para Hoje">
        <strong>EU</strong>
        <span>arquivo vivo</span>
      </NavLink>
      <div className="brand-header-marks" aria-hidden="true">
        <span>✦</span>
        <span>↗</span>
      </div>
    </div>
  )
}

function Layout({ onRegister }: { onRegister: () => void }) {
  return (
    <div className="app-frame">
      <aside className="side-rail">
        <NavLink className="brand" to="/">EU</NavLink>
        <p className="rail-tagline">Mais vida no que importa.</p>
        <nav>
          {primaryNav.map(([path, label]) => (
            <NavLink key={path} to={path} end={path === '/'}>{label}</NavLink>
          ))}
          <NavLink to="/arquivo">Arquivo</NavLink>
          <NavLink to="/areas">Áreas</NavLink>
          <NavLink to="/projetos">Projetos</NavLink>
        </nav>
        <div className="rail-sticker">UMA VIDA REAL<br />EM UM SÓ LUGAR</div>
        <button className="rail-register" onClick={onRegister}>+ Registrar</button>
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

      <button className="floating-register" onClick={onRegister} aria-label="Registrar no EU">
        <span>+</span>
      </button>

      <nav className="bottom-nav" aria-label="Navegação principal">
        {primaryNav.map(([path, label]) => (
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
    { label: 'CARREIRA', title: 'Evolução profissional', summary: 'Estratégia viva para decisões, lacunas e próximos movimentos.', next: 'abrir plano estratégico', path: '/areas', tone: 'sage' as StickerTone },
    { label: 'COMPRAS', title: 'Trocar de carro', summary: 'Pesquisa ativa dentro da faixa que faz sentido para você.', next: 'selecionar candidatos', path: '/projetos/trocar-de-carro', tone: 'sand' as StickerTone },
    { label: 'PESSOAL', title: 'EU', summary: 'Seu arquivo vivo ganhou uma direção nova.', next: 'usar e refinar', path: '/projetos/eu', tone: 'blue' as StickerTone },
  ]

  return (
    <div className="page page-home">
      <BrandHeader />

      <header className="home-intro">
        <div className="home-intro-copy">
          <p className="eyebrow">{todayLabel()}</p>
          <h1>{greeting()},<br />Cauê.</h1>
          <p>Pequenos registros constroem uma história inteira.</p>
        </div>
        <div className="home-brand-cluster" aria-hidden="true">
          <div className="seal-sticker">EU<span>UMA VIDA REAL</span></div>
          <Sticker tone="sage" tilt={-4}>VIVA O AGORA ↗</Sticker>
          <span className="spark-mark">✦</span>
        </div>
      </header>

      <section className="phase-card">
        <div>
          <Sticker tone="ink" tilt={-2}>MINHA FASE</Sticker>
          <h2>Construindo uma vida mais intencional.</h2>
          <p>Mais clareza para lembrar o que importa, entender o que está em movimento e guardar o que merece ficar.</p>
        </div>
        <button onClick={onRegister} className="phase-register">Registrar algo <span>↗</span></button>
      </section>

      <section className="home-section">
        <div className="section-heading organic-heading">
          <div>
            <p className="eyebrow">AGORA</p>
            <h2>Em foco</h2>
          </div>
          <button className="text-link" onClick={() => navigate('/projetos')}>Ver projetos ↗</button>
        </div>

        <div className="focus-grid organic-focus">
          {focus.map((item, index) => (
            <button className={'focus-card organic-card tone-' + item.tone} key={item.title} onClick={() => navigate(item.path)}>
              <div className="focus-topline">
                <Sticker tone={item.tone} tilt={index === 1 ? 2 : -2}>{item.label}</Sticker>
                <span className="card-number">0{index + 1}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <div className="next-line">Próximo <span>↗</span> {item.next}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading organic-heading">
          <div>
            <p className="eyebrow">ATALHOS</p>
            <h2>Olhar sua vida</h2>
          </div>
        </div>
        <div className="life-shortcuts">
          <button onClick={() => navigate('/areas')}>
            <Sticker tone="sage" tilt={-3}>ÁREAS</Sticker>
            <strong>Contextos que continuam com você.</strong>
            <span>Explorar ↗</span>
          </button>
          <button onClick={() => navigate('/projetos')}>
            <Sticker tone="stone" tilt={2}>PROJETOS</Sticker>
            <strong>Coisas que começaram, mudaram ou vão terminar.</strong>
            <span>Explorar ↗</span>
          </button>
        </div>
      </section>

      <section className="home-section recent-section">
        <div className="section-heading organic-heading">
          <div>
            <p className="eyebrow">MEMÓRIA</p>
            <h2>Recentes</h2>
          </div>
          <NavLink className="text-link" to="/arquivo">Ver arquivo ↗</NavLink>
        </div>
        <div className="recent-list organic-recent">
          {records.length ? records.slice(0, 4).map((record, index) => (
            <div className="recent-row" key={record.id}>
              <span>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(record.createdAt))}</span>
              <Sticker tone={index % 2 ? 'stone' : 'sand'} tilt={index % 2 ? 1 : -1}>{record.type}</Sticker>
              <p>{record.text || 'Registro com anexo'}</p>
            </div>
          )) : (
            <>
              <div className="recent-row"><span>18 set</span><Sticker tone="sand" tilt={-1}>DECISÃO</Sticker><p>Direção visual do EU definida</p></div>
              <div className="recent-row"><span>18 set</span><Sticker tone="blue" tilt={1}>PROJETO</Sticker><p>EU iniciado</p></div>
              <div className="recent-row"><span>17 set</span><Sticker tone="sage" tilt={-2}>REFERÊNCIA</Sticker><p>Paleta masculina e orgânica aprovada</p></div>
            </>
          )}
        </div>
      </section>

      <div className="home-signoff" aria-hidden="true">
        <span>REGISTRAR O PRESENTE.</span>
        <strong>CONSTRUIR O QUE VEM.</strong>
        <div>↝</div>
      </div>
    </div>
  )
}

function AreasPage() {
  const [selected, setSelected] = useState(areas[0].id)
  const area = areas.find((item) => item.id === selected) ?? areas[0]
  const records = useStoredRecords()
  const areaRecords = records.filter((record) => record.area.toLowerCase() === area.name.toLowerCase())
  const careerRecords = records.filter((record) => record.area.toLowerCase() === 'carreira')
  const isCareer = area.id === 'carreira'
  const tones = ['sage', 'sand', 'blue', 'stone', 'blue', 'sage', 'sand', 'stone']

  return (
    <div className="page">
      <BrandHeader />
      <header className="page-intro compact-intro">
        <Sticker tone="sage" tilt={-2}>ÁREAS</Sticker>
        <h1>Tudo que faz parte da sua vida.</h1>
        <p>Contextos permanentes. Eles continuam existindo mesmo quando os projetos mudam.</p>
      </header>

      <div className="area-card-grid">
        {areas.map((item, index) => (
          <button
            className={'area-tile tone-' + tones[index] + (selected === item.id ? ' active' : '')}
            onClick={() => setSelected(item.id)}
            key={item.id}
          >
            <span className="area-glyph" aria-hidden="true">{['↗','○','≡','⌂','↝','□','✦','· · ·'][index]}</span>
            <strong>{item.name}</strong>
            <small>{item.status}</small>
          </button>
        ))}
      </div>

      <article className="area-story">
        <div className="area-story-head">
          <div>
            <p className="eyebrow">ÁREA SELECIONADA</p>
            <h2>{area.name}</h2>
          </div>
          <Sticker tone="ink" tilt={2}>{area.status}</Sticker>
        </div>

        <div className="area-story-quote">
          <span>“</span>
          <p>{area.now}</p>
        </div>

        <div className="area-story-grid">
          <div><span>DIREÇÃO</span><strong>{area.direction}</strong></div>
          <div><span>EM ANDAMENTO</span><strong>{area.active.length ? area.active.join(' · ') : 'Sem item ativo agora'}</strong></div>
          <div><span>DECISÕES</span><strong>{area.decisions} registradas</strong></div>
          <div><span>HISTÓRICO</span><strong>2026 · 2025 · 2024</strong></div>
        </div>
      </article>

      {isCareer && (
        <section className="career-strategy">
          <div className="career-strategy-head">
            <div>
              <Sticker tone="ink" tilt={-2}>PLANO ESTRATÉGICO</Sticker>
              <h2>Carreira como direção, não só histórico.</h2>
              <p>O que você registra em Carreira passa a alimentar decisões, prioridades e próximos movimentos.</p>
            </div>
            <div className="strategy-seal" aria-hidden="true">NORTE<span>↗</span></div>
          </div>

          <div className="strategy-grid">
            <article className="strategy-card strategy-main">
              <span>NORTE</span>
              <h3>Avançar profissionalmente unindo profundidade de negócio com capacidade analítica.</h3>
              <p>O objetivo não é trocar de área por impulso, e sim construir uma evolução coerente, com repertório, evidências e opções melhores.</p>
            </article>

            <article className="strategy-card">
              <span>PRÓXIMOS 90 DIAS</span>
              <h3>Transformar experiência em evidência.</h3>
              <ul>
                <li>Documentar resultados e cases relevantes.</li>
                <li>Consolidar um portfólio enxuto e convincente.</li>
                <li>Registrar lacunas técnicas que aparecem em vagas reais.</li>
              </ul>
            </article>

            <article className="strategy-card">
              <span>12 MESES</span>
              <h3>Chegar ao próximo patamar com mais autonomia.</h3>
              <ul>
                <li>Ampliar análise, automação e dados aplicados ao negócio.</li>
                <li>Fortalecer posicionamento para oportunidades mais robustas.</li>
                <li>Usar entrevistas e vagas como fonte de inteligência de mercado.</li>
              </ul>
            </article>

            <article className="strategy-card">
              <span>ALAVANCAS</span>
              <div className="strategy-tags">
                <Sticker tone="sage">Negócio</Sticker>
                <Sticker tone="blue">Dados</Sticker>
                <Sticker tone="sand">Comunicação</Sticker>
                <Sticker tone="stone">Resultados</Sticker>
              </div>
              <p>O EU deve mostrar onde essas quatro frentes estão fortes e onde ainda precisam de atenção.</p>
            </article>
          </div>

          <div className="career-radar">
            <div className="section-heading organic-heading">
              <div>
                <p className="eyebrow">RADAR DE CARREIRA</p>
                <h2>O que você vem sinalizando</h2>
              </div>
              <span className="radar-count">{careerRecords.length} registros</span>
            </div>

            {careerRecords.length ? (
              <div className="career-signal-list">
                {careerRecords.slice(0, 6).map((record, index) => (
                  <article key={record.id}>
                    <Sticker tone={index % 3 === 0 ? 'sage' : index % 3 === 1 ? 'sand' : 'blue'} tilt={(index % 3) - 1}>{record.type}</Sticker>
                    <p>{record.text || 'Registro com anexo'}</p>
                    <span>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(record.createdAt))}</span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="career-empty">
                <Sticker tone="sand" tilt={-1}>COMECE POR AQUI</Sticker>
                <p>Registre coisas como “gostei dessa vaga”, “preciso estudar isso”, “quero chegar a pleno” ou “essa empresa me interessou”. Aos poucos o plano fica cada vez mais seu.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {!isCareer && areaRecords.length > 0 && (
        <section className="area-signals">
          <div className="section-heading organic-heading">
            <div><p className="eyebrow">SINAIS RECENTES</p><h2>O que apareceu por aqui</h2></div>
          </div>
          <div className="career-signal-list">
            {areaRecords.slice(0, 4).map((record, index) => (
              <article key={record.id}>
                <Sticker tone={index % 2 ? 'stone' : 'sage'}>{record.type}</Sticker>
                <p>{record.text || 'Registro com anexo'}</p>
                <span>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(record.createdAt))}</span>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ProjectsPage() {
  const navigate = useNavigate()

  return (
    <div className="page">
      <BrandHeader />
      <header className="page-intro compact-intro">
        <Sticker tone="sand" tilt={2}>PROJETOS</Sticker>
        <h1>Ideias que ganham uma história.</h1>
        <p>Não é uma lista de tarefas. É contexto, decisões, fase atual e o próximo movimento.</p>
      </header>

      <div className="project-story-list">
        {projects.map((project, index) => (
          <button key={project.id} className={'project-story-card project-tone-' + (index % 3)} onClick={() => navigate('/projetos/' + project.id)}>
            <div className="project-card-header">
              <Sticker tone={index === 0 ? 'sand' : index === 1 ? 'sage' : 'blue'} tilt={index % 2 ? 2 : -2}>{project.area}</Sticker>
              <span>{project.status}</span>
            </div>
            <h3>{project.name}</h3>
            <p>{project.summary}</p>
            <div className="project-progress-line">
              <span>{project.phase}</span>
              <span>{project.deadline}</span>
              <b>↗</b>
            </div>
          </button>
        ))}
      </div>

      <div className="scribble-note" aria-hidden="true">grandes planos também nascem de pequenos registros ↝</div>
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
      <BrandHeader />
      <button className="back-link" onClick={() => navigate('/projetos')}>← Voltar aos projetos</button>

      <header className="project-detail-hero">
        <div className="project-detail-labels">
          <Sticker tone="sage" tilt={-2}>{project.area}</Sticker>
          <Sticker tone="stone" tilt={2}>{project.status}</Sticker>
        </div>
        <h1>{project.name}</h1>
        <p>{project.summary}</p>
      </header>

      <div className="project-detail-strip">
        <div><span>META</span><strong>{project.deadline}</strong></div>
        <div><span>FASE</span><strong>{project.phase}</strong></div>
        <div><span>RECURSO</span><strong>{project.resource || 'Não se aplica'}</strong></div>
      </div>

      <section className="story-block">
        <Sticker tone="sand" tilt={-1}>COMO COMEÇOU</Sticker>
        <p>{project.context}</p>
      </section>

      <div className="decision-columns">
        <section>
          <p className="eyebrow">JÁ FOI DECIDIDO</p>
          {project.decisions.map((item) => <div className="decision-row done" key={item}><span>✓</span><p>{item}</p></div>)}
        </section>
        <section>
          <p className="eyebrow">PRÓXIMOS MOVIMENTOS</p>
          {project.next.map((item) => <div className="decision-row" key={item}><span>↗</span><p>{item}</p></div>)}
        </section>
      </div>

      <div className="timeline-sticker-row">
        <Sticker tone="ink" tilt={-2}>18 SET · ATUALIZADO</Sticker>
        <Sticker tone="blue" tilt={2}>INÍCIO · CONTEXTO REGISTRADO</Sticker>
      </div>
    </div>
  )
}

function ArchivePage() {
  const [query, setQuery] = useState('')
  const [facet, setFacet] = useState('Todos')
  const records = useStoredRecords()
  const dynamicItems = records.map((record) => ({
    type: record.type,
    title: record.text || 'Registro com anexo',
    meta: record.area + ' · ' + new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(record.createdAt)),
  }))
  const allItems = [...dynamicItems, ...archiveItems]
  const filtered = allItems.filter((item) => {
    const matchesQuery = (item.title + item.type + item.meta).toLowerCase().includes(query.toLowerCase())
    const matchesFacet = facet === 'Todos' || item.type.toLowerCase().includes(facet.toLowerCase())
    return matchesQuery && matchesFacet
  })
  const facets = ['Todos', 'Gostei', 'Pesquisa', 'Preciso fazer', 'Decisão', 'Projeto', 'Referência']

  return (
    <div className="page">
      <BrandHeader />
      <header className="page-intro archive-intro">
        <Sticker tone="blue" tilt={-2}>ARQUIVO</Sticker>
        <h1>Encontre qualquer coisa da sua vida.</h1>
        <p>O que você viveu, pensou, decidiu, gostou ou quis guardar.</p>
      </header>

      <div className="archive-search-wrap">
        <span aria-hidden="true">⌕</span>
        <input className="archive-search" placeholder="Buscar no seu arquivo..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      <div className="facet-row organic-facets">
        {facets.map((item) => (
          <button className={facet === item ? 'active' : ''} onClick={() => setFacet(item)} key={item}>{item}</button>
        ))}
      </div>

      <div className="archive-results organic-archive">
        {filtered.map((item, index) => (
          <article key={item.type + item.title + index}>
            <div className={'archive-symbol symbol-' + (index % 4)} aria-hidden="true">{['✦','○','↗','≡'][index % 4]}</div>
            <div>
              <Sticker tone={index % 2 ? 'stone' : 'sage'} tilt={index % 2 ? 1 : -1}>{item.type}</Sticker>
              <h3>{item.title}</h3>
              <p>{item.meta}</p>
            </div>
          </article>
        ))}
        {!filtered.length && <div className="empty-state"><Sticker tone="sand">NADA AQUI AINDA</Sticker><p>Tente outro termo ou outro tipo de registro.</p></div>}
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
      <BrandHeader />
      <header className="page-intro compact-intro">
        <Sticker tone="blue" tilt={-2}>CHATGPT → EU</Sticker>
        <h1>{text ? 'Isso merece ficar.' : 'Nada para importar.'}</h1>
        <p>{text ? 'Confira antes de guardar no arquivo local deste iPhone.' : 'Este link não contém um registro válido.'}</p>
      </header>

      {text && (
        <article className="capture-card">
          <div className="capture-card-meta"><Sticker tone="sand">{type}</Sticker><Sticker tone="sage">{area}</Sticker></div>
          <p>{text}</p>
        </article>
      )}

      {state === 'saved' ? (
        <div className="capture-success">
          <Sticker tone="ink">GUARDADO</Sticker>
          <h2>Entrou no seu EU.</h2>
          <div className="backup-actions">
            <button className="primary-button" onClick={() => navigate('/arquivo')}>Ver no Arquivo</button>
            <button className="secondary-button" onClick={() => navigate('/')}>Voltar ao Hoje</button>
          </div>
        </div>
      ) : text ? (
        <div className="capture-actions">
          <button className="primary-button" onClick={save} disabled={state === 'saving'}>{state === 'saving' ? 'Guardando…' : 'Guardar no EU'}</button>
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
      <BrandHeader />

      <header className="me-hero">
        <div className="me-monogram">
          <span>EU</span>
          <small>PROCESSO<br />SEMPRE</small>
        </div>
        <div>
          <Sticker tone="blue" tilt={-2}>EM CONSTANTE CONSTRUÇÃO</Sticker>
          <h1>Cauê</h1>
          <p>28 anos</p>
        </div>
      </header>

      <section className="me-phase-card">
        <Sticker tone="sage" tilt={-2}>MINHA FASE</Sticker>
        <h2>Construindo uma vida mais intencional e alinhada com o que importa.</h2>
        <div className="handwritten-accent">mais eu. menos ruído. ↝</div>
      </section>

      <section className="me-links-grid">
        <article><span>01</span><h3>Trabalho</h3><p>Custos, controladoria, análise e uma direção crescente para dados.</p></article>
        <article><span>02</span><h3>Estudos</h3><p>Formação, dados, idiomas e repertório aplicado.</p></article>
        <article><span>03</span><h3>Objetivos</h3><p>Avançar sem perder contexto do que realmente importa.</p></article>
        <article><span>04</span><h3>Interesses</h3><p>Tecnologia, leitura, design, viagens e boas referências.</p></article>
      </section>

      <section className="interest-cloud">
        <div className="section-heading organic-heading">
          <div><p className="eyebrow">MAPA PESSOAL</p><h2>Preferências</h2></div>
        </div>
        <div className="interest-tags">
          {['Tecnologia', 'Viagens', 'Leitura', 'Design', 'Dados', 'Bem-estar', 'Relógios', 'Perfumes', 'Séries', 'Organização'].map((item, index) => (
            <Sticker key={item} tone={index % 3 === 0 ? 'sage' : index % 3 === 1 ? 'sand' : 'blue'} tilt={(index % 3) - 1}>{item}</Sticker>
          ))}
        </div>
      </section>

      <div className="history-links organic-history">
        <button><Sticker tone="sand">2026</Sticker><strong>Ver meu ano</strong><b>↗</b></button>
        <button><Sticker tone="blue">HISTÓRIA</Sticker><strong>Minha linha do tempo</strong><b>↗</b></button>
      </div>

      <section className="backup-block">
        <Sticker tone="stone" tilt={-1}>DADOS DESTE IPHONE</Sticker>
        <h2>Seu arquivo fica com você.</h2>
        <p>Sem conta e sem servidor pago. Faça backup de vez em quando para não depender apenas do armazenamento do navegador.</p>
        <div className="backup-actions">
          <button className="primary-button" onClick={handleExport}>Criar backup</button>
          <label className="secondary-button">Restaurar backup<input type="file" accept="application/json,.json" onChange={handleImport} /></label>
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
