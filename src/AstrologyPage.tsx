import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BrandTop, SectionTitle, Tag } from './v2Ui'
import { dailyAstrology, vedicNatal, westernNatal, zodiacPosition, type NatalPoint } from './astrology'

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
  const [now, setNow] = useState(() => new Date())
  const reading = useMemo(() => dailyAstrology(now), [now.toDateString()])

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
  const [mode, setMode] = useState<'western' | 'vedic'>('western')
  const [now, setNow] = useState(() => new Date())
  const reading = useMemo(() => dailyAstrology(now), [now.toDateString()])
  const currentPoints = mode === 'western' ? westernNatal : vedicNatal

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
            <p>{mode === 'western'
              ? 'Ascendente em Capricórnio, Sol em Virgem e Lua em Câncer. Casas pelo sistema Placidus.'
              : 'Ascendente em Sagitário/Mula, Lua em Câncer/Punarvasu e forte concentração na Casa 9. Casas por signo inteiro.'}</p>
          </div>
        </div>

        <div className="astro-chart-layout">
          <ChartWheel points={currentPoints} mode={mode} />
          <PointList points={currentPoints} />
        </div>
      </section>

      <section className="astro-interpretation">
        <SectionTitle eyebrow="RESUMO" title={mode === 'western' ? 'Como o ocidental te descreve' : 'Como o védico te descreve'} />
        {mode === 'western' ? (
          <div className="astro-summary-grid">
            <article><Tag tone="coral">ASCENDENTE</Tag><h3>Capricórnio</h3><p>Você tende a passar uma imagem mais séria, responsável e orientada a construir algo sólido.</p></article>
            <article><Tag tone="amber">SOL</Tag><h3>Virgem · Casa 9</h3><p>Identidade analítica, curiosa e focada em aprender, melhorar e entender como as coisas funcionam.</p></article>
            <article><Tag tone="pink">LUA</Tag><h3>Câncer · Casa 7</h3><p>Emocionalmente, vínculos, segurança e relações próximas pesam bastante no seu equilíbrio.</p></article>
          </div>
        ) : (
          <div className="astro-summary-grid">
            <article><Tag tone="green">LAGNA</Tag><h3>Sagitário · Mula</h3><p>Curiosidade, expansão e necessidade de chegar à raiz dos problemas antes de aceitar respostas prontas.</p></article>
            <article><Tag tone="pink">LUA</Tag><h3>Câncer · Punarvasu</h3><p>Sensibilidade profunda e uma capacidade recorrente de se reconstruir depois de fases intensas.</p></article>
            <article><Tag tone="amber">CASA 9</Tag><h3>Sol + Mercúrio + Vênus + Rahu</h3><p>Estudo, especialização, exterior, conhecimento e expansão aparecem como temas centrais da trajetória.</p></article>
          </div>
        )}
      </section>
    </div>
  )
}
