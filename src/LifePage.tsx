import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { areas, projects } from './data'
import { periodStory } from './intelligence'
import { captureCurrentLifeSnapshot } from './snapshots'
import { useBridges, useMoodHistory, useRecords } from './appState'
import { BrandTop, EuIcon, SectionTitle, Tag, formatShortDate, typeTone, type EuIconName } from './v2Ui'
import { isRecordVisibleForInsights } from './storage'
import { deriveBeforeNow, deriveLifeStats, getFocusAreas, setFocusAreas } from './uxFeatures'
import { deriveOneEuConnections } from './oneEu'
import OneEuConnections from './OneEuConnections'

function topRecords(records: ReturnType<typeof useRecords>, predicate: (type: string) => boolean, limit = 3) {
  return records.filter((record) => predicate(record.type.toLowerCase())).slice(0, limit)
}

const areaIcons: Record<string, EuIconName> = {
  carreira: 'briefcase',
  dinheiro: 'wallet',
  estudos: 'book',
  casa: 'home',
  viagens: 'plane',
  compras: 'bag',
  lazer: 'sparkles',
  pessoal: 'user',
}

export default function LifePage() {
  const records = useRecords()
  const moods = useMoodHistory()
  const { bridges } = useBridges()
  const [view, setView] = useState<'map' | 'moving' | 'you'>(() => {
    const saved = localStorage.getItem('eu-life-view')
    return saved === 'moving' || saved === 'you' ? saved : 'map'
  })
  const [focusAreas, setFocusAreasState] = useState(() => getFocusAreas())

  const visibleRecords = records.filter(isRecordVisibleForInsights)
  const active = visibleRecords.filter((record) => record.status === 'active')
  const wishes = topRecords(visibleRecords, (type) => type.includes('desejo') || type.includes('pesquisa') || type.includes('prefer'), 6)
  const goals = topRecords(visibleRecords, (type) => type.includes('objetivo') || type.includes('curso') || type.includes('pend'), 6)
  const monthStory = periodStory(visibleRecords, 30)
  const someday = visibleRecords.filter((record) => record.someday || record.type === 'Depois').slice(0, 8)
  const beforeNow = useMemo(() => deriveBeforeNow(visibleRecords), [records])
  const stats = useMemo(() => deriveLifeStats(visibleRecords, moods), [records, moods])
  const oneEuConnections = useMemo(() => deriveOneEuConnections(visibleRecords, bridges), [visibleRecords, bridges])

  const areaStates = useMemo(() => {
    const bridgeForArea: Record<string, string | undefined> = {
      Dinheiro: 'folego',
      Estudos: 'repertorio',
      Pessoal: 'traco',
    }

    return areas.map((area) => {
      const areaRecords = visibleRecords
        .filter((record) => record.area === area.name)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const activeRecords = areaRecords.filter((record) => record.status === 'active')
      const dueRecords = activeRecords.filter((record) => record.followUpAt && new Date(record.followUpAt).getTime() <= Date.now())
      const recentCutoff = Date.now() - 21 * 86400000
      const recentRecords = areaRecords.filter((record) => new Date(record.createdAt).getTime() >= recentCutoff)
      const lead = dueRecords[0] || activeRecords.find((record) => record.nextMove?.trim()) || recentRecords[0] || areaRecords[0]
      const bridgeId = bridgeForArea[area.name]
      const source = bridgeId ? bridges.find((card) => card.id === bridgeId) : undefined
      const state = dueRecords.length ? 'attention' : activeRecords.length || recentRecords.length || source?.bridge ? 'moving' : 'quiet'
      const stateLabel = state === 'attention' ? 'pede atenção' : state === 'moving' ? 'em movimento' : 'quieta'
      const href = area.id === 'dinheiro' ? '/dinheiro' : '/vida/area/' + area.id
      const sourceLabel = source?.bridge ? source.title : null
      const copy = source?.bridge?.summary || lead?.nextMove || lead?.text || area.now

      return {
        ...area,
        href,
        state,
        stateLabel,
        sourceLabel,
        copy,
        count: areaRecords.length,
        activeCount: activeRecords.length,
        latestAt: lead?.createdAt || null,
      }
    }).sort((a, b) => {
      const score = (item: typeof a) => (focusAreas.includes(item.name) ? 30 : 0) + (item.state === 'attention' ? 20 : item.state === 'moving' ? 10 : 0) + item.activeCount
      return score(b) - score(a)
    })
  }, [visibleRecords, bridges, focusAreas])

  useEffect(() => {
    captureCurrentLifeSnapshot(visibleRecords, bridges)
  }, [records, bridges])

  function selectView(value: 'map' | 'moving' | 'you') {
    setView(value)
    localStorage.setItem('eu-life-view', value)
  }

  function toggleFocus(area: string) {
    const next = focusAreas.includes(area)
      ? focusAreas.filter((item) => item !== area)
      : [...focusAreas, area].slice(-3)
    setFocusAreasState(setFocusAreas(next))
  }

  return (
    <div className={'v2-page life-page life-view-' + view}>
      <BrandTop />

      <header className="v2-hero life-fluid-hero">
        <Tag tone="green">VIDA</Tag>
        <h1>Sua vida,<br />vista de cima.</h1>
        <p>Um mapa vivo do que está andando, do que está quieto e do que merece mais espaço agora.</p>
      </header>

      <nav className="life-view-tabs fluid-tabs life-map-tabs-v40" aria-label="Visões da Vida" role="tablist">
        <button role="tab" aria-selected={view === 'map'} className={view === 'map' ? 'active' : ''} onClick={() => selectView('map')}><EuIcon name="compass" />Mapa</button>
        <button role="tab" aria-selected={view === 'moving'} className={view === 'moving' ? 'active' : ''} onClick={() => selectView('moving')}><EuIcon name="bolt" />Em movimento</button>
        <button role="tab" aria-selected={view === 'you'} className={view === 'you' ? 'active' : ''} onClick={() => selectView('you')}><EuIcon name="user" />Você</button>
      </nav>

      {view === 'map' && (
        <>
          <section className="life-map-intro-v40">
            <div>
              <small>SEU MAPA</small>
              <h2>Onde sua vida está mexendo.</h2>
              <p>Áreas com movimento sobem. Áreas quietas continuam aqui sem disputar sua atenção.</p>
            </div>
            {focusAreas.length > 0 && (
              <button onClick={() => setFocusAreasState(setFocusAreas([]))}><EuIcon name="x" />limpar foco</button>
            )}
          </section>

          <section className="life-map-grid-v40" aria-label="Mapa das áreas da vida">
            {areaStates.map((area, index) => (
              <article
                key={area.id}
                className={'life-map-card-v40 state-' + area.state + ' area-' + area.id + (focusAreas.includes(area.name) ? ' is-focus' : '') + ' map-card-' + index}
              >
                <div className="life-map-card-top-v40">
                  <span className="life-map-icon-v40"><EuIcon name={areaIcons[area.id] || 'sparkles'} /></span>
                  <button
                    className={focusAreas.includes(area.name) ? 'is-active' : ''}
                    onClick={() => toggleFocus(area.name)}
                    aria-label={(focusAreas.includes(area.name) ? 'Remover ' : 'Adicionar ') + area.name + ' do foco'}
                    aria-pressed={focusAreas.includes(area.name)}
                  ><EuIcon name="pin" /></button>
                </div>
                <NavLink to={area.href} className="life-map-card-main-v40">
                  <div className="life-map-state-v40">
                    <i />
                    <span>{area.stateLabel}</span>
                    {area.sourceLabel && <em>via {area.sourceLabel}</em>}
                  </div>
                  <h3>{area.name}</h3>
                  <p>{area.copy}</p>
                  <div className="life-map-meta-v40">
                    <span>{area.activeCount ? area.activeCount + (area.activeCount === 1 ? ' assunto vivo' : ' assuntos vivos') : area.count ? area.count + ' registros' : 'sem pressão agora'}</span>
                    <EuIcon name="arrow-up-right" />
                  </div>
                </NavLink>
              </article>
            ))}
          </section>

          <section className="life-map-focus-v40">
            <div><small>FOCO DO MOMENTO</small><strong>{focusAreas.length ? focusAreas.join(' · ') : 'Nenhuma área precisa dominar seu dia.'}</strong></div>
            <span>{focusAreas.length}/3</span>
          </section>

          <OneEuConnections items={oneEuConnections} limit={2} title="Onde suas áreas se encontram." />
        </>
      )}

      {view === 'moving' && (
        <>
          <section className={'life-moving-summary-v40' + (active.length + wishes.length + someday.length === 0 ? ' is-empty' : '')}>
            <div><small>EM MOVIMENTO</small><h2>O que ainda tem história aberta.</h2><p>Projetos, metas, desejos e próximos passos ficam juntos aqui — sem transformar tudo em urgência.</p></div>
            <div>
              <span><strong>{active.length}</strong> vivos</span>
              <span><strong>{wishes.length}</strong> desejos</span>
              <span><strong>{someday.length}</strong> depois</span>
            </div>
          </section>

          <OneEuConnections items={oneEuConnections} limit={2} compact title="O que também mexe em outra área." />

          <section className="life-block life-moving-primary-v40">
            <SectionTitle eyebrow="AGORA" title="Projetos, metas e começos" />
            <div className="life-list-cards">
              {active.slice(0, 8).map((record) => (
                <NavLink key={record.id} className={'life-list-card tappable-card record-link-card type-border-' + typeTone(record.type) + (record.pinned ? ' pinned' : '')} to={'/registro/' + record.id}>
                  <div><Tag tone={record.pinned ? 'cobalt' : typeTone(record.type)}>{record.pinned ? 'FIXADO' : record.type}</Tag><span>{record.area}</span></div>
                  <h3>{record.text}</h3>
                  <p>{record.nextMove || 'Em acompanhamento desde ' + formatShortDate(record.startedAt || record.createdAt) + '.'}</p>
                </NavLink>
              ))}
              {!active.length && projects.slice(0, 3).map((project) => (
                <article key={project.id} className="life-list-card type-border-coral">
                  <div><Tag tone="coral">Projeto</Tag><span>{project.area}</span></div>
                  <h3>{project.name}</h3><p>{project.summary}</p>
                </article>
              ))}
            </div>
          </section>

          <details className="life-fold" open>
            <summary><span><small>DESEJOS</small><strong>Coisas que chamaram sua atenção</strong></span><b className="fold-icon"><EuIcon name="plus" /></b></summary>
            <div className="compact-stack">
              {wishes.length ? wishes.map((record) => (
                <NavLink key={record.id} className="compact-record-link" to={'/registro/' + record.id}>
                  <Tag tone="pink">{record.type}</Tag><p>{record.text}</p>
                </NavLink>
              )) : <p className="muted-copy">Quando você disser “gostei” ou “andei pesquisando pra comprar”, aparece aqui.</p>}
            </div>
          </details>

          <details className="life-fold" open>
            <summary><span><small>PRÓXIMOS PASSOS</small><strong>Coisas que pedem continuidade</strong></span><b className="fold-icon"><EuIcon name="plus" /></b></summary>
            <div className="compact-stack">
              {goals.length ? goals.map((record) => (
                <NavLink key={record.id} className="compact-record-link" to={'/registro/' + record.id}>
                  <Tag tone="coral">{record.type}</Tag><p>{record.text}</p>
                </NavLink>
              )) : <p className="muted-copy">Cursos, objetivos e pendências vivas aparecem aqui.</p>}
            </div>
          </details>

          <details className="life-fold">
            <summary><span><small>DEPOIS</small><strong>Futuro sem pressão</strong></span><b className="fold-icon"><EuIcon name="plus" /></b></summary>
            <div className="someday-grid">
              {someday.length ? someday.map((record) => (
                <NavLink key={record.id} to={'/registro/' + record.id} className="someday-card">
                  <Tag tone="lilac">{record.type}</Tag><p>{record.text}</p><span>não está cobrando você agora</span>
                </NavLink>
              )) : <p className="muted-copy">Coisas de “um dia eu quero…” moram aqui.</p>}
            </div>
          </details>
        </>
      )}

      {view === 'you' && (
        <>
          <section className="life-phase-v40">
            <div className="life-phase-copy-v40">
              <small>SUA FASE</small>
              <h2>{beforeNow.current.topArea || 'Sua vida está ganhando forma.'}</h2>
              <p>{monthStory.text}</p>
              {monthStory.topArea && <Tag tone="green">{monthStory.topArea} mais presente neste mês</Tag>}
            </div>
            <div className="life-phase-metrics-v40">
              <span><strong>{stats.active}</strong> em movimento</span>
              <span><strong>{stats.completed}</strong> ciclos fechados</span>
              <span><strong>{stats.moods}</strong> check-ins</span>
            </div>
            <div className="life-phase-shift-v40">
              <article><small>30–60 DIAS</small><strong>{beforeNow.previous.topArea || 'mais quieta'}</strong><span>{beforeNow.previous.count} registros</span></article>
              <EuIcon name="arrow-right" />
              <article><small>AGORA</small><strong>{beforeNow.current.topArea || 'ganhando forma'}</strong><span>{beforeNow.current.count} registros</span></article>
            </div>
          </section>

          <section className="life-block self-tools-block">
            <SectionTitle eyebrow="VOCÊ" title="Olhar a vida de outros ângulos" />
            <div className="self-tools-grid">
              <NavLink to="/vida/quem-sou" className="self-tool-card self-tool-lilac"><i className="self-tool-icon"><EuIcon name="user" /></i><Tag tone="lilac">QUEM EU SOU AGORA</Tag><h3>Uma identidade viva.</h3><p>O que anda definindo esta fase.</p><span>ver agora <EuIcon name="arrow-up-right" /></span></NavLink>
              <NavLink to="/vida/capitulos" className="self-tool-card self-tool-sky"><i className="self-tool-icon"><EuIcon name="collections" /></i><Tag tone="sky">CAPÍTULOS</Tag><h3>Quando um assunto vira história.</h3><p>Fases e temas que atravessaram o tempo.</p><span>abrir capítulos <EuIcon name="arrow-up-right" /></span></NavLink>
              <NavLink to="/vida/wrapped" className="self-tool-card self-tool-cobalt"><i className="self-tool-icon"><EuIcon name="sparkles" /></i><Tag tone="cobalt">EU WRAPPED</Tag><h3>Seu ano sem KPI corporativo.</h3><p>Decisões, desejos, ciclos e momentos.</p><span>ver retrospectiva <EuIcon name="arrow-up-right" /></span></NavLink>
              <NavLink to="/vida/lab" className="self-tool-card self-tool-lab"><i className="self-tool-icon"><EuIcon name="bolt" /></i><Tag tone="wine">EU LAB</Tag><h3>Ver o que está mudando por baixo.</h3><p>Radar, Life Graph, cápsulas e decisões.</p><span>abrir laboratório <EuIcon name="arrow-up-right" /></span></NavLink>
            </div>
          </section>

          <section className="life-block plans-block">
            <SectionTitle eyebrow="PLANOS" title="Pra onde isso tudo está indo" />
            <div className="plan-grid">
              <NavLink to="/vida/carreira" className="plan-card career-plan-card"><i className="plan-card-icon"><EuIcon name="briefcase" /></i><Tag tone="green">PLANO DE CARREIRA</Tag><h3>Seu caminho profissional.</h3><p>Direção, competências, lacunas e sinais dos seus registros.</p><span>abrir plano <EuIcon name="arrow-up-right" /></span></NavLink>
              <article className="plan-card life-plan-card"><i className="plan-card-icon"><EuIcon name="home" /></i><Tag tone="lilac">PLANO DE VIDA</Tag><h3>O conjunto importa.</h3><p>Trabalho, dinheiro, estudos, relações, experiências e escolhas vistos juntos.</p><span>fica mais inteligente com o uso</span></article>
              <NavLink to="/vida/astrologia" className="plan-card astrology-plan-card"><i className="plan-card-icon"><EuIcon name="moon" /></i><Tag tone="amber">MAPAS + CÉU</Tag><h3>Astrologia dentro do arquivo.</h3><p>Mapa local privado + céu diário calculado no aparelho.</p><span>abrir astrologia <EuIcon name="arrow-up-right" /></span></NavLink>
            </div>
          </section>

          <section className="life-block phases-entry-block">
            <NavLink to="/vida/fases" className="phases-entry-card">
              <i className="phases-entry-icon"><EuIcon name="clock" /></i>
              <div><Tag tone="cobalt">SUAS FASES</Tag><h2>Você de antes × você de agora.</h2><p>Retratos mensais para perceber como seus assuntos e movimentos mudam.</p></div>
              <span>ver fases <EuIcon name="arrow-up-right" /></span>
            </NavLink>
          </section>
        </>
      )}
    </div>
  )
}

export function CareerPlanPage() {
  const records = useRecords()
  const career = records.filter((record) => isRecordVisibleForInsights(record) && record.area === 'Carreira')
  const gaps = career.filter((record) => /preciso|estudar|curso|sql|power bi|python|dados/i.test(record.text)).slice(0, 5)
  const interests = career.filter((record) => /vaga|empresa|gostei|interess/i.test(record.text)).slice(0, 5)
  const decisions = career.filter((record) => record.type === 'Decisão').slice(0, 5)

  return (
    <div className="v2-page career-v2">
      <BrandTop />
      <NavLink className="back-v2" to="/vida"><EuIcon name="arrow-left" />Vida</NavLink>

      <header className="career-hero-v2">
        <Tag tone="green">PLANO DE CARREIRA</Tag>
        <h1>Finance Analytics<br />como destino.</h1>
        <p>Custos e controladoria continuam sendo sua vantagem. Dados entram como multiplicador, não como recomeço.</p>
      </header>

      <div className="career-road">
        <article><span>AGORA</span><strong>Custos + Controladoria</strong><p>SAP, Power BI, margem, inventário e visão industrial.</p></article>
        <b className="flow-arrow"><EuIcon name="arrow-right" /></b>
        <article><span>PRÓXIMO</span><strong>Pleno + Analytics</strong><p>SQL, portfólio forte, automação e posicionamento.</p></article>
        <b className="flow-arrow"><EuIcon name="arrow-right" /></b>
        <article><span>DESTINO</span><strong>Finance Analytics</strong><p>Senior, Specialist ou Lead com escopo mais amplo.</p></article>
      </div>

      <section className="career-v2-grid">
        <article className="career-v2-card big">
          <Tag tone="ink">NORTE</Tag>
          <h2>Virar um profissional raro na interseção entre finanças, indústria e dados.</h2>
          <p>O EU vai recalibrar esse plano conforme você registrar vagas, cursos, decisões, lacunas e resultados reais.</p>
        </article>
        <article className="career-v2-card">
          <Tag tone="amber">90 DIAS</Tag>
          <h3>Transformar experiência em evidência.</h3>
          <p>Portfólio, cases reais, SQL, Power BI e uma narrativa profissional que mostre impacto.</p>
        </article>
        <article className="career-v2-card">
          <Tag tone="coral">12 MESES</Tag>
          <h3>Subir sem apagar sua senioridade.</h3>
          <p>Mirar funções híbridas: Cost Analytics, Finance Analytics, Controlling Pleno e Performance.</p>
        </article>
      </section>

      <section className="career-live">
        <SectionTitle eyebrow="RADAR" title="O plano aprende com você" />
        <div className="career-live-grid">
          <article>
            <Tag tone="coral">LACUNAS</Tag>
            {gaps.length ? gaps.map((item) => <p key={item.id}>{item.text}</p>) : <p>Registre cursos, tecnologias e coisas que você percebe que precisa aprender.</p>}
          </article>
          <article>
            <Tag tone="pink">INTERESSES</Tag>
            {interests.length ? interests.map((item) => <p key={item.id}>{item.text}</p>) : <p>Vagas, empresas e caminhos que chamarem sua atenção entram aqui.</p>}
          </article>
          <article>
            <Tag tone="green">DECISÕES</Tag>
            {decisions.length ? decisions.map((item) => <p key={item.id}>{item.text}</p>) : <p>As decisões profissionais ficam registradas para o plano não perder contexto.</p>}
          </article>
        </div>
      </section>
    </div>
  )
}
