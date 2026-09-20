import { NavLink } from 'react-router-dom'
import { deriveChapters } from './lifeModel'
import { useRecords } from './appState'
import { BrandTop, EuIcon, SectionTitle, Tag, formatShortDate, typeTone } from './v2Ui'
import { downloadEditorialHtml } from './v3Life'

export default function ChaptersPage() {
  const records = useRecords()
  const chapters = deriveChapters(records)

  return (
    <div className="v2-page chapters-page">
      <BrandTop />
      <NavLink className="back-v2" to="/vida"><EuIcon name="arrow-left" />Vida</NavLink>

      <header className="v2-hero">
        <Tag tone="sky">CAPÍTULOS</Tag>
        <h1>Fases que viraram<br />história.</h1>
        <p>O EU junta registros que atravessam o tempo e mostra quando um assunto deixa de ser só uma nota e vira um capítulo.</p>
      </header>

      <div className="chapter-grid">
        {chapters.map((chapter, index) => (
          <article key={chapter.id} className={'chapter-card chapter-' + (index % 5)}>
            <Tag tone={index % 2 ? 'lilac' : 'sky'}>{chapter.records.length} registros</Tag>
            <h2>{chapter.label}</h2>
            <p>{formatShortDate(chapter.start)} → {formatShortDate(chapter.end)}</p>
            <button
              className="chapter-export-button"
              onClick={() => downloadEditorialHtml(
                chapter.label,
                'Um capítulo do seu arquivo vivo, reunindo registros, decisões e contextos que fizeram parte desta fase.',
                chapter.records,
                'eu-capitulo-' + chapter.id.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.html',
              )}
            >
              exportar capítulo <EuIcon name="arrow-up-right" />
            </button>
            <div className="chapter-preview">
              {chapter.records.slice(-3).reverse().map((record) => (
                <NavLink key={record.id} to={'/registro/' + record.id}>
                  <Tag tone={typeTone(record.type)}>{record.type}</Tag>
                  <span>{record.text}</span>
                </NavLink>
              ))}
            </div>
          </article>
        ))}

        {!chapters.length && (
          <div className="soft-empty wide">
            <span><EuIcon name="collections" /></span>
            <p>Capítulos aparecem quando um assunto se repete ao longo do tempo ou quando você liga registros ao mesmo capítulo.</p>
          </div>
        )}
      </div>
    </div>
  )
}
