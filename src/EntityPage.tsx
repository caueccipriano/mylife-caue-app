import { NavLink, useParams } from 'react-router-dom'
import { entityBySlug } from './meaning'
import { useRecords } from './appState'
import { BrandTop, EuIcon, SectionTitle, Tag, formatShortDate, typeIcon, typeTone } from './v2Ui'

export default function EntityPage() {
  const { slug } = useParams()
  const records = useRecords()
  const entity = entityBySlug(records, slug || '')

  if (!entity) {
    return (
      <div className="v2-page entity-page">
        <BrandTop />
        <section className="entity-empty">
          <Tag tone="muted">ASSUNTO</Tag>
          <h1>Ainda não há uma página forte o bastante para esse assunto.</h1>
          <NavLink to="/descobertas"><EuIcon name="arrow-left" />Voltar para Descobertas</NavLink>
        </section>
      </div>
    )
  }

  const active = entity.records.filter((record) => record.status === 'active').length
  const completed = entity.records.filter((record) => record.status === 'completed').length
  const first = [...entity.records].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]

  return (
    <div className="v2-page entity-page">
      <BrandTop />
      <NavLink className="back-v2" to="/descobertas"><EuIcon name="arrow-left" />Descobertas</NavLink>

      <header className="entity-hero">
        <Tag tone="amber">ASSUNTO VIVO</Tag>
        <h1>{entity.label}</h1>
        <p>Essa página nasceu sozinha porque o assunto começou a aparecer em partes diferentes da sua vida.</p>
      </header>

      <div className="entity-stats">
        <article><strong>{entity.count}</strong><span>registros</span></article>
        <article><strong>{active}</strong><span>em movimento</span></article>
        <article><strong>{completed}</strong><span>concluídos</span></article>
      </div>

      <section className="entity-story">
        <Tag tone="green">DESDE QUANDO</Tag>
        <h2>Esse assunto aparece no seu EU desde {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(first.createdAt))}.</h2>
        <div className="belongs-chips">
          {entity.kinds.map((kind) => <span key={kind}>{kind}</span>)}
        </div>
      </section>

      <section className="entity-records">
        <SectionTitle eyebrow="CONEXÕES" title={'Tudo sobre ' + entity.label} />
        <div className="memory-list">
          {entity.records.map((record) => (
            <article key={record.id} className={'entity-record-card type-border-' + typeTone(record.type)}>
              <div className={'memory-icon memory-icon-' + typeTone(record.type)}><EuIcon name={typeIcon(record.type)} /></div>
              <div>
                <div className="feed-meta"><Tag tone={typeTone(record.type)}>{record.type}</Tag><span>{record.area}</span></div>
                <NavLink to={'/registro/' + record.id}>{record.text}</NavLink>
                <p>{formatShortDate(record.createdAt)}{record.journeyStage ? ' · ' + record.journeyStage : ''}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
