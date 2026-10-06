import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { askEuBrain, type BrainAnswer } from './euBrain'
import { useBridges, useRecords } from './appState'
import { BrandTop, EuIcon, Tag, typeTone, type EuIconName } from './v2Ui'

const HISTORY_KEY = 'eu-brain-history-v1'

type ConversationTurn = {
  id: string
  question: string
  answer: string
  detail?: string
  confidence: BrainAnswer['confidence']
  at: string
}

const suggestions: Array<{ label: string; query: string; icon: EuIconName }> = [
  { label: 'Agora', query: 'O que eu preciso saber agora?', icon: 'bolt' },
  { label: 'Mudou', query: 'O que mudou na minha vida esta semana?', icon: 'refresh' },
  { label: 'Paramos', query: 'Onde paramos no meu projeto?', icon: 'collections' },
  { label: 'Decisões', query: 'O que eu já decidi recentemente?', icon: 'check' },
  { label: 'Aguardando', query: 'Quem estou esperando agora?', icon: 'clock' },
  { label: 'Impacto', query: 'O que isso afeta na minha vida?', icon: 'compass' },
]

function confidenceLabel(value: BrainAnswer['confidence']) {
  if (value === 'high') return 'contexto forte'
  if (value === 'medium') return 'contexto parcial'
  return 'pouco contexto'
}

function readHistory(): ConversationTurn[] {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as ConversationTurn[]
    return Array.isArray(value) ? value.slice(-8) : []
  } catch {
    return []
  }
}

function needsPreviousContext(value: string) {
  const clean = value.trim().toLocaleLowerCase('pt-BR')
  if (!clean) return false
  return clean.split(/\s+/).length <= 5
    || /^(e |e sobre|e se|isso|esse|essa|aquele|aquela|ele|ela|tamb[eé]m|agora|por que|e agora)/.test(clean)
}

export default function AskEuPage() {
  const records = useRecords()
  const { bridges } = useBridges()
  const [params, setParams] = useSearchParams()
  const initialQuery = params.get('q')?.trim() || ''
  const [query, setQuery] = useState(initialQuery)
  const [asked, setAsked] = useState(initialQuery)
  const [history, setHistory] = useState<ConversationTurn[]>(readHistory)
  const [contextAnchor, setContextAnchor] = useState(() => readHistory().at(-1)?.question || '')

  const previousTurn = history[history.length - 1]
  const contextualQuestion = asked && contextAnchor && needsPreviousContext(asked) && contextAnchor !== asked
    ? contextAnchor + '. Continuação: ' + asked
    : asked

  const answer = useMemo<BrainAnswer | null>(
    () => contextualQuestion ? askEuBrain(records, bridges, contextualQuestion) : null,
    [contextualQuestion, records, bridges],
  )

  useEffect(() => {
    if (!asked || !answer) return
    const last = history[history.length - 1]
    if (last?.question === asked && last.answer === answer.answer) return

    const turn: ConversationTurn = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      question: asked,
      answer: answer.answer,
      detail: answer.detail,
      confidence: answer.confidence,
      at: new Date().toISOString(),
    }
    const next = [...history, turn].slice(-8)
    setHistory(next)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  }, [asked, answer])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!query.trim()) return
    const value = query.trim()
    setContextAnchor(history.at(-1)?.question || '')
    setAsked(value)
    setParams({ q: value }, { replace: true })
  }

  function ask(value: string) {
    setContextAnchor(history.at(-1)?.question || '')
    setQuery(value)
    setAsked(value)
    setParams({ q: value }, { replace: true })
  }

  function reset() {
    setAsked('')
    setQuery('')
    setParams({}, { replace: true })
  }

  function clearConversation() {
    setHistory([])
    setContextAnchor('')
    localStorage.removeItem(HISTORY_KEY)
  }

  return (
    <div className="v2-page ask-eu-page brain-page brain-conversation-v32">
      <BrandTop />

      <header className="brain-hero">
        <div className="brain-hero-copy">
          <Tag tone="cobalt">EU · ASSISTENTE</Tag>
          <h1>Converse com<br />a sua própria vida.</h1>
          <p>O EU cruza seu arquivo, mantém o fio da conversa e mostra as fontes. Quando não sabe, não inventa.</p>
        </div>
        <div className="brain-orbit" aria-hidden="true">
          <span /><span /><span />
          <b>EU</b>
        </div>
      </header>

      {history.length > 0 && (
        <section className="brain-history-v32" aria-label="Contexto recente da conversa">
          <header>
            <div><small>CONVERSA RECENTE</small><strong>O EU lembra do fio.</strong></div>
            <button onClick={clearConversation}>limpar</button>
          </header>
          <div>
            {history.slice(-3).map((turn) => (
              <button key={turn.id} className="brain-history-turn-v32" onClick={() => ask(turn.question)}>
                <span><EuIcon name="chat" /></span>
                <div><small>VOCÊ</small><strong>{turn.question}</strong><p>{turn.answer}</p></div>
                <EuIcon name="arrow-up-right" />
              </button>
            ))}
          </div>
        </section>
      )}

      <form className="brain-command-box" onSubmit={submit}>
        <span className="brain-command-mark"><EuIcon name="sparkles" /></span>
        <textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          rows={2}
          placeholder={history.length ? 'Continue daqui: “e sobre isso?”' : 'Ex.: onde paramos no Editalume?'}
          aria-label="Pergunta para o EU"
        />
        <button type="submit" disabled={!query.trim()} aria-label="Perguntar ao EU">
          <EuIcon name="arrow-right" />
        </button>
      </form>

      <div className="brain-query-chips" aria-label="Perguntas rápidas">
        {suggestions.map((item) => (
          <button key={item.label} onClick={() => ask(item.query)}>
            <EuIcon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {!answer && (
        <section className="brain-start-grid">
          <article className="brain-start-card context">
            <span><EuIcon name="chat" /></span>
            <small>CONVERSA</small>
            <strong>Pode continuar de onde parou.</strong>
            <p>Perguntas curtas como “e sobre isso?” reaproveitam o contexto recente.</p>
          </article>
          <article className="brain-start-card impact">
            <span><EuIcon name="compass" /></span>
            <small>IMPACTO</small>
            <strong>O que isso afeta?</strong>
            <p>O EU conecta áreas e registros relacionados antes de concluir qualquer coisa.</p>
          </article>
          <article className="brain-start-card truth">
            <span><EuIcon name="shield" /></span>
            <small>VERDADE</small>
            <strong>Sem resposta inventada.</strong>
            <p>Se o arquivo não sustenta uma conclusão, o EU assume que ainda não sabe.</p>
          </article>
        </section>
      )}

      {answer && (
        <section className={'brain-answer brain-intent-' + answer.intent}>
          <header className="brain-answer-head">
            <div>
              <Tag tone={answer.confidence === 'high' ? 'green' : answer.confidence === 'medium' ? 'amber' : 'muted'}>{answer.eyebrow}</Tag>
              <span className={'brain-confidence confidence-' + answer.confidence}><i />{confidenceLabel(answer.confidence)}</span>
            </div>
            <button onClick={reset} aria-label="Nova pergunta"><EuIcon name="plus" /></button>
          </header>

          {contextAnchor && needsPreviousContext(asked) && contextAnchor !== asked && (
            <div className="brain-context-chip-v32"><EuIcon name="link" />continuando de “{contextAnchor}”</div>
          )}

          <div className="brain-answer-copy">
            <h2>{answer.answer}</h2>
            {answer.detail && <p>{answer.detail}</p>}
          </div>

          {answer.actions.length > 0 && (
            <nav className="brain-actions" aria-label="Próximos caminhos">
              {answer.actions.map((action) => (
                <NavLink key={action.label + action.route} to={action.route}>
                  <EuIcon name={action.icon} />
                  <span>{action.label}</span>
                  <EuIcon name="arrow-up-right" />
                </NavLink>
              ))}
            </nav>
          )}

          <details className="brain-trace">
            <summary>
              <span><EuIcon name="shield" /><b>Como o EU chegou nisso</b></span>
              <EuIcon name="arrow-right" />
            </summary>
            <div>
              {answer.trace.map((item) => <span key={item}>{item}</span>)}
              <p>O Brain usa apenas dados disponíveis no próprio EU e nos resumos integrados deste aparelho.</p>
            </div>
          </details>

          {answer.sources.length > 0 && (
            <div className="brain-sources">
              <div className="brain-sources-head">
                <div><small>FONTES NO SEU ARQUIVO</small><strong>{answer.sources.length} evidência{answer.sources.length === 1 ? '' : 's'}</strong></div>
                <span>toque para conferir</span>
              </div>
              {answer.sources.map((record, index) => (
                <NavLink key={record.id} to={'/registro/' + record.id} className="brain-source-card">
                  <span className="brain-source-index">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <div><Tag tone={typeTone(record.type)}>{record.type}</Tag><span>{record.area}</span></div>
                    <p>{record.text}</p>
                    {record.nextMove && <small>próximo: {record.nextMove}</small>}
                  </div>
                  <EuIcon name="arrow-up-right" />
                </NavLink>
              ))}
            </div>
          )}

          {!answer.sources.length && (
            <div className="brain-no-source">
              <EuIcon name="search" />
              <div><strong>Sem evidência suficiente.</strong><p>O EU preferiu não preencher a lacuna com suposição.</p></div>
            </div>
          )}

          <button className="brain-ask-again" onClick={reset}><EuIcon name="chat" />Continuar conversa</button>
        </section>
      )}
    </div>
  )
}
