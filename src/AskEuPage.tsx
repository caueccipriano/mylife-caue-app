import { type FormEvent, useMemo, useState } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { askEuBrain, type BrainAnswer } from './euBrain'
import { useBridges, useRecords } from './appState'
import { BrandTop, EuIcon, Tag, typeTone, type EuIconName } from './v2Ui'

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

export default function AskEuPage() {
  const records = useRecords()
  const { bridges } = useBridges()
  const [params, setParams] = useSearchParams()
  const initialQuery = params.get('q')?.trim() || ''
  const [query, setQuery] = useState(initialQuery)
  const [asked, setAsked] = useState(initialQuery)
  const answer = useMemo<BrainAnswer | null>(() => asked ? askEuBrain(records, bridges, asked) : null, [asked, records, bridges])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!query.trim()) return
    const value = query.trim()
    setAsked(value)
    setParams({ q: value }, { replace: true })
  }

  function ask(value: string) {
    setQuery(value)
    setAsked(value)
    setParams({ q: value }, { replace: true })
  }

  function reset() {
    setAsked('')
    setQuery('')
    setParams({}, { replace: true })
  }

  return (
    <div className="v2-page ask-eu-page brain-page">
      <BrandTop />

      <header className="brain-hero">
        <div className="brain-hero-copy">
          <Tag tone="cobalt">EU BRAIN</Tag>
          <h1>Pergunte à<br />sua própria vida.</h1>
          <p>O EU cruza contexto, decisões, projetos, objetivos, pessoas e sinais já existentes no seu arquivo. Sem inventar fatos e sem executar nada por você.</p>
        </div>
        <div className="brain-orbit" aria-hidden="true">
          <span /><span /><span />
          <b>EU</b>
        </div>
      </header>

      <form className="brain-command-box" onSubmit={submit}>
        <span className="brain-command-mark"><EuIcon name="sparkles" /></span>
        <textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          rows={2}
          placeholder="Ex.: onde paramos no Editalume? · o que mudou? · quem estou esperando?"
          aria-label="Pergunta para o EU Brain"
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
            <span><EuIcon name="collections" /></span>
            <small>CONTEXTO</small>
            <strong>Onde paramos?</strong>
            <p>Retoma projeto, próximo passo, decisões relacionadas e coisas aguardando.</p>
          </article>
          <article className="brain-start-card impact">
            <span><EuIcon name="compass" /></span>
            <small>IMPACTO</small>
            <strong>O que isso afeta?</strong>
            <p>Mostra áreas e registros conectados antes de você tratar hipótese como fato.</p>
          </article>
          <article className="brain-start-card truth">
            <span><EuIcon name="shield" /></span>
            <small>TRUTH LAYER</small>
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
            <button onClick={reset} aria-label="Nova pergunta"><EuIcon name="refresh" /></button>
          </header>

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

          <button className="brain-ask-again" onClick={reset}><EuIcon name="plus" />Fazer outra pergunta</button>
        </section>
      )}
    </div>
  )
}
