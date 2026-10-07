import { NavLink } from 'react-router-dom'
import { EuIcon, type EuIconName } from './v2Ui'

export default function SmartEmptyState({
  title,
  detail,
  actionLabel,
  actionTo,
  icon = 'sparkles',
  quiet = false,
}: {
  title: string
  detail?: string
  actionLabel?: string
  actionTo?: string
  icon?: EuIconName
  quiet?: boolean
}) {
  return (
    <div className={'smart-empty-v46' + (quiet ? ' is-quiet' : '')}>
      <span><EuIcon name={icon} /></span>
      <div>
        <strong>{title}</strong>
        {detail && <p>{detail}</p>}
        {actionLabel && actionTo && <NavLink to={actionTo}>{actionLabel} <EuIcon name="arrow-up-right" /></NavLink>}
      </div>
    </div>
  )
}
