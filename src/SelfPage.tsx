import { NavLink } from 'react-router-dom'
import { deriveIdentityNow, deriveManifesto } from './lifeModel'
import { useRecords } from './appState'
import { BrandTop, SectionTitle, Tag, typeTone } from './v2Ui'

export default function SelfPage() {
  const records = useRecords()
  const identity = deriveIdentityNow(records)
  const manifesto = deriveManifesto(records)

  return (
    <div className="v2-page self-page">
      <BrandTop />
      <NavLink className="back-v2" to="/vida">← Vida</NavLink>

      <header className="v2-hero self-hero">
        <Tag tone="lilac">QUEM EU SOU AGORA</Tag>
        <h1>Uma identidade<br />que continua mudando.</h1>
        <p>Não é um perfil fixo. É uma leitura da fase atual a partir do que você anda vivendo, escolhendo e registrando.</p>
      </header>

      <section className="identity-now-card">
        <Tag tone="cobalt">NESTA FASE</Tag>
        <h2>{identity.headline}</h2>
        <p>{identity.narrative}</p>

        <div className="identity-chip-row">
          {identity.topAreas.map((area) => <span key={area}>{area}</span>)}
          {identity.topTags.map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
      </section>

      {identity.active.length > 0 && (
        <section className="self-section">
          <SectionTitle eyebrow="EM MOVIMENTO" title="Coisas que fazem parte de você agora" />
          <div className="self-active-list">
            {identity.active.map((item, index) => <article key={index}>{item}</article>)}
          </div>
        </section>
      )}

      <section className="self-section">
        <SectionTitle eyebrow="MANIFESTO" title="Coisas que parecem princípios seus" />
        <div className="manifesto-list">
          {manifesto.length ? manifesto.map((record) => (
            <NavLink key={record.id} to={'/registro/' + record.id}>
              <Tag tone={typeTone(record.type)}>{record.type}</Tag>
              <p>{record.text}</p>
            </NavLink>
          )) : (
            <div className="soft-empty wide">
              <span>✦</span>
              <p>Conforme você registrar preferências e decisões, o EU começa a reconhecer frases que parecem princípios seus.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
