import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useRecords } from './appState'
import { derivePeople } from './adaptiveLife'
import { BrandTop, EuIcon, Tag, typeTone } from './v2Ui'

function compact(value: string, size = 92) {
  const clean = value.trim()
  return clean.length > size ? clean.slice(0, size - 1).trimEnd() + '…' : clean
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

function relativeDate(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const days = Math.max(0, Math.floor(diff / 86400000))
  if (days === 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 7) return 'há ' + days + ' dias'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value))
}

export default function PeoplePage() {
  const records = useRecords()
  const people = useMemo(() => derivePeople(records), [records])
  const [selected, setSelected] = useState<string | null>(people[0]?.name || null)
  const current = people.find((person) => person.name === selected) || people[0]

  return (
    <div className="v2-page people-page">
      <BrandTop />
      <NavLink className="back-v2" to="/"><EuIcon name="arrow-left" />Hoje</NavLink>

      <header className="people-hero">
        <div>
          <Tag tone="pink">PESSOAS</Tag>
          <h1>Contexto,<br />não CRM.</h1>
          <p>O EU junta pessoas citadas nos seus registros, promessas e coisas aguardando — sem transformar relações em uma planilha social.</p>
        </div>
        <div className="people-orbit" aria-hidden="true"><span /><span /><b><EuIcon name="user" /></b></div>
      </header>

      {!people.length ? (
        <section className="people-empty">
          <span><EuIcon name="user" /></span>
          <div><strong>Nenhuma pessoa foi identificada com segurança ainda.</strong><p>Quando você citar nomes em contexto — ou usar registros de Pessoa/Contato — o EU começa a conectar a história automaticamente.</p></div>
        </section>
      ) : (
        <>
          <section className="people-strip" aria-label="Pessoas detectadas">
            {people.map((person) => (
              <button key={person.name} className={current?.name === person.name ? 'active' : ''} onClick={() => setSelected(person.name)}>
                <span>{initials(person.name)}</span>
                <strong>{person.name}</strong>
                <small>{person.headline}</small>
              </button>
            ))}
          </section>

          {current && (
            <section className="person-focus-card">
              <header>
                <div className="person-avatar">{initials(current.name)}</div>
                <div><small>PESSOA NO SEU EU</small><h2>{current.name}</h2><p>último contexto {relativeDate(current.lastAt)}</p></div>
              </header>

              <div className="person-stats">
                <article><strong>{current.records.length}</strong><span>registros</span></article>
                <article><strong>{current.openCount}</strong><span>contextos vivos</span></article>
                <article><strong>{current.waitingCount}</strong><span>aguardando</span></article>
                <article><strong>{current.commitmentCount}</strong><span>promessas / retornos</span></article>
              </div>

              <div className="person-timeline">
                {current.records.slice(0, 10).map((record) => (
                  <NavLink key={record.id} to={'/registro/' + record.id}>
                    <span className="person-timeline-dot" />
                    <div>
                      <small>{relativeDate(record.updatedAt || record.createdAt)} · {record.area}</small>
                      <strong>{compact(record.text, 108)}</strong>
                      <div><Tag tone={typeTone(record.type)}>{record.type}</Tag>{record.nextMove && <em>{compact(record.nextMove, 72)}</em>}</div>
                    </div>
                    <EuIcon name="arrow-up-right" />
                  </NavLink>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
