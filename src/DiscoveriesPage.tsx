import { useMemo } from 'react'
import { useRecords } from './appState'
import { BrandTop, SectionTitle, Tag, typeTone } from './v2Ui'

function recommendation(records: ReturnType<typeof useRecords>) {
  const counts = new Map<string, number>()
  records.slice(0, 30).forEach((record) => counts.set(record.area, (counts.get(record.area) || 0) + 1))
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  if (top === 'Carreira') return ['Finance Analytics na prática', 'Como transformar experiência em cases', 'SQL aplicado a decisões de negócio']
  if (top === 'Compras') return ['Como comparar sem comprar por impulso', 'Custo total antes da decisão', 'O que seu histórico diz sobre seu gosto']
  if (top === 'Estudos') return ['Como consolidar o que você aprende', 'Revisão espaçada sem virar obrigação', 'Conectar estudo com projetos reais']
  if (top === 'Viagens') return ['Destinos que combinam com o que você salva', 'Como transformar referências em roteiro', 'Viagens que merecem entrar no plano']
  return ['O que tem chamado sua atenção ultimamente?', 'Padrões escondidos nas suas escolhas', 'Uma ideia boa merece ser reencontrada']
}

export default function DiscoveriesPage() {
  const records = useRecords()

  const insights = records.filter((record) => ['Insight', 'Ideia', 'Preferência'].includes(record.type)).slice(0, 8)
  const savedLinks = records.flatMap((record) =>
    (record.attachments || [])
      .filter((attachment) => attachment.kind === 'link' && attachment.url)
      .map((attachment) => ({ record, attachment })),
  ).slice(0, 8)
  const suggestions = useMemo(() => recommendation(records), [records])

  return (
    <div className="v2-page discoveries-page">
      <BrandTop />

      <header className="v2-hero discovery-hero">
        <Tag tone="amber">DESCOBERTAS</Tag>
        <h1>Coisas que<br />valem um segundo olhar.</h1>
        <p>Links, insights, ideias e sugestões conectadas ao que anda aparecendo na sua vida.</p>
      </header>

      <section className="discovery-feature">
        <span>✦</span>
        <div>
          <small>PARA VOCÊ</small>
          <h2>{suggestions[0]}</h2>
          <p>Uma direção sugerida a partir dos assuntos que mais apareceram nos seus registros recentes.</p>
        </div>
      </section>

      <section className="discovery-block">
        <SectionTitle eyebrow="SAQUEI" title="Insights seus" />
        <div className="discovery-grid">
          {insights.length ? insights.map((record) => (
            <article className="discovery-card" key={record.id}>
              <Tag tone={typeTone(record.type)}>{record.type}</Tag>
              <p>{record.text}</p>
              <small>{record.area}</small>
            </article>
          )) : (
            <div className="soft-empty wide">
              <span>✦</span>
              <p>Quando você disser coisas como “saquei que…”, “percebi que…” ou guardar uma ideia, elas aparecem aqui.</p>
            </div>
          )}
        </div>
      </section>

      <section className="discovery-block">
        <SectionTitle eyebrow="SALVEI" title="Links que você quis guardar" />
        <div className="saved-link-list">
          {savedLinks.length ? savedLinks.map(({ record, attachment }) => (
            <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer">
              <div>
                <Tag tone="amber">LINK</Tag>
                <strong>{attachment.name}</strong>
                <p>{record.text || 'Referência salva'}</p>
              </div>
              <span>↗</span>
            </a>
          )) : <p className="muted-copy">Ainda não há links salvos. No Registrar, você poderá colar um link e deixar o EU guardar o contexto junto.</p>}
        </div>
      </section>

      <section className="discovery-block">
        <SectionTitle eyebrow="EXPLORAR" title="Talvez valha olhar isso" />
        <div className="suggestion-stack">
          {suggestions.slice(1).map((item, index) => (
            <article key={item}>
              <span>0{index + 1}</span>
              <h3>{item}</h3>
              <p>Sugestão local baseada nos padrões recentes. Sem notificação vazia e sem obrigação de abrir.</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
