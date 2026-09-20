import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { isRecordVisibleForInsights, suggestTags } from './storage'
import { deriveEntities, detectPreferenceShifts, entitySlug } from './meaning'
import { useRecords } from './appState'
import { BrandTop, EuIcon, SectionTitle, Tag, typeTone } from './v2Ui'

function safeExternalUrl(value?: string) {
  if (!value) return null
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

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

function recommendationContext(records: ReturnType<typeof useRecords>) {
  const counts = new Map<string, number>()
  records.slice(0, 30).forEach((record) => counts.set(record.area, (counts.get(record.area) || 0) + 1))
  const [area, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
  if (!area || !count) return 'porque alguns temas seus estão começando a se repetir'
  return 'porque ' + area + ' apareceu ' + count + (count === 1 ? ' vez' : ' vezes') + ' nos seus registros recentes'
}

export default function DiscoveriesPage() {
  const records = useRecords()
  const [view, setView] = useState<'for-you' | 'library' | 'topics'>('for-you')

  const visibleRecords = records.filter(isRecordVisibleForInsights)
  const insights = visibleRecords.filter((record) => ['Insight', 'Ideia', 'Preferência'].includes(record.type)).slice(0, 8)
  const savedLinks = visibleRecords.flatMap((record) =>
    (record.attachments || [])
      .filter((attachment) => attachment.kind === 'link' && safeExternalUrl(attachment.url))
      .map((attachment) => ({ record, attachment, href: safeExternalUrl(attachment.url) as string })),
  ).slice(0, 12)
  const suggestions = useMemo(() => recommendation(visibleRecords), [records])
  const suggestionContext = useMemo(() => recommendationContext(visibleRecords), [records])
  const preferenceShifts = useMemo(() => detectPreferenceShifts(visibleRecords), [records])
  const entities = useMemo(() => deriveEntities(visibleRecords).slice(0, 12), [records])
  const collections = useMemo(() => {
    const grouped = new Map<string, typeof records>()
    visibleRecords.forEach((record) => {
      const tags = record.tags?.length ? record.tags : suggestTags(record.text, record.area, record.type)
      tags.forEach((tag) => {
        const current = grouped.get(tag) ?? []
        current.push(record)
        grouped.set(tag, current)
      })
    })
    return [...grouped.entries()]
      .filter(([, items]) => items.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8)
  }, [records])

  return (
    <div className="v2-page discoveries-page">
      <BrandTop />

      <header className="v2-hero discovery-hero">
        <Tag tone="amber">DESCOBERTAS</Tag>
        <h1>Coisas que<br />valem um segundo olhar.</h1>
        <p>O que o EU sugere, o que você salvou e os assuntos que continuam reaparecendo — cada coisa no seu lugar.</p>
      </header>

      <nav className="discovery-view-tabs" aria-label="Visões de Descobertas">
        <button className={view === 'for-you' ? 'active' : ''} onClick={() => setView('for-you')}><EuIcon name="sparkles" />Pra mim</button>
        <button className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}><EuIcon name="collections" />Biblioteca</button>
        <button className={view === 'topics' ? 'active' : ''} onClick={() => setView('topics')}><EuIcon name="note" />Assuntos</button>
      </nav>

      {view === 'for-you' && (
        <>
          <section className="discovery-feature">
            <span className="discovery-feature-icon"><EuIcon name="sparkles" /></span>
            <div>
              <small>PARA VOCÊ</small>
              <h2>{suggestions[0]}</h2>
              <p>{suggestionContext}.</p>
            </div>
          </section>

          <section className="discovery-block">
            <SectionTitle eyebrow="SAQUEI" title="Insights seus" />
            <div className="discovery-grid">
              {insights.length ? insights.map((record) => (
                <NavLink className="discovery-card discovery-record-link tappable-card" key={record.id} to={'/registro/' + record.id}>
                  <Tag tone={typeTone(record.type)}>{record.type}</Tag>
                  <p>{record.text}</p>
                  <small>{record.area}</small>
                </NavLink>
              )) : (
                <div className="soft-empty wide"><span><EuIcon name="sparkles" /></span><p>Ideias, percepções e preferências aparecem aqui.</p></div>
              )}
            </div>
          </section>

          <section className="discovery-block">
            <SectionTitle eyebrow="EXPLORAR" title="Talvez valha olhar isso" />
            <div className="suggestion-stack">
              {suggestions.slice(1).map((item, index) => (
                <article key={item}>
                  <span>0{index + 1}</span>
                  <h3>{item}</h3>
                  <p>{suggestionContext}. Sem obrigação de abrir.</p>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {view === 'library' && (
        <>
          <section className="discovery-block">
            <SectionTitle eyebrow="SALVEI" title="Links que você quis guardar" />
            <div className="saved-link-list">
              {savedLinks.length ? savedLinks.map(({ record, attachment, href }) => (
                <a key={attachment.id} href={href} target="_blank" rel="noopener noreferrer">
                  <div><Tag tone="amber">LINK</Tag><strong>{attachment.name}</strong><p>{record.text || 'Referência salva'}</p></div>
                  <span className="saved-link-icon"><EuIcon name="arrow-up-right" /></span>
                </a>
              )) : <p className="muted-copy">Ainda não há links salvos.</p>}
            </div>
          </section>

          {collections.length > 0 && (
            <section className="discovery-block">
              <SectionTitle eyebrow="COLEÇÕES" title="O EU juntou pra você" />
              <div className="auto-collections">
                {collections.map(([tag, items], index) => (
                  <NavLink key={tag} to={'/assunto/' + entitySlug(tag)} className={'collection-card collection-' + (index % 4)}>
                    <span>#{tag}</span><strong>{items.length} coisas conectadas</strong><p>{items[0]?.text}</p><b>ver coleção <EuIcon name="arrow-up-right" /></b>
                  </NavLink>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {view === 'topics' && (
        <>
          {preferenceShifts.length > 0 && (
            <section className="discovery-block">
              <SectionTitle eyebrow="VOCÊ MUDOU DE IDEIA?" title="Seu gosto também evolui" />
              <div className="preference-shifts">
                {preferenceShifts.map((shift) => (
                  <article key={shift.id}>
                    <div className="preference-shift-head"><Tag tone="lilac">#{shift.topic}</Tag><span>{shift.explicit ? 'mudança explícita' : 'evolução percebida'}</span></div>
                    <div className="before-after">
                      <NavLink to={'/registro/' + shift.previous.id}><small>ANTES</small><p>{shift.previous.text}</p></NavLink>
                      <b className="preference-shift-arrow"><EuIcon name="arrow-right" /></b>
                      <NavLink to={'/registro/' + shift.current.id}><small>AGORA</small><p>{shift.current.text}</p></NavLink>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="discovery-block">
            <SectionTitle eyebrow="ASSUNTOS VIVOS" title="Coisas que ganharam uma página própria" />
            <div className="entity-cloud entity-cloud-v4">
              {entities.map((entity, index) => (
                <NavLink key={entity.slug} to={'/assunto/' + entity.slug} className={'entity-chip entity-chip-' + (index % 4) + ' entity-chip-size-' + (entity.count >= 8 ? 'lg' : entity.count >= 4 ? 'md' : 'sm')}>
                  <strong>{entity.label}</strong><span>{entity.count} conexões</span>
                </NavLink>
              ))}
              {!entities.length && <div className="soft-empty wide"><span><EuIcon name="note" /></span><p>Assuntos vivos aparecem conforme temas se repetem.</p></div>}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
