import { FormEvent, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useChatInbox, useRecords } from './appState'
import { BrandTop, EuIcon, SectionTitle, Tag, formatShortDate, typeTone } from './v2Ui'
import {
  buildPersonalApiSnapshot,
  deriveAttentionBudget,
  deriveCommitments,
  deriveCounterfactuals,
  deriveDecisionJournal,
  deriveFrictionMap,
  deriveNightBrief,
  deriveNoActionNeeded,
  deriveOpenLoops,
  deriveOpportunities,
  deriveSomeday,
  deriveStateOfMe,
  deriveWeekLens,
  deriveWhatChanged,
  parseLifeCommand,
  searchLife,
} from './lifeCommandCenter'

function short(value: string, size = 94) {
  const clean = value.trim()
  return clean.length > size ? clean.slice(0, size - 1).trimEnd() + '…' : clean
}

function timeLabel(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (hours < 1) return 'agora'
  if (hours < 24) return 'há ' + hours + 'h'
  if (days === 1) return 'ontem'
  if (days < 7) return 'há ' + days + ' dias'
  return formatShortDate(value)
}

export default function CommandCenterPage() {
  const records = useRecords()
  const inbox = useChatInbox()
  const navigate = useNavigate()
  const [command, setCommand] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const state = useMemo(() => deriveStateOfMe(records), [records])
  const attention = useMemo(() => deriveAttentionBudget(records, inbox.length), [records, inbox.length])
  const changes = useMemo(() => deriveWhatChanged(records), [records])
  const loops = useMemo(() => deriveOpenLoops(records), [records])
  const commitments = useMemo(() => deriveCommitments(records), [records])
  const decisions = useMemo(() => deriveDecisionJournal(records), [records])
  const opportunities = useMemo(() => deriveOpportunities(records), [records])
  const friction = useMemo(() => deriveFrictionMap(records), [records])
  const someday = useMemo(() => deriveSomeday(records), [records])
  const noAction = useMemo(() => deriveNoActionNeeded(records), [records])
  const counterfactuals = useMemo(() => deriveCounterfactuals(records), [records])
  const night = useMemo(() => deriveNightBrief(records), [records])
  const week = useMemo(() => deriveWeekLens(records), [records])
  const snapshot = useMemo(() => buildPersonalApiSnapshot(records, inbox.length), [records, inbox.length])
  const results = useMemo(() => searchLife(records, searchQuery), [records, searchQuery])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!command.trim()) return
    const intent = parseLifeCommand(command)

    if (intent.kind === 'search') {
      setSearchQuery(intent.query)
      setCommand('')
      window.requestAnimationFrame(() => document.getElementById('life-search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
      return
    }

    if (intent.kind === 'money') {
      navigate('/dinheiro?command=' + encodeURIComponent(intent.query))
      return
    }

    const params = new URLSearchParams({
      texto: intent.query,
      tipo: intent.type,
      area: intent.area,
      origem: 'manual',
    })
    navigate('/capturar?' + params.toString())
  }

  return (
    <div className="v2-page command-center-page">
      <BrandTop />

      <header className="command-hero">
        <div className="command-hero-copy">
          <Tag tone="cobalt">EU COMMAND</Tag>
          <h1>O que você<br />precisa saber agora?</h1>
          <p>Busque sua vida inteira, registre uma coisa nova ou deixe o EU separar o que pede ação do que pode esperar.</p>
        </div>
        <div className={'attention-orb attention-' + attention.level} aria-label={'Orçamento de atenção ' + attention.label}>
          <span>{attention.label}</span>
          <strong>{attention.openCount}</strong>
          <small>loops abertos</small>
        </div>
      </header>

      <form className="life-command-bar" onSubmit={submit}>
        <span><EuIcon name="sparkles" /></span>
        <input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          placeholder="Ex.: gastei 84 de gasolina · buscar Kindle · decidi..."
          aria-label="Comando para o EU"
        />
        <button disabled={!command.trim()} aria-label="Executar comando"><EuIcon name="arrow-right" /></button>
      </form>
      <p className="command-safety-note"><EuIcon name="shield" /> Dinheiro e outras ações com consequência nunca são gravados sem passar pela tela de confirmação.</p>

      <section className="command-state-grid">
        <article className="state-of-me-card">
          <div><Tag tone="lilac">STATE OF ME</Tag><span>últimos 30 dias</span></div>
          <h2>{state.headline}</h2>
          <p>{state.detail}</p>
          <div className="state-area-chips">
            {state.topAreas.map((item) => <span key={item.area}>{item.area} <b>{item.count}</b></span>)}
            {!state.topAreas.length && <span>fase quieta</span>}
          </div>
        </article>

        <article className={'attention-card attention-' + attention.level}>
          <div><Tag tone={attention.level === 'loaded' ? 'coral' : attention.level === 'balanced' ? 'amber' : 'green'}>ATENÇÃO · {attention.label}</Tag></div>
          <h2>{attention.headline}</h2>
          <p>{attention.detail}</p>
          <div className="attention-metrics">
            <span><b>{attention.overdueCount}</b> vencidos</span>
            <span><b>{attention.waitingCount}</b> aguardando</span>
            <span><b>{attention.activeAreas}</b> áreas ativas</span>
          </div>
        </article>
      </section>

      <section className="command-section">
        <SectionTitle eyebrow="WHAT CHANGED?" title="O que mudou" action={<span className="command-section-count">7 dias</span>} />
        <div className="change-timeline">
          {changes.slice(0, 6).map((change) => (
            <NavLink key={change.id} to={'/registro/' + change.record.id} className={'change-row change-' + change.kind}>
              <span className="change-dot" />
              <div>
                <small>{change.label} · {timeLabel(change.at)}</small>
                <strong>{short(change.record.text)}</strong>
                <em>{change.record.area}</em>
              </div>
              <EuIcon name="arrow-up-right" />
            </NavLink>
          ))}
          {!changes.length && <div className="command-empty"><EuIcon name="check" /><span>Nada relevante mudou nos últimos 7 dias.</span></div>}
        </div>
      </section>

      <section className="command-section">
        <SectionTitle eyebrow="OPEN LOOPS" title="Histórias ainda sem final" action={<span className="command-section-count">{loops.length}</span>} />
        <div className="open-loop-grid">
          {loops.slice(0, 6).map((record) => (
            <NavLink key={record.id} to={'/registro/' + record.id} className="open-loop-card">
              <div><Tag tone={isWaitingType(record.type, record.text) ? 'lilac' : typeTone(record.type)}>{isWaitingType(record.type, record.text) ? 'AGUARDANDO' : record.type}</Tag><span>{record.area}</span></div>
              <h3>{short(record.text, 72)}</h3>
              <p>{record.nextMove || (record.followUpAt ? 'Volta ' + formatShortDate(record.followUpAt) : 'Ainda sem desfecho registrado')}</p>
            </NavLink>
          ))}
          {!loops.length && <div className="command-empty wide"><EuIcon name="check" /><span>Nenhum loop aberto. O EU não vai inventar tarefa.</span></div>}
        </div>
      </section>

      <section className="command-split">
        <article className="command-panel commitments-panel">
          <div className="command-panel-head"><span><EuIcon name="user" /></span><div><small>COMMITMENT LEDGER</small><h2>Promessas em aberto</h2></div></div>
          <div className="command-mini-list">
            {commitments.slice(0, 5).map((item) => (
              <NavLink key={item.id} to={'/registro/' + item.record.id}>
                <b>{item.direction === 'mine' ? 'EU →' : '← OUTRO'}</b>
                <span>{short(item.record.text, 66)}</span>
                <EuIcon name="arrow-up-right" />
              </NavLink>
            ))}
            {!commitments.length && <p className="mini-empty">Nenhuma promessa detectada agora.</p>}
          </div>
        </article>

        <article className="command-panel decisions-panel">
          <div className="command-panel-head"><span><EuIcon name="check" /></span><div><small>DECISION JOURNAL</small><h2>Decisões que ensinam</h2></div></div>
          <div className="command-mini-list">
            {decisions.slice(0, 5).map((entry) => (
              <NavLink key={entry.id} to={'/registro/' + entry.record.id}>
                <b>{entry.state === 'learned' ? 'APRENDEU' : entry.state === 'review' ? 'REVISAR' : 'ABERTA'}</b>
                <span>{short(entry.record.text, 66)}</span>
                <EuIcon name="arrow-up-right" />
              </NavLink>
            ))}
            {!decisions.length && <p className="mini-empty">Suas decisões vão formar um histórico de aprendizado aqui.</p>}
          </div>
        </article>
      </section>

      <section className="command-section">
        <SectionTitle eyebrow="SEMANA" title="Sua capacidade antes da agenda" />
        <article className={'week-lens-card week-' + week.level}>
          <div className="week-lens-copy">
            <Tag tone={week.level === 'busy' ? 'coral' : week.level === 'balanced' ? 'amber' : 'green'}>{week.level === 'busy' ? 'CHEIA' : week.level === 'balanced' ? 'EQUILIBRADA' : 'ABERTA'}</Tag>
            <h2>{week.headline}</h2>
            <p>{week.note}</p>
          </div>
          <div className="week-lens-days">
            {week.days.map((day) => (
              <div key={day.date} className={day.action >= 3 ? 'peak' : ''}>
                <small>{day.label}</small>
                <span>{day.action}</span>
                <i style={{ height: Math.max(8, Math.min(44, 8 + day.action * 12)) }} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="command-signal-grid">
        <article className="command-signal-card opportunities">
          <div className="command-signal-head"><span><EuIcon name="sparkles" /></span><div><small>OPPORTUNITY RADAR</small><h2>Possibilidades</h2></div><b>{opportunities.length}</b></div>
          {opportunities.slice(0, 4).map((item) => <NavLink key={item.id} to={'/registro/' + item.record.id}><strong>{short(item.record.text, 62)}</strong><span>{item.record.area}</span></NavLink>)}
          {!opportunities.length && <p>Nenhuma oportunidade explícita no radar agora.</p>}
        </article>

        <article className="command-signal-card friction">
          <div className="command-signal-head"><span><EuIcon name="refresh" /></span><div><small>FRICTION MAP</small><h2>Onde você trava</h2></div><b>{friction.length}</b></div>
          {friction.slice(0, 4).map((item) => <NavLink key={item.id} to={'/registro/' + item.record.id}><strong>{short(item.record.text, 62)}</strong><span>{item.reason}</span></NavLink>)}
          {!friction.length && <p>Nenhuma fricção recorrente forte foi detectada.</p>}
        </article>
      </section>

      <section className="command-signal-grid">
        <article className="command-signal-card someday">
          <div className="command-signal-head"><span><EuIcon name="heart" /></span><div><small>SOMEDAY / NOT NOW</small><h2>Não agora</h2></div><b>{someday.length}</b></div>
          {someday.slice(0, 4).map((record) => <NavLink key={record.id} to={'/registro/' + record.id}><strong>{short(record.text, 62)}</strong><span>{record.area}</span></NavLink>)}
          {!someday.length && <p>Nenhuma ideia adormecida pedindo espaço mental.</p>}
        </article>

        <article className="command-signal-card no-action">
          <div className="command-signal-head"><span><EuIcon name="shield" /></span><div><small>NO ACTION NEEDED</small><h2>Você não precisa agir</h2></div><b>{noAction.length}</b></div>
          {noAction.slice(0, 4).map((record) => <NavLink key={record.id} to={'/registro/' + record.id}><strong>{short(record.text, 62)}</strong><span>{record.followUpAt ? 'acompanhado até ' + formatShortDate(record.followUpAt) : 'nas mãos de outra pessoa'}</span></NavLink>)}
          {!noAction.length && <p>Nada precisa ser explicitamente tirado da sua cabeça agora.</p>}
        </article>
      </section>

      {counterfactuals.length > 0 && (
        <section className="command-section">
          <SectionTitle eyebrow="COUNTERFACTUALS" title="Decisões que já podem ser comparadas" />
          <div className="counterfactual-list">
            {counterfactuals.map((item) => (
              <NavLink key={item.id} to={'/registro/' + item.record.id}>
                <Tag tone="wine">OLHAR DE NOVO</Tag>
                <h3>{short(item.record.text, 86)}</h3>
                <p>{item.prompt}</p>
              </NavLink>
            ))}
          </div>
        </section>
      )}

      <section className="command-section night-brief-section">
        <SectionTitle eyebrow="FECHAMENTO" title="Brief da noite" />
        <article className="night-brief-card">
          <div className="night-orbit"><EuIcon name="moon" /></div>
          <div className="night-brief-copy">
            <Tag tone="lilac">HOJE</Tag>
            <h2>{night.headline}</h2>
            <p>{night.note}</p>
            <div><span>{night.captured} movimentos</span><span>{night.completed} fechados</span><span>{night.decisions} decisões</span><span>{night.waiting} aguardando</span></div>
          </div>
        </article>
      </section>

      <section className="command-section life-search-section" id="life-search-results">
        <SectionTitle eyebrow="LIFE SEARCH" title="Spotlight da sua vida" />
        <label className="life-search-box">
          <EuIcon name="search" />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar pessoa, projeto, lugar, compra, decisão..." />
          {searchQuery && <button onClick={() => setSearchQuery('')} aria-label="Limpar busca"><EuIcon name="x" /></button>}
        </label>
        {searchQuery && (
          <div className="life-search-results">
            <div className="search-results-head"><span>{results.length} resultado{results.length === 1 ? '' : 's'}</span><small>busca local no seu EU</small></div>
            {results.map((record) => (
              <NavLink key={record.id} to={'/registro/' + record.id}>
                <div><Tag tone={typeTone(record.type)}>{record.type}</Tag><span>{record.area}</span></div>
                <strong>{short(record.text, 110)}</strong>
                <EuIcon name="arrow-up-right" />
              </NavLink>
            ))}
            {!results.length && <div className="command-empty"><EuIcon name="search" /><span>Nada encontrado nesse aparelho.</span></div>}
          </div>
        )}
      </section>

      <details className="personal-api-card">
        <summary><span><EuIcon name="collections" /> Personal API</span><small>uma resposta estruturada para o resto do EU</small></summary>
        <div>
          <p>Esta camada evita que cada módulo invente uma versão diferente da sua vida. Ela resume apenas dados existentes no aparelho.</p>
          <div className="personal-api-metrics">
            <span><b>{snapshot.counts.openLoops}</b> loops</span>
            <span><b>{snapshot.counts.projects}</b> projetos</span>
            <span><b>{snapshot.counts.goals}</b> objetivos</span>
            <span><b>{snapshot.counts.waiting}</b> aguardando</span>
          </div>
        </div>
      </details>
    </div>
  )
}

function isWaitingType(type: string, text: string) {
  const value = (type + ' ' + text).toLocaleLowerCase('pt-BR')
  return ['aguard', 'esperando', 'retorno', 'resposta', 'depende de'].some((token) => value.includes(token))
}
