import { NavLink } from 'react-router-dom'
import type { DailyRhythm } from './dailyRhythm'
import { EuIcon } from './v2Ui'

export default function DailyRhythmCard({ rhythm }: { rhythm: DailyRhythm }) {
  return (
    <section className={'daily-rhythm-v52 rhythm-' + rhythm.period}>
      <span className="daily-rhythm-icon-v52"><EuIcon name={rhythm.icon} /></span>
      <div>
        <small>{rhythm.eyebrow}</small>
        <strong>{rhythm.title}</strong>
        <p>{rhythm.detail}</p>
        <NavLink to={rhythm.actionTo}>{rhythm.actionLabel} <EuIcon name="arrow-up-right" /></NavLink>
      </div>
    </section>
  )
}
