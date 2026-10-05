import { FormEvent, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useRecords } from './appState'
import { compareDecisionOptions } from './adaptiveLife'
import { BrandTop, EuIcon, Tag, typeTone } from './v2Ui'

function compact(value: string, size = 96) {
  const clean = value.trim()
  return clean.length > size ? clean.slice(0, size - 1).trimEnd() + '…' : clean
}

export default function DecidePage() {
  const records = useRecords()
  const navigate = useNavigate()
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [criteria, setCriteria] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const comparison = useMemo(() => {
    if (!submitted || !optionA.trim() || !optionB.trim()) return null
    return compareDecisionOptions(records, optionA, optionB, criteria)
  }, [records, optionA, optionB, criteria, submitted])

  function compare(event: FormEvent) {
    event.preventDefault()
    if (!optionA.trim() || !optionB.trim()) return
    setSubmitted(true)
  }

  function saveDecision(label: string) {
    const text = 'Decisão em análise: ' + optionA.trim() + ' × ' + optionB.trim() + '. Escolha atual: ' + label
    const params = new URLSearchParams({
      texto: text,
      tipo: 'Decisão',
      area: 'Pessoal',
      origem: 'manual',
    })
    navigate('/capturar?' + params.toString())
  }

  return (
    <div className="v2-page decide-page">
      <BrandTop />
      <NavLink className="back-v2" to="/"><EuIcon name="arrow-left" />Hoje</NavLink>

      <header className="decide-hero">
        <Tag tone="wine">DECIDA COMIGO</Tag>
        <h1>Duas opções.<br />Seu contexto.</h1>
        <p>O EU não escolhe por você. Ele cruza as duas opções com objetivos, projetos, decisões e sinais que já existem no seu arquivo — e mostra as evidências.</p>
      </header>

      <form className="decision-builder" onSubmit={compare}>
        <div className="decision-option-grid">
          <label className="decision-option-field option-a">
            <span>A</span>
            <div><small>OPÇÃO A</small><input value={optionA} onChange={(event) => { setOptionA(event.target.value); setSubmitted(false) }} placeholder="ex.: comprar o carro agora" /></div>
          </label>
          <label className="decision-option-field option-b">
            <span>B</span>
            <div><small>OPÇÃO B</small><input value={optionB} onChange={(event) => { setOptionB(event.target.value); setSubmitted(false) }} placeholder="ex.: esperar mais 3 meses" /></div>
          </label>
        </div>

        <label className="decision-criteria-field">
          <EuIcon name="compass" />
          <div><small>O QUE IMPORTA NESSA DECISÃO?</small><input value={criteria} onChange={(event) => { setCriteria(event.target.value); setSubmitted(false) }} placeholder="ex.: dinheiro, paz mental, carreira, prazo..." /></div>
        </label>

        <button className="decision-compare-button" type="submit" disabled={!optionA.trim() || !optionB.trim()}>
          <EuIcon name="sparkles" /> Cruzar com meu EU
        </button>
      </form>

      {!comparison && (
        <section className="decision-empty-state">
          <span><EuIcon name="shield" /></span>
          <div>
            <strong>Sem resposta inventada.</strong>
            <p>Se o seu arquivo não tiver contexto suficiente, o EU vai dizer isso em vez de fabricar uma recomendação.</p>
          </div>
        </section>
      )}

      {comparison && (
        <section className="decision-result">
          <div className="decision-result-summary">
            <Tag tone="cobalt">LEITURA DO CONTEXTO</Tag>
            <h2>{comparison.summary}</h2>
            <p>Os números abaixo representam somente força de evidência encontrada no seu próprio arquivo. Não são probabilidade de sucesso.</p>
          </div>

          <div className="decision-result-grid">
            {[comparison.optionA, comparison.optionB].map((option, index) => (
              <article className={'decision-result-card result-' + (index === 0 ? 'a' : 'b')} key={index}>
                <div className="decision-result-card-top"><span>{index === 0 ? 'A' : 'B'}</span><b>{option.score}</b></div>
                <h3>{option.label}</h3>
                <div className="decision-evidence-group">
                  <small>APOIOS NO ARQUIVO · {option.support.length}</small>
                  {option.support.map((item) => (
                    <NavLink key={item.record.id} to={'/registro/' + item.record.id}>
                      <Tag tone={typeTone(item.record.type)}>{item.record.type}</Tag>
                      <div><strong>{compact(item.record.text)}</strong><p>{item.reason}</p></div>
                      <EuIcon name="arrow-up-right" />
                    </NavLink>
                  ))}
                  {!option.support.length && <p className="decision-no-evidence">Nenhum apoio específico encontrado.</p>}
                </div>

                {option.conflicts.length > 0 && (
                  <div className="decision-evidence-group conflicts">
                    <small>CONTRAPONTOS · {option.conflicts.length}</small>
                    {option.conflicts.map((item) => (
                      <NavLink key={item.record.id} to={'/registro/' + item.record.id}>
                        <Tag tone="amber">CONTRAPONTO</Tag>
                        <div><strong>{compact(item.record.text)}</strong><p>{item.reason}</p></div>
                        <EuIcon name="arrow-up-right" />
                      </NavLink>
                    ))}
                  </div>
                )}

                <button onClick={() => saveDecision(option.label)}>
                  <EuIcon name="check" /> registrar essa escolha
                </button>
              </article>
            ))}
          </div>

          {comparison.shared.length > 0 && (
            <details className="decision-shared-context">
              <summary><span><EuIcon name="collections" /> Contexto que afeta as duas opções</span><b>{comparison.shared.length}</b></summary>
              <div>
                {comparison.shared.map((item) => (
                  <NavLink key={item.record.id} to={'/registro/' + item.record.id}>
                    <strong>{compact(item.record.text, 110)}</strong><small>{item.record.area}</small>
                  </NavLink>
                ))}
              </div>
            </details>
          )}
        </section>
      )}
    </div>
  )
}
