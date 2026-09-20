import { NavLink } from 'react-router-dom'
import { useRecords } from './appState'
import { deriveSmartCollections } from './uxFeatures'
import { BrandTop, EuIcon, Tag, typeTone } from './v2Ui'

export default function CollectionsPage() {
  const records = useRecords()
  const collections = deriveSmartCollections(records)

  return (
    <div className="v2-page collections-page">
      <BrandTop />
      <NavLink className="back-v2" to="/memorias"><EuIcon name="arrow-left" />Memórias</NavLink>

      <header className="v2-hero">
        <Tag tone="lilac">COLEÇÕES</Tag>
        <h1>O EU já juntou<br />isso pra você.</h1>
        <p>Sem criar pastas manualmente. Favoritos, decisões, links, desejos e coisas importantes se organizam sozinhos.</p>
      </header>

      <div className="collections-grid-v2">
        {collections.map((collection) => (
          <section key={collection.id} className={'collection-v2 collection-tone-' + collection.tone}>
            <div className="collection-v2-head">
              <Tag tone={collection.tone}>{collection.records.length}</Tag>
              <span>{collection.id}</span>
            </div>
            <h2>{collection.title}</h2>
            <p>{collection.description}</p>
            <div className="collection-preview-list">
              {collection.records.slice(0, 4).map((record) => (
                <NavLink key={record.id} to={'/registro/' + record.id}>
                  <Tag tone={typeTone(record.type)}>{record.type}</Tag>
                  <span>{record.text}</span>
                </NavLink>
              ))}
            </div>
            <NavLink className="collection-see-all" to={'/memorias?colecao=' + collection.id}><span>ver tudo</span><EuIcon name="arrow-up-right" /></NavLink>
          </section>
        ))}

        {!collections.length && (
          <div className="soft-empty wide">
            <span><EuIcon name="collections" /></span>
            <p>As coleções aparecem conforme você favorita, fixa, decide, pesquisa e salva links.</p>
          </div>
        )}
      </div>
    </div>
  )
}
