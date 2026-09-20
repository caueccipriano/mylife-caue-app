import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { areas, projects } from './data'
import { periodStory } from './intelligence'
import { deriveEcosystemInsights } from './ecosystem'
import { captureCurrentLifeSnapshot } from './snapshots'
import { useBridges, useMoodHistory, useRecords } from './appState'
import { BrandTop, EuIcon, SectionTitle, Tag, formatShortDate, typeTone, type EuIconName } from './v2Ui'
import { isRecordVisibleForInsights } from './storage'
import { deriveBeforeNow, deriveLifeStats, getFocusAreas, setFocusAreas } from './uxFeatures'

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
  const { bridges, refreshing, forceRefresh } = useBridges()
  const [view, setView] = useState<'overview' | 'areas' | 'moving' | 'you'>('overview')
  const [focusAreas, setFocusAreasState] = useState(() => getFocusAreas())

  const visibleRecords = records.filter(isRecordVisibleForInsights)
  const active = visibleRecords.filter((record) => record.status === 'active')
  const wishes = topRecords(visibleRecords, (type) => type.includes('desejo') || type.includes('pesquisa') || type.includes('prefer'), 6)
  const goals = topRecords(visibleRecords, (type) => type.includes('objetivo') || type.includes('curso') || type.includes('pend'), 6)
  const recentByArea = (area: string) => visibleRecords.filter((record) => record.area === area).slice(0, 2)
  const monthStory = periodStory(visibleRecords, 30)
  const someday = visibleRecords.filter((record) => record.someday || record.type === 'Depois').slice(0, 8)
  const ecosystemInsights = deriveEcosystemInsights(visibleRecords, bridges)
  const beforeNow = useMemo(() => deriveBeforeNow(visibleRecords), [records])
  const stats = useMemo(() => deriveLifeStats(visibleRecords, moods), [records, moods])

  useEffect(() => {
    captureCurrentLifeSnapshot(visibleRecords, bridges)
  }, [records, bridges])

  function toggleFocus(area: string) {
    const next = focusAreas.includes(area)
      ? focusAreas.filter((item) => item !== area)
      : [...focusAreas, area].slice(-3)
    setFocusAreasState(setFocusAreas(next))
  }

  return (
    <div className="v2-page life-page">
      <BrandTop />

      <header className="v2-hero">
        <Tag tone="green">VIDA</Tag>
        <h1>O que está<br />tomando forma.</h1>
        <p>Áreas, planos, desejos e coisas que você começou — agora separados para você achar tudo mais rápido.</p>
      </header>

      <nav className="life-view-tabs" aria-label="Visões da Vida">
        <button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}><EuIcon name="sparkles" />Visão geral</button>
        <button className={view === 'areas' ? 'active' : ''} onClick={() => setView('areas')}><EuIcon name="collections" />Áreas</button>
        <button className={view === 'moving' ? 'active' : ''} onClick={() => setView('moving')}><EuIcon name="bolt" />Em movimento</button>
        <button className={view === 'you' ? 'active' : ''} onClick={() => setView('you')}><EuIcon name="user" />Você</button>
      </nav>

      {view === 'overview' && (
        <>
          <section className="life-block focus-panel">
            <SectionTitle eyebrow="FOCO DO MOMENTO" title="O que merece mais espaço agora" />
            <p className="muted-copy">Escolha até 3 áreas. O EU usa isso para ordenar “Continuar” e destacar o que importa sem esconder o resto.</p>
            <div className="focus-area-chips">
              {areas.map((area) => (
                <button key={area.id} className={focusAreas.includes(area.name) ? 'active' : ''} onClick={() => toggleFocus(area.name)}>
                  {area.name}
                </button>
              ))}
            </div>
          </section>

          <section className="life-block stats-panel">
            <SectionTitle eyebrow="VOCÊ EM NÚMEROS" title="Só o bastante para enxergar a fase" />
            <div className="life-stats-grid">
              <article><strong>{stats.active}</strong><span>em movimento</span></article>
              <article><strong>{stats.wishes}</strong><span>desejos/pesquisas</span></article>
              <article><strong>{stats.completed}</strong><span>ciclos fechados</span></article>
              <article><strong>{stats.areas}</strong><span>áreas vivas</span></article>
              <article><strong>{stats.favorites}</strong><span>favoritos</span></article>
              <article><strong>{stats.moods}</strong><span>check-ins de humor</span></article>
            </div>
          </section>

          <section className="life-block before-now-panel">
            <SectionTitle eyebrow="ANTES × AGORA" title="O que mudou nos últimos dois meses" />
            <div className="before-now-grid">
              <article>
                <Tag tone="muted">ANTES · 30–60 DIAS</Tag>
                <h3>{beforeNow.previous.topArea || 'fase mais quieta'}</h3>
                <p>{beforeNow.previous.count} registros · {beforeNow.previous.completed} concluídos</p>
                <div>{beforeNow.previous.topTags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
              </article>
              <b className="flow-arrow"><EuIcon name="arrow-right" /></b>
              <article>
                <Tag tone="cobalt">AGORA · 30 DIAS</Tag>
                <h3>{beforeNow.current.topArea || 'ganhando forma'}</h3>
                <p>{beforeNow.current.count} registros · {beforeNow.current.completed} concluídos</p>
                <div>{beforeNow.current.topTags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
              </article>
            </div>
          </section>

          <section className="life-block month-story-block">
            <SectionTitle eyebrow="SEU MÊS" title="O que tomou espaço na sua vida" />
            <article className="month-story-card">
              <div><strong>{monthStory.count}</strong><span>coisas registradas</span></div>
              <p>{monthStory.text}</p>
              {monthStory.topArea && <Tag tone="green">{monthStory.topArea} foi a área mais presente</Tag>}
            </article>
          </section>

          <section className="life-block" id="sinais">
            <SectionTitle
              eyebrow="SINAIS"
              title="O que seus apps estão contando"
              action={<button className="quiet-link" disabled={refreshing} onClick={() => void forceRefresh()}><EuIcon name="refresh" />{refreshing ? 'atualizando…' : 'atualizar'}</button>}
            />
            <div className="signals-life-grid">
              {bridges.map((card) => (
                <article key={card.id}>
                  <div className="signal-title-row"><strong>{card.title}</strong><span className={card.bridge ? 'signal-dot on' : 'signal-dot'} /></div>
                  <p>{card.bridge?.summary || 'Abra o app uma vez para o EU receber o resumo.'}</p>
                  <small>{card.stale ? 'resumo antigo · atualizar' : card.bridge?.status || 'aguardando'}</small>
                </article>
              ))}
            </div>
            {ecosystemInsights.length > 0 && (
              <div className="ecosystem-insights">
                {ecosystemInsights.slice(0, 3).map((insight) => (
                  <article key={insight.id} className={'ecosystem-insight insight-' + insight.tone}>
                    <Tag tone={insight.tone}>CONEXÃO</Tag>
                    <h3>{insight.title}</h3>
                    <p>{insight.detail}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {view === 'areas' && (
        <section className="life-block life-view-section">
          <SectionTitle eyebrow="ÁREAS" title="Cada parte da sua vida, no lugar dela" />
          <div className="area-grid-v4">
            {areas.map((area) => {
              const recent = recentByArea(area.name)
              const count = visibleRecords.filter((record) => record.area === area.name).length
              return (
                <NavLink
                  className={'life-area area-semantic-' + area.id + (focusAreas.length && !focusAreas.includes(area.name) ? ' focus-dimmed' : '')}
                  key={area.id}
                  to={'/vida/area/' + area.id}
                >
                  <span className="life-area-icon"><EuIcon name={areaIcons[area.id] || 'sparkles'} /></span>
                  <strong>{area.name}</strong>
                  <p>{recent[0]?.text || area.now}</p>
                  <small>{count ? count + ' registros' : area.status}</small>
                  {focusAreas.includes(area.name) && <Tag tone="cobalt">FOCO</Tag>}
                </NavLink>
              )
            })}
          </div>
        </section>
      )}

      {view === 'moving' && (
        <>
          <section className="life-block">
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
