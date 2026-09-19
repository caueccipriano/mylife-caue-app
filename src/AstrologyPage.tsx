import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BrandTop, SectionTitle, Tag } from './v2Ui'
import { dailyAstrology, zodiacPosition, type NatalPoint } from './astrology'
import { usePersonalProfile } from './appState'

function ChartWheel({ points, mode }: { points: NatalPoint[]; mode: 'western' | 'vedic' }) {
  const signs = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓']
  const display = points.filter((point) => !['MC'].includes(point.name))

  return (
    <div className={'astro-wheel astro-wheel-' + mode} aria-label={'Mapa ' + (mode === 'western' ? 'ocidental' : 'védico')}>
      <div className="astro-wheel-ring" />
      <div className="astro-wheel-inner" />
      {signs.map((sign, index) => {
        const angle = index * 30 - 90 + 15
        const radius = 44
        const x = 50 + Math.cos(angle * Math.PI / 180) * radius
        const y = 50 + Math.sin(angle * Math.PI / 180) * radius
        return <span key={sign} className="astro-sign" style={{ left: x + '%', top: y + '%' }}>{sign}</span>
      })}
      {display.map((point, index) => {
        const angle = point.longitude - 90
        const radius = 31 - (index % 3) * 3.8
        const x = 50 + Math.cos(angle * Math.PI / 180) * radius
        const y = 50 + Math.sin(angle * Math.PI / 180) * radius
        return (
          <span
            key={point.name}
            className="astro-planet"
            style={{ left: x + '%', top: y + '%' }}
            title={point.name + ' · ' + zodiacPosition(point.longitude).text}
          >
            {point.symbol}
          </span>
        )
      })}
      <div className="astro-wheel-center">
        <strong>{mode === 'western' ? 'TROPICAL' : 'SIDERAL'}</strong>
        <small>{mode === 'western' ? 'ocidental' : 'Lahiri'}</small>
      </div>
    </div>
  )
}

function PointList({ points }: { points: NatalPoint[] }) {
  return (
    <div className="astro-point-list">
      {points.map((point) => {
        const position = zodiacPosition(point.longitude)
        return (
          <article key={point.name}>
            <span className="astro-point-symbol">{point.symbol}</span>
            <div>
              <strong>{point.name}</strong>
              <small>{position.symbol} {position.text}{point.retrograde ? ' · R' : ''}</small>
            </div>
            {point.house && <b>Casa {point.house}</b>}
          </article>
        )
      })}
    </div>
  )
}

export function AstroTodayPreview() {
  const profile = usePersonalProfile()
  const [now, setNow] = useState(() => new Date())
  const westernNatal = profile.astrology?.westernNatal ?? []
  const reading = useMemo(() => dailyAstrology(now, westernNatal), [now.toDateString(), westernNatal])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <section className="astro-preview" aria-label="Astrologia de hoje">
      <div>
        <Tag tone="amber">ASTRO DE HOJE</Tag>
        <h2>{reading.headline}</h2>
        <p>{reading.summary}</p>
      </div>
      <NavLink to="/vida/astrologia">ver céu de hoje ↗</NavLink>
    </section>
  )
}

export default function AstrologyPage() {
  const profile = usePersonalProfile()
  const [mode, setMode] = useState<'western' | 'vedic'>('western')
  const [now, setNow] = useState(() => new Date())
  const westernNatal = profile.astrology?.westernNatal ?? []
  const vedicNatal = profile.astrology?.vedicNatal ?? []
  const reading = useMemo(() => dailyAstrology(now, westernNatal), [now.toDateString(), westernNatal])
  const currentPoints = mode === 'western' ? westernNatal : vedicNatal
  const hasNatal = currentPoints.length > 0

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="v2-page astrology-page">
      <BrandTop />
      <NavLink className="back-v2" to="/vida">← Vida</NavLink>

      <header className="astro-hero">
        <Tag tone="amber">ASTROLOGIA</Tag>
        <h1>Dois mapas.<br />Um céu que muda.</h1>
        <p>Seu mapa ocidental tropical, seu mapa védico sideral e uma leitura diária calculada a partir dos trânsitos do dia.</p>
      </header>

      <section className="astro-daily-card">
        <div className="astro-daily-top">
          <div>
            <span>{reading.dayLabel}</span>
            <h2>{reading.headline}</h2>
          </div>
          <Tag tone="green">ATUALIZA SOZINHO</Tag>
        </div>
        <p>{reading.summary}</p>
        <div className="astro-signal-grid">
          {reading.signals.map((signal) => (
            <article key={signal.id} className={'astro-signal astro-' + signal.tone}>
              <Tag tone={signal.tone}>{signal.title}</Tag>
              <p>{signal.detail}</p>
            </article>
          ))}
        </div>
        <small className="astro-note">Leitura simbólica baseada em trânsitos astrológicos; use como reflexão, não como previsão garantida.</small>
      </section>

      <section className="astro-current-sky">
        <SectionTitle eyebrow="CÉU DE HOJE" title="Onde os planetas estão" />
        <div className="astro-transit-strip">
          {reading.transits.slice(0, 7).map((transit) => {
            const tropical = zodiacPosition(transit.longitude)
            const sidereal = zodiacPosition(transit.siderealLongitude)
            return (
              <article key={transit.name}>
                <span>{transit.symbol}</span>
                <strong>{transit.name}</strong>
                <p>{tropical.symbol} {tropical.sign} {tropical.degree}°</p>
                <small>védico: {sidereal.symbol} {sidereal.sign} {sidereal.degree}°</small>
              </article>
            )
          })}
        </div>
      </section>

      <section className="astro-map-section">
        <div className="astro-mode-switch" role="tablist" aria-label="Escolher mapa">
          <button className={mode === 'western' ? 'active' : ''} onClick={() => setMode('western')}>Ocidental</button>
          <button className={mode === 'vedic' ? 'active' : ''} onClick={() => setMode('vedic')}>Védico</button>
        </div>

        <div className="astro-map-head">
          <div>
            <Tag tone={mode === 'western' ? 'coral' : 'green'}>{mode === 'western' ? 'MAPA TROPICAL' : 'MAPA VÉDICO · LAHIRI'}</Tag>
            <h2>{mode === 'western' ? 'Seu mapa ocidental' : 'Seu mapa védico'}</h2>
            <p>{hasNatal
              ? 'Seu mapa pessoal fica salvo apenas no perfil local deste aparelho; o código público não contém seus pontos natais.'
              : 'Seu mapa pessoal ainda não foi importado neste aparelho. O céu do dia continua funcionando sem ele.'}</p>
          </div>
        </div>

        {hasNatal ? (
          <div className="astro-chart-layout">
            <ChartWheel points={currentPoints} mode={mode} />
            <PointList points={currentPoints} />
          </div>
        ) : (
          <div className="soft-empty wide">
            <span>☼</span>
            <p>Importe seu perfil privado para ver o mapa natal completo sem publicar seus dados no GitHub.</p>
          </div>
        )}
      </section>

      {hasNatal && (
        <section className="astro-interpretation">
          <SectionTitle eyebrow="RESUMO" title={mode === 'western' ? 'Três pontos do mapa ocidental' : 'Três pontos do mapa védico'} />
          <div className="astro-summary-grid">
            {['Ascendente', 'Sol', 'Lua'].map((name, index) => {
              const point = currentPoints.find((item) => item.name === name)
              if (!point) return null
              const position = zodiacPosition(point.longitude)
              return (
                <article key={name}>
                  <Tag tone={index === 0 ? (mode === 'western' ? 'coral' : 'green') : index === 1 ? 'amber' : 'pink'}>{name.toUpperCase()}</Tag>
                  <h3>{position.sign}{point.house ? ' · Casa ' + point.house : ''}</h3>
                  <p>{mode === 'western' ? 'Posição tropical' : 'Posição sideral'} preservada no seu perfil local.</p>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
