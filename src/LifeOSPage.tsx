import { useMemo } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { areas } from './data'
import { useChatInbox, useRecords } from './appState'
import { activeFollowUps, isRecordVisibleForInsights, type StoredRecord } from './storage'
import { reviewCandidates } from './intelligence'
import { BrandTop, EuIcon, SectionTitle, Tag, formatShortDate, typeTone } from './v2Ui'
import { buildContextBootstrap, buildWeeklyReset, deriveCarryOver, deriveLifeOSScouts, deriveWaiting, isWaitingRecord } from './lifeOSIntelligence'

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
  const review = useMemo(() => reviewCandidates(visible), [visible])

  const goals = useMemo(() => (
    visible
      .filter((record) => isType(record, ['objetivo', 'meta']))
      .filter((record) => record.status !== 'completed' && record.status !== 'abandoned')
      .sort((a, b) => recordTimestamp(b) - recordTimestamp(a))
  ), [visible])

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
    { id: 'panel', label: 'Painel' },
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
          <Tag tone="ink">LIFE OS</Tag>
          <h1>Sua vida,<br />organizada.</h1>
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

          <section className="life-os-block">
            <SectionTitle eyebrow="AGORA" title="O sistema está vendo isso" action={<button className="quiet-link" onClick={() => selectView('agenda')}>abrir agenda <EuIcon name="arrow-up-right" /></button>} />
            <div className="system-now-card">
              <div className="system-now-lead">
                <Tag tone={actionDue.length ? 'coral' : carryOver.length ? 'cobalt' : 'green'}>{actionDue.length ? 'PEDE ATENÇÃO' : carryOver.length ? 'CONTINUIDADE' : 'EM DIA'}</Tag>
                <h2>{actionDue[0] ? compactText(actionDue[0].text, 105) : carryOver[0] ? compactText(carryOver[0].text, 105) : goals[0] ? compactText(goals[0].text, 105) : 'Seu sistema está respirando bem.'}</h2>
                <p>{actionDue[0] ? nextAction(actionDue[0]) : carryOver[0] ? 'Isso veio de antes e continua vivo — sem precisar recadastrar.' : goals[0] ? nextAction(goals[0]) : 'Continue registrando decisões, movimentos e coisas que quer construir.'}</p>
                {(actionDue[0] || carryOver[0]) && <NavLink to={'/registro/' + (actionDue[0] || carryOver[0]).id}>abrir <EuIcon name="arrow-up-right" /></NavLink>}
              </div>
              <div className="system-now-stats">
                <div><strong>{completedThisWeek}</strong><span>concluídos em 7 dias</span></div>
                <div><strong>{carryOver.length}</strong><span>continuidades automáticas</span></div>
                <div><strong>{stale.length}</strong><span>parados há 3+ semanas</span></div>
              </div>
            </div>
          </section>

          <section className="life-os-block">
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

          <section className="life-os-block context-bootstrap-block">
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

          <section className="life-os-block">
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
                <NavLink to="/?view=signals"><EuIcon name="sparkles" />ver sinais</NavLink>
              </div>
            </article>
          </section>

          <section className="life-os-block">
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
            <NavLink to="/pergunte"><EuIcon name="search" /><span>Pergunte ao EU</span><small>encontre contexto na sua própria vida</small></NavLink>
            <NavLink to="/descobertas"><EuIcon name="sparkles" /><span>Descobertas</span><small>ideias, referências e coisas que chamaram atenção</small></NavLink>
            <NavLink to="/vida/lab"><EuIcon name="bolt" /><span>EU Lab</span><small>experimentos, padrões e ferramentas mais profundas</small></NavLink>
          </section>
        </>
      )}

      {view === 'goals' && (
        <section className="life-os-list-view">
          <SectionTitle eyebrow="DIREÇÃO" title="Objetivos ativos" />
          <p className="life-os-intro">Objetivo aqui é direção, não cobrança. O importante é saber por que existe e qual é o próximo movimento.</p>
          <div className="life-os-record-stack">
            {goals.map((record) => (
              <NavLink key={record.id} to={'/registro/' + record.id} className="life-os-record-card">
                <div><Tag tone={typeTone(record.type)}>{record.type}</Tag><span>{record.area}</span></div>
                <h2>{record.text}</h2>
                {record.whyItMatters && <p className="why">{record.whyItMatters}</p>}
                <p className="next"><EuIcon name="arrow-right" />{nextAction(record)}</p>
              </NavLink>
            ))}
            {!goals.length && <div className="soft-empty wide"><span><EuIcon name="compass" /></span><p>Quando você registrar algo como Objetivo ou Meta, ele aparece aqui automaticamente.</p></div>}
          </div>
        </section>
      )}

      {view === 'projects' && (
        <section className="life-os-list-view">
          <SectionTitle eyebrow="EM CONSTRUÇÃO" title="Projetos" />
          <p className="life-os-intro">Projetos são coisas com começo, movimento e algum tipo de fim. O EU junta o estado atual e o próximo passo.</p>
          <div className="life-os-record-stack">
            {projects.map((record) => (
              <NavLink key={record.id} to={'/registro/' + record.id} className="life-os-record-card project-card">
                <div><Tag tone="coral">PROJETO</Tag><span>{record.area}</span></div>
                <h2>{record.text}</h2>
                <div className="project-progress-line">
                  <span className={'progress-' + (record.progressLevel || 'started')} />
                </div>
                <p className="next"><EuIcon name="arrow-right" />{nextAction(record)}</p>
              </NavLink>
            ))}
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
