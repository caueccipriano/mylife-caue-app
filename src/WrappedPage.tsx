import { NavLink } from 'react-router-dom'
import { yearlyStory } from './lifeModel'
import { downloadEditorialHtml } from './v3Life'
import { useRecords } from './appState'
import { BrandTop, Tag } from './v2Ui'

export default function WrappedPage() {
  const records = useRecords()
  const story = yearlyStory(records)

  return (
    <div className="v2-page wrapped-page">
      <BrandTop />
      <NavLink className="back-v2" to="/vida">← Vida</NavLink>

      <header className="wrapped-hero">
        <div className="wrapped-hero-top">
          <Tag tone="cobalt">EU WRAPPED · {story.year}</Tag>
          <button onClick={() => downloadEditorialHtml(
            'EU Wrapped ' + story.year,
            'O ano que você foi virando: decisões, desejos, ciclos e momentos que ficaram.',
            records.filter((record) => !record.private && new Date(record.createdAt).getFullYear() === story.year),
            'eu-wrapped-' + story.year + '.html',
          )}>exportar edição ↗</button>
        </div>
        <h1>O ano que<br />você foi virando.</h1>
        <p>Não é produtividade. É uma retrospectiva do que ocupou espaço, virou decisão, desejo, marco e memória.</p>
      </header>

      <section className="wrapped-number">
        <strong>{story.count}</strong>
        <span>coisas entraram no seu EU em {story.year}</span>
      </section>

      <div className="wrapped-grid">
        <article className="wrapped-card wrapped-green">
          <small>FECHOU CICLOS</small>
          <strong>{story.completed}</strong>
          <span>concluídos</span>
        </article>
        <article className="wrapped-card wrapped-wine">
          <small>ESCOLHEU</small>
          <strong>{story.decisions}</strong>
          <span>decisões</span>
        </article>
        <article className="wrapped-card wrapped-pink">
          <small>QUIS / PESQUISOU</small>
          <strong>{story.desires}</strong>
          <span>desejos e pesquisas</span>
        </article>
      </div>

      {story.topAreas.length > 0 && (
        <section className="wrapped-section">
          <Tag tone="lilac">O QUE MAIS OCUPOU ESPAÇO</Tag>
          <div className="wrapped-ranking">
            {story.topAreas.map(([area, count], index) => (
              <article key={area}>
                <span>0{index + 1}</span>
                <strong>{area}</strong>
                <small>{count} registros</small>
              </article>
            ))}
          </div>
        </section>
      )}

      {story.highlights.length > 0 && (
        <section className="wrapped-section">
          <Tag tone="amber">MOMENTOS QUE FICARAM</Tag>
          <div className="wrapped-highlights">
            {story.highlights.map((record) => (
              <NavLink key={record.id} to={'/registro/' + record.id}>
                <strong>{record.type}</strong>
                <p>{record.text}</p>
              </NavLink>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
