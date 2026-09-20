import { type FormEvent, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { answerFromEu, type EuAnswer } from './askEu'
import { useBridges, useRecords } from './appState'
import { BrandTop, EuIcon, Tag, typeTone } from './v2Ui'

const suggestions = [
  'O que eu já decidi sobre carreira?',
  'Qual era aquele relógio que eu gostei?',
  'O que eu já falei sobre SQL?',
  'Quando comecei a pensar em trocar de carro?',
]

export default function AskEuPage() {
  const records = useRecords()
  const { bridges } = useBridges()
  const [query, setQuery] = useState('')
  const [asked, setAsked] = useState('')
  const answer = useMemo<EuAnswer | null>(() => asked ? answerFromEu(records, bridges, asked) : null, [asked, records, bridges])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!query.trim()) return
    setAsked(query.trim())
  }

  function ask(value: string) {
    setQuery(value)
    setAsked(value)
  }

  return (
    <div className="v2-page ask-eu-page">
      <BrandTop />

      <header className="v2-hero ask-eu-hero">
        <Tag tone="ink">PERGUNTE AO EU</Tag>
        <h1>Seu arquivo<br />responde de volta.</h1>
        <p>Pergunte como falaria comigo. A resposta usa apenas registros não privados e mostra de onde tirou cada coisa.</p>
      </header>

      <form className="ask-eu-box" onSubmit={submit}>
        <span className="ask-eu-search-icon"><EuIcon name="search" /></span>
        <textarea value={query} onChange={(event) => setQuery(event.target.value)} rows={2} placeholder="Ex.: o que eu já decidi sobre minha carreira?" />
        <button type="submit">Perguntar</button>
      </form>

      {!answer && (
        <div className="ask-suggestions">
          {suggestions.map((item) => <button key={item} onClick={() => ask(item)}><EuIcon name="sparkles" /><span>{item}</span></button>)}
        </div>
      )}

      {answer && (
        <section className="ask-answer">
          <Tag tone="green">O EU ENCONTROU</Tag>
          <h2>{answer.answer}</h2>
          {answer.note && <p>{answer.note}</p>}

          {answer.sources.length > 0 && (
            <div className="ask-sources">
              <small>FONTES NO SEU ARQUIVO</small>
              {answer.sources.map((record) => (
                <NavLink key={record.id} to={'/registro/' + record.id}>
                  <div>
                    <Tag tone={typeTone(record.type)}>{record.type}</Tag>
                    <span>{record.area}</span>
                  </div>
                  <p>{record.text}</p>
                  <b><EuIcon name="arrow-up-right" /></b>
                </NavLink>
              ))}
            </div>
          )}

          <button className="ask-again" onClick={() => { setAsked(''); setQuery('') }}><EuIcon name="refresh" />Perguntar outra coisa</button>
        </section>
      )}
    </div>
  )
}
