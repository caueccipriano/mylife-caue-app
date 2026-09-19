import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useBridges, useRecords } from './appState'
import { captureCurrentLifeSnapshot, listLifeSnapshots, type LifeSnapshot } from './snapshots'
import { BrandTop, SectionTitle, Tag } from './v2Ui'

function comparison(current: LifeSnapshot, previous?: LifeSnapshot) {
  if (!previous) return 'Este é o primeiro retrato mensal salvo pelo EU.'

  const recordDelta = current.recordCount - previous.recordCount
  const activeDelta = current.activeCount - previous.activeCount
  const parts: string[] = []

  if (recordDelta) parts.push((recordDelta > 0 ? '+' : '') + recordDelta + ' registros no arquivo')
  if (activeDelta) parts.push((activeDelta > 0 ? '+' : '') + activeDelta + ' coisas em movimento')
  if (current.topAreas[0]?.area && previous.topAreas[0]?.area && current.topAreas[0].area !== previous.topAreas[0].area) {
    parts.push(current.topAreas[0].area + ' passou a ocupar mais espaço que ' + previous.topAreas[0].area)
  }

  return parts.length ? parts.join(' · ') + '.' : 'A estrutura da sua fase está parecida com o mês anterior, mesmo que os detalhes tenham mudado.'
}

export default function SnapshotsPage() {
  const records = useRecords()
  const { bridges } = useBridges()
  const [snapshots, setSnapshots] = useState<LifeSnapshot[]>(() => listLifeSnapshots())

  useEffect(() => {
    captureCurrentLifeSnapshot(records, bridges)
    setSnapshots(listLifeSnapshots())
  }, [records, bridges])

  const current = snapshots[0]
  const previous = snapshots[1]

  return (
    <div className="v2-page snapshots-page">
      <BrandTop />
      <NavLink className="back-v2" to="/vida">← Vida</NavLink>

      <header className="v2-hero snapshots-hero">
        <Tag tone="pink">SUAS FASES</Tag>
        <h1>Você de antes.<br />Você de agora.</h1>
        <p>Todo mês o EU guarda um retrato leve da fase: o que estava ativo, o que mais aparecia e o que seus outros apps estavam contando.</p>
      </header>

      {current && (
        <section className={'phase-now phase-tone-' + (current.phaseTone || 'cobalt')}>
          <Tag tone="coral">AGORA</Tag>
          <h2>{current.label}</h2>
          <p>{comparison(current, previous)}</p>

          <div className="phase-stats">
            <article><strong>{current.recordCount}</strong><span>registros</span></article>
            <article><strong>{current.activeCount}</strong><span>em movimento</span></article>
            <article><strong>{current.completedCount}</strong><span>concluídos</span></article>
          </div>

          {current.topAreas.length > 0 && (
            <div className="phase-areas">
              <small>O QUE MAIS APARECE</small>
              {current.topAreas.map((item) => <span key={item.area}>{item.area} · {item.count}</span>)}
            </div>
          )}
        </section>
      )}

      <section className="phase-history">
        <SectionTitle eyebrow="ARQUIVO DE FASES" title="Seus meses" />
        <div className="phase-grid">
          {snapshots.map((snapshot, index) => (
            <article key={snapshot.month} className={(index === 0 ? 'current ' : '') + 'phase-tone-' + (snapshot.phaseTone || 'cobalt')}>
              <div><Tag tone={index === 0 ? 'coral' : 'muted'}>{index === 0 ? 'ATUAL' : 'RETRATO'}</Tag><span>{snapshot.month}</span></div>
              <h3>{snapshot.label}</h3>
              <p>{snapshot.activeHighlights[0] || snapshot.preferenceHighlights[0] || 'Uma fase mais silenciosa no arquivo.'}</p>
              <div className="phase-mini">
                <span>{snapshot.activeCount} em movimento</span>
                <span>{snapshot.completedCount} concluídos</span>
              </div>
              {snapshot.bridgeSummaries.length > 0 && (
                <div className="phase-apps">
                  {snapshot.bridgeSummaries.map((item) => <small key={item.app}>{item.title}: {item.summary}</small>)}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
