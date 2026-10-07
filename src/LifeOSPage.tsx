import { useMemo } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { areas } from './data'
import { useBridges, useChatInbox, useRecords } from './appState'
import { activeFollowUps, isRecordVisibleForInsights, type StoredRecord } from './storage'
import { reviewCandidates } from './intelligence'
import { BrandTop, EuIcon, SectionTitle, Tag, formatShortDate, typeTone } from './v2Ui'
import { buildContextBootstrap, buildWeeklyReset, deriveCarryOver, deriveCrossSignals, deriveLifeOSScouts, deriveProjectHandoff, deriveWaiting, isWaitingRecord } from './lifeOSIntelligence'
import { autonomyRules, buildLifeOSSources } from './lifeOSSources'
import { deriveLivingGoals } from './adaptiveLife'

type SystemView = 'panel' | 'goals' | 'projects' | 'agenda'

type AgendaItem = {
  id: string
  at: string
  kind: 'followup' | 'capsule'
  record: StoredRecord
}

function isType(record: StoredRecord, needles: string[]) {
  const value = record.type.toLowerCase()
  return needles.some((needle) => value.includes(needle))
}

function recordTimestamp(record: StoredRecord) {
  return new Date(record.updatedAt || record.createdAt).getTime()
}

function relativeDay(value: string) {
  const target = new Date(value)
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const day = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  const diff = Math.round((day - start) / 86400000)
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'amanhã'
  if (diff === -1) return 'ontem'
  if (diff > 1 && diff < 7) return 'em ' + diff + ' dias'
  if (diff < -1 && diff > -7) return Math.abs(diff) + ' dias atrás'
  return formatShortDate(value)
}

function nextAction(record: StoredRecord) {
  if (record.nextMove?.trim()) return record.nextMove.trim()
  if (record.followUpAt) return 'Retomar ' + relativeDay(record.followUpAt)
  if (record.progressLevel === 'almost') return 'Fechar o que falta'
  if (record.progressLevel === 'half') return 'Continuar do meio'
  if (record.progressLevel === 'quarter' || record.progressLevel === 'started') return 'Dar o próximo passo'
  return 'Definir próximo passo'
}

function compactText(value: string, size = 92) {
  const clean = value.trim()
  return clean.length > size ? clean.slice(0, size - 1).trimEnd() + '…' : clean
}

export default function LifeOSPage() {
  const records = useRecords()
  const inbox = useChatInbox()
  const { bridges } = useBridges()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawView = searchParams.get('view')
  const view: SystemView = rawView === 'goals' || rawView === 'projects' || rawView === 'agenda' ? rawView : 'panel'

  const visible = useMemo(() => records.filter((record) => isRecordVisibleForInsights(record)), [records])
  const active = useMemo(() => visible.filter((record) => record.status === 'active'), [visible])
  const followups = useMemo(() => activeFollowUps(visible), [visible])
  const due = useMemo(() => followups.filter((item) => item.due).map((item) => item.record), [followups])
  const waiting = useMemo(() => deriveWaiting(visible), [visible])
  const carryOver = useMemo(() => deriveCarryOver(visible), [visible])
  const actionDue = useMemo(() => due.filter((record) => !isWaitingRecord(record)), [due])
  const weeklyReset = useMemo(() => buildWeeklyReset(visible), [visible])
  const scouts = useMemo(() => deriveLifeOSScouts(visible, inbox.length), [visible, inbox.length])
  const bootstrap = useMemo(() => buildContextBootstrap(visible), [visible])
  const crossSignals = useMemo(() => deriveCrossSignals(visible), [visible])
  const sources = useMemo(() => buildLifeOSSources(bridges), [bridges])
  const review = useMemo(() => reviewCandidates(visible), [visible])

  const goals = useMemo(() => (
    visible
      .filter((record) => isType(record, ['objetivo', 'meta']))
      .filter((record) => record.status !== 'completed' && record.status !== 'abandoned')
      .sort((a, b) => recordTimestamp(b) - recordTimestamp(a))
  ), [visible])

  const livingGoals = useMemo(() => deriveLivingGoals(visible), [visible])

  const projects = useMemo(() => (
    visible
      .filter((record) => isType(record, ['projeto']))
      .filter((record) => record.status !== 'completed' && record.status !== 'abandoned')
      .sort((a, b) => recordTimestamp(b) - recordTimestamp(a))
  ), [visible])

  const agenda = useMemo(() => {
    const items: AgendaItem[] = []
    visible.forEach((record) => {
      if (record.followUpAt && record.status === 'active') {
        items.push({ id: record.id + '-followup', at: record.followUpAt, kind: 'followup', record })
      }
      if (record.revealAt && !record.capsuleOpenedAt) {
        items.push({ id: record.id + '-capsule', at: record.revealAt, kind: 'capsule', record })
      }
    })
    return items.sort((a, b) => a.at.localeCompare(b.at))
  }, [visible])

  const completedThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000
    return visible.filter((record) => {
      if (record.status !== 'completed') return false
      const value = record.completedAt || record.updatedAt || record.createdAt
      return new Date(value).getTime() >= cutoff
    }).length
  }, [visible])

  const stale = useMemo(() => {
    const cutoff = Date.now() - 21 * 86400000
    return active.filter((record) => recordTimestamp(record) < cutoff && !isWaitingRecord(record))
  }, [active])

  const nextMoves = useMemo(() => active.filter((record) => record.nextMove?.trim()), [active])

  const needsYou = useMemo(() => {
    const seen = new Set<string>()
    return [...actionDue, ...review, ...carryOver]
      .filter((record) => {
        if (isWaitingRecord(record) || seen.has(record.id)) return false
        seen.add(record.id)
        return true
      })
      .slice(0, 8)
  }, [actionDue, review, carryOver])

  const areaStates = useMemo(() => areas.map((area) => {
    const areaRecords = visible.filter((record) => record.area.toLowerCase() === area.name.toLowerCase())
    const areaActive = areaRecords.filter((record) => record.status === 'active')
    const areaDue = actionDue.filter((record) => record.area.toLowerCase() === area.name.toLowerCase())
    const recentCutoff = Date.now() - 14 * 86400000
    const recent = areaRecords.filter((record) => recordTimestamp(record) >= recentCutoff)
    const state = areaDue.length ? 'atenção' : recent.length || areaActive.length ? 'movimento' : 'quieta'
    const lead = areaDue[0] || areaActive.find((record) => record.nextMove) || recent[0] || areaRecords[0]
    return { ...area, count: areaRecords.length, activeCount: areaActive.length, state, lead }
  }), [visible, actionDue])

  const tabs: Array<{ id: SystemView; label: string; count?: number }> = [
    { id: 'panel', label: 'Agora' },
    { id: 'goals', label: 'Objetivos', count: goals.length },
    { id: 'projects', label: 'Projetos', count: projects.length },
    { id: 'agenda', label: 'Agenda', count: agenda.length },
  ]

  function selectView(next: SystemView) {
    if (next === 'panel') setSearchParams({})
    else setSearchParams({ view: next })
  }

  return (
    <div className="v2-page life-os-page">
      <BrandTop />

      <header className="life-os-hero">
        <div className="life-os-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
          <b>EU</b>
        </div>
        <div>
          <Tag tone="lilac">CENTRAL</Tag>
          <h1>Sua vida,<br />em ordem.</h1>
          <p>Um lugar para enxergar o que está vivo, o que pede atenção e para onde você quer ir — sem transformar a vida em checklist.</p>
        </div>
      </header>

      <nav className="life-os-tabs" aria-label="Visões do sistema">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={view === tab.id ? 'active' : ''}
            aria-pressed={view === tab.id}
            onClick={() => selectView(tab.id)}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && tab.count > 0 && <b>{tab.count}</b>}
          </button>
        ))}
      </nav>

      {view === 'panel' && (
        <>
          <section className="system-command-grid">
            <NavLink className="system-command-card inbox" to="/inbox">
              <span className="system-command-icon"><EuIcon name="inbox" /></span>
              <div><small>ENTRADAS</small><strong>{inbox.length}</strong><p>{inbox.length ? 'coisas esperando sua revisão' : 'caixa limpa'}</p></div>
              <EuIcon name="arrow-up-right" />
            </NavLink>

            <NavLink className="system-command-card attention" to={review.length ? '/revisao' : '/?view=now'}>
              <span className="system-command-icon"><EuIcon name="bell" /></span>
              <div><small>ATENÇÃO</small><strong>{actionDue.length + review.length}</strong><p>{actionDue.length ? actionDue.length + ' ações vencidas' : review.length ? 'revisões pendentes' : 'nada urgente'}</p></div>
              <EuIcon name="arrow-up-right" />
            </NavLink>

            <button className="system-command-card goals" onClick={() => selectView('goals')}>
              <span className="system-command-icon"><EuIcon name="compass" /></span>
              <div><small>OBJETIVOS</small><strong>{goals.length}</strong><p>{goals.length ? 'direções ativas' : 'nenhum objetivo formalizado'}</p></div>
              <EuIcon name="arrow-up-right" />
            </button>

            <button className="system-command-card projects" onClick={() => selectView('projects')}>
              <span className="system-command-icon"><EuIcon name="bolt" /></span>
              <div><small>PROJETOS</small><strong>{projects.length}</strong><p>{projects.length ? 'coisas em construção' : 'nenhum projeto ativo'}</p></div>
              <EuIcon name="arrow-up-right" />
            </button>
          </section>

          <section className="life-os-block central-needs-v39">
            <SectionTitle eyebrow="PRECISA DE VOCÊ" title={needsYou.length ? needsYou.length + (needsYou.length === 1 ? ' coisa pede decisão' : ' coisas pedem decisão') : 'Nada urgente agora'} action={<button className="quiet-link" onClick={() => selectView('agenda')}>abrir agenda <EuIcon name="arrow-up-right" /></button>} />
            <div className="central-needs-list-v39">
              {needsYou.slice(0, 5).map((record, index) => (
                <NavLink key={record.id} to={'/registro/' + record.id} className={index === 0 ? 'is-lead' : ''}>
                  <span className="central-needs-index-v39">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <small>{actionDue.some((item) => item.id === record.id) ? 'AGORA' : review.some((item) => item.id === record.id) ? 'REVISAR' : 'CONTINUAR'} · {record.area}</small>
                    <strong>{compactText(record.text, 96)}</strong>
                    <p>{nextAction(record)}</p>
                  </div>
                  <EuIcon name="arrow-up-right" />
                </NavLink>
              ))}
              {!needsYou.length && <div className="soft-empty wide"><span><EuIcon name="check" /></span><p>O que depende de você está em dia. A Central continua acompanhando o resto.</p></div>}
            </div>
            <div className="central-week-strip-v39">
              <span><strong>{completedThisWeek}</strong> fechadas em 7 dias</span>
              <span><strong>{waiting.length}</strong> aguardando</span>
              <span><strong>{inbox.length}</strong> entradas</span>
              <span><strong>{stale.length}</strong> paradas há 3+ semanas</span>
            </div>
          </section>

          <section className="life-os-block central-deep-context-v39">
            <SectionTitle eyebrow="SCOUTS" title="O que merece ser notado" />
            <p className="life-os-intro">O EU separa sinal de ruído. Alto pede ação; médio entra no radar; baixo fica registrado sem interromper você.</p>
            <div className="life-os-scouts">
              {scouts.slice(0, 5).map((scout) => (
                <NavLink key={scout.id} to={scout.actionUrl || '/sistema'} className={'life-os-scout scout-' + scout.level}>
                  <span className="scout-level">{scout.level === 'high' ? 'ALTO' : scout.level === 'medium' ? 'MÉDIO' : 'BAIXO'}</span>
                  <div>
                    <strong>{scout.title}</strong>
                    <p>{compactText(scout.detail, 90)}</p>
                    <small>por quê: {scout.reason}</small>
                  </div>
                  <EuIcon name="arrow-up-right" />
                </NavLink>
              ))}
              {!scouts.length && <div className="soft-empty wide"><span><EuIcon name="check" /></span><p>Nenhum sinal relevante agora. O silêncio também é informação.</p></div>}
            </div>
          </section>

          {crossSignals.length > 0 && (
            <section className="life-os-block central-deep-context-v39">
              <SectionTitle eyebrow="INTELIGÊNCIA CRUZADA" title="Conexões que mudam o contexto" />
              <div className="system-cross-signals">
                {crossSignals.map((signal) => (
                  <article key={signal.id}>
                    <span><EuIcon name="sparkles" /></span>
                    <div><strong>{signal.title}</strong><p>{signal.detail}</p></div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="life-os-block context-bootstrap-block central-deep-context-v39">
            <SectionTitle eyebrow="CONTEXTO" title="O EU já acorda orientado" />
            <div className="context-bootstrap-card">
              <div><strong>{bootstrap.activeProjects.length}</strong><span>projetos ativos</span></div>
              <div><strong>{bootstrap.recentDecisions.length}</strong><span>decisões recentes</span></div>
              <div><strong>{bootstrap.waiting.length}</strong><span>dependências</span></div>
              <div><strong>{bootstrap.carryOver.length}</strong><span>continuidades</span></div>
            </div>
            <p className="context-bootstrap-note">Esse é o “bootstrap” do Life OS: contexto curto e relevante carregado primeiro; detalhes entram só quando a tarefa pede.</p>
          </section>

          <section className="life-os-block" id="aguardando">
            <SectionTitle eyebrow="DEPENDÊNCIAS" title="Aguardando alguém" />
            <p className="life-os-intro">Aqui ficam coisas que ainda importam, mas cuja próxima jogada não é sua. Elas não entram na fila de ação até voltarem para você.</p>
            <div className="waiting-system-list">
              {waiting.slice(0, 5).map((record) => (
                <NavLink key={record.id} to={'/registro/' + record.id}>
                  <span><EuIcon name="clock" /></span>
                  <div><strong>{record.text}</strong><small>{record.area}{record.followUpAt ? ' · conferir ' + relativeDay(record.followUpAt) : ''}</small></div>
                  <EuIcon name="arrow-up-right" />
                </NavLink>
              ))}
              {!waiting.length && <div className="soft-empty wide"><span><EuIcon name="check" /></span><p>Nada dependendo de terceiros agora.</p></div>}
            </div>
          </section>

          <section className="life-os-block central-deep-context-v39">
            <SectionTitle eyebrow="MAPA DA VIDA" title="Onde há movimento" action={<NavLink className="quiet-link" to="/vida">ver Vida <EuIcon name="arrow-up-right" /></NavLink>} />
            <div className="life-area-orbit-grid">
              {areaStates.map((area) => (
                <NavLink key={area.id} className={'life-area-state state-' + area.state} to={'/vida/area/' + area.id}>
                  <span className="life-area-state-dot" />
                  <div>
                    <small>{area.state}</small>
                    <strong>{area.name}</strong>
                    <p>{area.lead ? compactText(area.lead.nextMove || area.lead.text, 66) : 'Sem nada pedindo atenção agora.'}</p>
                  </div>
                  <b>{area.activeCount || area.count}</b>
                </NavLink>
              ))}
            </div>
          </section>

          <section className="life-os-block">
            <SectionTitle eyebrow="RESET SEMANAL" title="O que mudou esta semana" />
            <article className="weekly-reset-card">
              <div className="weekly-reset-copy">
                <Tag tone="lilac">10 MINUTOS</Tag>
                <h2>{weeklyReset.sentence}</h2>
                <p>O reset não serve para reorganizar tudo. Serve para limpar ruído, reconhecer o que mudou e escolher o que merece continuar.</p>
              </div>
              <div className="weekly-reset-metrics">
                <div><strong>{weeklyReset.captured}</strong><span>coisas entraram</span></div>
                <div><strong>{weeklyReset.completed}</strong><span>foram fechadas</span></div>
                <div><strong>{weeklyReset.waiting}</strong><span>aguardando</span></div>
                <div><strong>{weeklyReset.carryOver}</strong><span>continuam vivas</span></div>
              </div>
              <div className="weekly-reset-actions">
                <NavLink to="/inbox"><EuIcon name="inbox" />limpar entrada</NavLink>
                <NavLink to="/revisao"><EuIcon name="refresh" />revisar pendências</NavLink>
                <NavLink to="/vida/lab"><EuIcon name="sparkles" />ver sinais no Lab</NavLink>
              </div>
            </article>
          </section>

          <section className="life-os-block central-deep-context-v39">
            <SectionTitle eyebrow="SOURCE MAP" title="De onde cada verdade vem" />
            <p className="life-os-intro">O EU pode raciocinar em cima de várias fontes, mas não deve substituir a fonte original quando precisão importa.</p>
            <div className="source-map-grid">
              {sources.map((source) => (
                <article key={source.id} className={'source-map-card source-' + source.state}>
                  <div className="source-map-top">
                    <strong>{source.title}</strong>
                    <span>{source.state === 'connected' ? 'conectado' : source.state === 'stale' ? 'antigo' : source.state === 'planned' ? 'planejado' : 'local'}</span>
                  </div>
                  <p>{source.role}</p>
                  <small>fonte de verdade: {source.truthFor}</small>
                  <em>{source.note}</em>
                </article>
              ))}
            </div>
          </section>

          <section className="life-os-block central-deep-context-v39">
            <SectionTitle eyebrow="AUTONOMIA" title="O que o EU pode fazer sozinho" />
            <div className="autonomy-grid">
              {autonomyRules.map((rule) => (
                <article key={rule.id} className={'autonomy-' + rule.id}>
                  <span><EuIcon name={rule.id === 'auto' ? 'bolt' : rule.id === 'prepare' ? 'edit' : 'shield'} /></span>
                  <div><strong>{rule.title}</strong><p>{rule.detail}</p></div>
                </article>
              ))}
            </div>
          </section>

          <section className="life-os-block central-deep-context-v39">
            <SectionTitle eyebrow="RITMO" title="Rituais do seu sistema" />
            <div className="system-rituals">
              <article>
                <span><EuIcon name="sun" /></span>
                <div><strong>Diário · 2 minutos</strong><p>Humor, Daily Brief e uma decisão sobre o que merece energia hoje.</p></div>
              </article>
              <article>
                <span><EuIcon name="refresh" /></span>
                <div><strong>Semanal · 10 minutos</strong><p>Limpar inbox, revisar coisas paradas e escolher até três frentes de foco.</p></div>
              </article>
              <article>
                <span><EuIcon name="compass" /></span>
                <div><strong>Mensal · 20 minutos</strong><p>Olhar objetivos, projetos e áreas da vida para ajustar direção — não para cobrar produtividade.</p></div>
              </article>
            </div>
          </section>

          <section className="life-os-shortcuts">
            <NavLink to="/decidir"><EuIcon name="compass" /><span>Decida comigo</span><small>compare duas opções com seu contexto real</small></NavLink>
            <NavLink to="/pessoas"><EuIcon name="user" /><span>Pessoas</span><small>promessas, retornos e histórias conectadas</small></NavLink>
            <NavLink to="/pergunte"><EuIcon name="search" /><span>Pergunte ao EU</span><small>encontre contexto na sua própria vida</small></NavLink>
            <NavLink to="/descobertas"><EuIcon name="sparkles" /><span>Descobertas</span><small>ideias, referências e coisas que chamaram atenção</small></NavLink>
            <NavLink to="/vida/lab"><EuIcon name="bolt" /><span>EU Lab</span><small>experimentos, padrões e ferramentas mais profundas</small></NavLink>
          </section>
        </>
      )}

      {view === 'goals' && (
        <section className="life-os-list-view living-goals-view">
          <SectionTitle eyebrow="OBJETIVOS VIVOS" title="Direção que reage à sua vida" />
          <p className="life-os-intro">O EU olha progresso explícito, movimentos recentes, registros relacionados e dependências. Quando não existe percentual real, ele não inventa um.</p>
          <div className="living-goal-stack">
            {livingGoals.map((goal) => (
              <NavLink key={goal.record.id} to={'/registro/' + goal.record.id} className={'living-goal-card goal-state-' + goal.state}>
                <div className="living-goal-top">
                  <div><Tag tone={goal.state === 'attention' ? 'coral' : goal.state === 'waiting' ? 'lilac' : goal.state === 'quiet' ? 'amber' : 'green'}>{goal.stateLabel}</Tag><span>{goal.record.area}</span></div>
                  {goal.progress !== null ? <b>{goal.progress}%</b> : <b className="qualitative">sem % inventada</b>}
                </div>
                <h2>{goal.record.text}</h2>
                {goal.record.whyItMatters && <p className="why">{goal.record.whyItMatters}</p>}
                {goal.progress !== null && <div className="living-goal-progress"><span style={{ width: goal.progress + '%' }} /></div>}
                <div className="living-goal-signals">
                  <span><strong>{goal.recentMovementCount}</strong> movimentos em 14 dias</span>
                  <span><strong>{goal.relatedCount}</strong> conexões</span>
                  <span><strong>{goal.evidence.length}</strong> evidências principais</span>
                </div>
                <p className="next"><EuIcon name="arrow-right" />{goal.nextMove}</p>
                {goal.evidence.length > 0 && (
                  <div className="living-goal-evidence">
                    <small>CONTEXTO RELACIONADO</small>
                    {goal.evidence.slice(0, 3).map((item) => <span key={item.id}>{compactText(item.text, 72)}</span>)}
                  </div>
                )}
              </NavLink>
            ))}
            {!livingGoals.length && <div className="soft-empty wide"><span><EuIcon name="compass" /></span><p>Quando você registrar algo como Objetivo ou Meta, ele aparece aqui e começa a ganhar contexto automaticamente.</p></div>}
          </div>
        </section>
      )}

      {view === 'projects' && (
        <section className="life-os-list-view">
          <SectionTitle eyebrow="EM CONSTRUÇÃO" title="Projetos" />
          <p className="life-os-intro">Projetos são coisas com começo, movimento e algum tipo de fim. O EU junta o estado atual e o próximo passo.</p>
          <div className="life-os-record-stack">
            {projects.map((record) => {
              const handoff = deriveProjectHandoff(record, visible)
              return (
                <NavLink key={record.id} to={'/registro/' + record.id} className="life-os-record-card project-card">
                  <div><Tag tone="coral">PROJETO</Tag><span>{record.area}</span></div>
                  <h2>{record.text}</h2>
                  <div className="project-progress-line">
                    <span className={'progress-' + (record.progressLevel || 'started')} />
                  </div>
                  <div className="project-handoff">
                    <small>HANDOFF</small>
                    <p>{handoff.nextMove ? 'Próximo: ' + compactText(handoff.nextMove, 74) : 'Último movimento: ' + compactText(handoff.lastMovement, 74)}</p>
                    <span>{handoff.decisions.length} decisões · {handoff.waiting.length} aguardando · {handoff.relatedCount} conexões</span>
                  </div>
                  <p className="next"><EuIcon name="arrow-right" />{nextAction(record)}</p>
                </NavLink>
              )
            })}
            {!projects.length && <div className="soft-empty wide"><span><EuIcon name="bolt" /></span><p>Registros do tipo Projeto aparecem aqui e ganham continuidade automática.</p></div>}
          </div>
        </section>
      )}

      {view === 'agenda' && (
        <section className="life-os-list-view">
          <SectionTitle eyebrow="TEMPO" title="Agenda do EU" />
          <p className="life-os-intro">Por enquanto ela reúne retornos e cápsulas que já vivem no EU. Depois pode receber seus compromissos externos sem duplicar informação.</p>
          <div className="life-os-agenda">
            {agenda.map((item) => (
              <NavLink key={item.id} to={'/registro/' + item.record.id} className={'agenda-row agenda-' + item.kind}>
                <div className="agenda-date"><strong>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(new Date(item.at))}</strong><span>{new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(item.at))}</span></div>
                <span className="agenda-line" />
                <div className="agenda-copy">
                  <Tag tone={item.kind === 'capsule' ? 'lilac' : new Date(item.at).getTime() <= Date.now() ? 'coral' : 'cobalt'}>{item.kind === 'capsule' ? 'CÁPSULA' : 'RETORNO'}</Tag>
                  <h2>{item.record.text}</h2>
                  <p>{relativeDay(item.at)} · {item.record.area}</p>
                </div>
                <EuIcon name="arrow-up-right" />
              </NavLink>
            ))}
            {!agenda.length && <div className="soft-empty wide"><span><EuIcon name="clock" /></span><p>Nada marcado no tempo ainda. Retornos e cápsulas futuras vão aparecer aqui.</p></div>}
          </div>
        </section>
      )}
    </div>
  )
}
