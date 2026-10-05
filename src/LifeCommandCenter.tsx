import { useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import type { StoredRecord } from './storage'
import { EuIcon, Tag, typeTone } from './v2Ui'
import {
  buildPersonalApiSnapshot,
  deriveAttentionBudget,
  deriveCommitments,
  deriveCounterfactuals,
  deriveDecisionJournal,
  deriveFrictionMap,
  deriveNoActionNeeded,
  deriveOpenLoops,
  deriveOpportunities,
  deriveSomeday,
  deriveStateOfMe,
  deriveWhatChanged,
  parseLifeCommand,
  searchLife,
} from './lifeCommandCenter'

type ContextFilter = 'all' | 'work' | 'personal' | 'focus'

function compact(value: string, size = 88) {
  const clean = value.trim()
  return clean.length > size ? clean.slice(0, size - 1).trimEnd() + '…' : clean
}

function relativeDate(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  if (diff < 60000) return 'agora'
  if (diff < 3600000) return Math.max(1, Math.round(diff / 60000)) + ' min'
  if (diff < 86400000) return Math.max(1, Math.round(diff / 3600000)) + ' h'
  const days = Math.max(1, Math.round(diff / 86400000))
  return days === 1 ? 'ontem' : days + ' dias'
}

function isWorkRecord(record: StoredRecord) {
  const value = (record.area + ' ' + record.type + ' ' + record.text).toLowerCase()
  return ['carreira', 'trabalho', 'projeto', 'estudo', 'curso', 'vaga', 'candidatura', 'cliente', 'freela'].some((term) => value.includes(term))
}

function contextRecords(records: StoredRecord[], filter: ContextFilter) {
  if (filter === 'work') return records.filter(isWorkRecord)
  if (filter === 'personal') return records.filter((record) => !isWorkRecord(record))
  if (filter === 'focus') return records.filter((record) => record.pinned || Boolean(record.nextMove) || Boolean(record.followUpAt))
  return records
}

export default function LifeCommandCenter({ records, inboxCount }: { records: StoredRecord[]; inboxCount: number }) {
  const navigate = useNavigate()
  const [command, setCommand] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [context, setContext] = useState<ContextFilter>('all')
  const [expanded, setExpanded] = useState<'loops' | 'decisions' | 'radar' | null>(null)

  const scopedRecords = useMemo(() => contextRecords(records, context), [records, context])
  const attention = useMemo(() => deriveAttentionBudget(scopedRecords, inboxCount), [scopedRecords, inboxCount])
  const state = useMemo(() => deriveStateOfMe(scopedRecords), [scopedRecords])
  const changes = useMemo(() => deriveWhatChanged(scopedRecords, 7), [scopedRecords])
  const openLoops = useMemo(() => deriveOpenLoops(scopedRecords), [scopedRecords])
  const commitments = useMemo(() => deriveCommitments(scopedRecords), [scopedRecords])
  const decisions = useMemo(() => deriveDecisionJournal(scopedRecords), [scopedRecords])
  const friction = useMemo(() => deriveFrictionMap(scopedRecords), [scopedRecords])
  const opportunities = useMemo(() => deriveOpportunities(scopedRecords), [scopedRecords])
  const someday = useMemo(() => deriveSomeday(scopedRecords), [scopedRecords])
  const quiet = useMemo(() => deriveNoActionNeeded(scopedRecords), [scopedRecords])
  const counterfactuals = useMemo(() => deriveCounterfactuals(scopedRecords), [scopedRecords])
  const snapshot = useMemo(() => buildPersonalApiSnapshot(scopedRecords, inboxCount), [scopedRecords, inboxCount])
  const searchResults = useMemo(() => searchLife(records, searchQuery), [records, searchQuery])

  const mine = commitments.filter((item) => item.direction === 'mine')
  const theirs = commitments.filter((item) => item.direction === 'theirs')

  function runCommand() {
    const value = command.trim()
    if (!value) return

    const intent = parseLifeCommand(value)

    if (intent.kind === 'search') {
      setSearchQuery(intent.query)
      setCommand('')
      return
    }

    if (intent.kind === 'money') {
      sessionStorage.setItem('eu-money-command-draft', intent.query)
      navigate('/dinheiro?from=command')
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
    <section className="eu-command-center now-only" aria-label="EU Command Center">
      <div className={'eu-now-answer attention-' + attention.level}>
        <div className="eu-now-answer-top">
          <div>
            <Tag tone="cobalt">EU, AGORA</Tag>
            <h2>O que eu preciso saber?</h2>
          </div>
          <span className={'attention-pill ' + attention.level}>{attention.label}</span>
        </div>
        <strong>{state.headline}</strong>
        <p>{attention.headline} {attention.detail}</p>
        <div className="eu-now-metrics">
          <span><b>{attention.overdueCount}</b> pedem ação</span>
          <span><b>{attention.waitingCount}</b> estão acompanhadas</span>
          <span><b>{attention.activeAreas}</b> áreas em movimento</span>
        </div>
      </div>

      <div className="eu-command-shell">
        <div className="eu-command-label">
          <span><EuIcon name="sparkles" /></span>
          <div><strong>EU Command</strong><small>digite uma coisa; o sistema decide o caminho</small></div>
        </div>
        <form className="eu-command-input" onSubmit={(event) => { event.preventDefault(); runCommand() }}>
          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="ex.: gastei 82 de gasolina · decidi estudar SQL · buscar carro"
            aria-label="Comando universal do EU"
          />
          <button type="submit" aria-label="Executar comando"><EuIcon name="arrow-right" /></button>
        </form>
        <div className="eu-command-actions">
          <button onClick={() => runCommand()}><EuIcon name="bolt" />entender e encaminhar</button>
          <button onClick={() => { const value = command.trim(); if (value) setSearchQuery(value) }}><EuIcon name="search" />buscar na minha vida</button>
        </div>
        <p className="eu-command-guard"><EuIcon name="shield" />Gastos, receitas e outras ações consequenciais nunca são gravados sem confirmação.</p>
      </div>

      {searchQuery && (
        <div className="life-search-panel">
          <div className="life-search-head">
            <div><small>LIFE SEARCH</small><h3>“{searchQuery}”</h3></div>
            <button onClick={() => setSearchQuery('')}><EuIcon name="x" /></button>
          </div>
          <div className="life-search-results">
            {searchResults.map((record) => (
              <NavLink key={record.id} to={'/registro/' + record.id}>
                <Tag tone={typeTone(record.type)}>{record.type}</Tag>
                <div><strong>{compact(record.text, 105)}</strong><small>{record.area}</small></div>
                <EuIcon name="arrow-up-right" />
              </NavLink>
            ))}
            {!searchResults.length && <div className="life-search-empty">Nada relacionado apareceu no seu arquivo ainda.</div>}
          </div>
        </div>
      )}

      <div className="eu-context-switcher" aria-label="Contexto atual">
        {([
          ['all', 'Tudo'],
          ['work', 'Trabalho'],
          ['personal', 'Pessoal'],
          ['focus', 'Foco'],
        ] as Array<[ContextFilter, string]>).map(([id, label]) => (
          <button key={id} className={context === id ? 'active' : ''} onClick={() => setContext(id)}>{label}</button>
        ))}
      </div>

      <section className="what-changed-card">
        <div className="command-section-head">
          <div><small>WHAT CHANGED?</small><h3>Desde a última semana</h3></div>
          <span>{changes.length} mudanças</span>
        </div>
        <div className="what-changed-stream">
          {changes.slice(0, 4).map((change) => (
            <NavLink key={change.id} to={'/registro/' + change.record.id}>
              <span className={'change-dot change-' + change.kind} />
              <div><strong>{compact(change.record.text, 92)}</strong><small>{change.label} · {relativeDate(change.at)}</small></div>
              <EuIcon name="arrow-up-right" />
            </NavLink>
          ))}
          {!changes.length && <p className="command-soft-empty">Nada importante mudou por aqui nos últimos dias.</p>}
        </div>
      </section>

      <div className="command-summary-grid">
        <button className="command-summary-card loops" onClick={() => setExpanded(expanded === 'loops' ? null : 'loops')}>
          <span><EuIcon name="inbox" /></span>
          <small>OPEN LOOPS</small>
          <strong>{openLoops.length}</strong>
          <p>{openLoops.length ? 'histórias ainda sem desfecho' : 'nenhum loop aberto'}</p>
        </button>
        <button className="command-summary-card decisions" onClick={() => setExpanded(expanded === 'decisions' ? null : 'decisions')}>
          <span><EuIcon name="check" /></span>
          <small>DECISÕES</small>
          <strong>{decisions.length}</strong>
          <p>{decisions.filter((item) => item.state === 'review').length} prontas para aprender com o resultado</p>
        </button>
        <button className="command-summary-card radar" onClick={() => setExpanded(expanded === 'radar' ? null : 'radar')}>
          <span><EuIcon name="sparkles" /></span>
          <small>RADAR</small>
          <strong>{opportunities.length + friction.length}</strong>
          <p>oportunidades + pontos de fricção</p>
        </button>
      </div>

      {expanded === 'loops' && (
        <section className="command-detail-card">
          <div className="command-section-head">
            <div><small>OPEN LOOPS + COMMITMENTS</small><h3>O que ainda não terminou</h3></div>
            <span>{openLoops.length}</span>
          </div>
          <div className="commitment-ledger">
            <article>
              <span className="ledger-mark mine"><EuIcon name="user" /></span>
              <div><small>EU PROMETI / DEPENDE DE MIM</small><strong>{mine.length}</strong><p>{mine[0] ? compact(mine[0].record.text, 78) : 'Nenhum compromisso seu detectado agora.'}</p></div>
            </article>
            <article>
              <span className="ledger-mark theirs"><EuIcon name="clock" /></span>
              <div><small>PROMETERAM / DEPENDE DE OUTROS</small><strong>{theirs.length}</strong><p>{theirs[0] ? compact(theirs[0].record.text, 78) : 'Nada aguardando terceiros neste contexto.'}</p></div>
            </article>
          </div>
          <div className="command-record-list">
            {openLoops.slice(0, 6).map((record) => (
              <NavLink key={record.id} to={'/registro/' + record.id}>
                <Tag tone={isWaitingRecordSafe(record) ? 'lilac' : typeTone(record.type)}>{isWaitingRecordSafe(record) ? 'AGUARDANDO' : record.type}</Tag>
                <div><strong>{compact(record.text, 92)}</strong><small>{record.nextMove || record.area}</small></div>
                <EuIcon name="arrow-up-right" />
              </NavLink>
            ))}
          </div>
          {quiet.length > 0 && (
            <div className="no-action-needed">
              <span><EuIcon name="check" /></span>
              <div><strong>{quiet.length} coisas acompanhadas. Nenhuma ação necessária agora.</strong><p>O EU mantém isso vivo sem colocar na sua cabeça.</p></div>
            </div>
          )}
        </section>
      )}

      {expanded === 'decisions' && (
        <section className="command-detail-card">
          <div className="command-section-head">
            <div><small>DECISION JOURNAL</small><h3>Decisões que ensinam</h3></div>
            <span>{counterfactuals.length} para revisar</span>
          </div>
          <div className="decision-journal">
            {decisions.slice(0, 6).map((entry) => (
              <NavLink key={entry.id} to={'/registro/' + entry.record.id} className={'decision-entry state-' + entry.state}>
                <span><EuIcon name={entry.state === 'learned' ? 'check' : entry.state === 'review' ? 'refresh' : 'clock'} /></span>
                <div><strong>{compact(entry.record.text, 94)}</strong><p>{entry.note}</p>{entry.record.expectation && <small>esperava: {compact(entry.record.expectation, 82)}</small>}</div>
                <EuIcon name="arrow-up-right" />
              </NavLink>
            ))}
            {!decisions.length && <p className="command-soft-empty">Quando você registrar decisões, o EU acompanha expectativa e resultado para aprender com elas.</p>}
          </div>
        </section>
      )}

      {expanded === 'radar' && (
        <section className="command-detail-card">
          <div className="command-section-head">
            <div><small>RADAR PESSOAL</small><h3>Oportunidade, fricção e “não agora”</h3></div>
            <span>{opportunities.length + friction.length + someday.length}</span>
          </div>
          <div className="radar-columns">
            <article className="radar-column opportunities">
              <div className="radar-column-title"><span><EuIcon name="sparkles" /></span><div><small>OPORTUNIDADES</small><strong>{opportunities.length}</strong></div></div>
              {opportunities.slice(0, 3).map((item) => <NavLink key={item.id} to={'/registro/' + item.record.id}>{compact(item.record.text, 76)}<EuIcon name="arrow-up-right" /></NavLink>)}
              {!opportunities.length && <p>Nenhuma oportunidade relevante detectada agora.</p>}
            </article>
            <article className="radar-column friction">
              <div className="radar-column-title"><span><EuIcon name="refresh" /></span><div><small>FRICTION MAP</small><strong>{friction.length}</strong></div></div>
              {friction.slice(0, 3).map((item) => <NavLink key={item.id} to={'/registro/' + item.record.id}><b>{compact(item.record.text, 66)}</b><small>{item.reason}</small></NavLink>)}
              {!friction.length && <p>Nenhum atrito repetitivo relevante detectado.</p>}
            </article>
          </div>
          {someday.length > 0 && (
            <div className="someday-strip">
              <span><EuIcon name="moon" /></span>
              <div><small>SOMEDAY / NOT NOW</small><strong>{someday.length} ideias podem dormir sem ocupar atenção.</strong><p>{compact(someday[0].text, 100)}</p></div>
            </div>
          )}
        </section>
      )}

      <section className="state-of-me-card">
        <div className="state-orbit" aria-hidden="true"><i /><i /><b>EU</b></div>
        <div className="state-copy">
          <small>STATE OF ME</small>
          <h3>{state.headline}</h3>
          <p>{state.detail}</p>
          <div className="state-area-chips">{state.topAreas.map((item) => <span key={item.area}>{item.area} · {item.count}</span>)}</div>
        </div>
      </section>

      <details className="personal-api-card">
        <summary><span><EuIcon name="collections" /></span><div><strong>Personal API</strong><small>uma única resposta estruturada para o resto do EU</small></div><EuIcon name="arrow-right" /></summary>
        <div className="personal-api-grid">
          <span><b>{snapshot.counts.openLoops}</b> loops</span>
          <span><b>{snapshot.counts.waiting}</b> aguardando</span>
          <span><b>{snapshot.counts.projects}</b> projetos</span>
          <span><b>{snapshot.counts.goals}</b> objetivos</span>
        </div>
        <p>Essa camada evita que cada tela invente uma versão diferente da sua vida. Todos os módulos podem consultar o mesmo snapshot.</p>
      </details>
    </section>
  )
}

function isWaitingRecordSafe(record: StoredRecord) {
  const value = (record.type + ' ' + record.text + ' ' + (record.nextMove || '')).toLowerCase()
  return ['aguardando', 'esperando', 'depende de', 'retorno', 'resposta de', 'ficou de'].some((term) => value.includes(term))
}
