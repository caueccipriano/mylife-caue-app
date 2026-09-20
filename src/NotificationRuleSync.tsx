import { useEffect, useRef } from 'react'
import { useMoodHistory, useRecords } from './appState'
import { evaluateEuNotifications } from './notificationRules'

export default function NotificationRuleSync() {
  const records = useRecords()
  const moods = useMoodHistory()
  const lastRunRef = useRef(0)

  useEffect(() => {
    const run = (force = false) => {
      const now = Date.now()
      if (!force && now - lastRunRef.current < 60000) return
      lastRunRef.current = now
      evaluateEuNotifications(records, moods, new Date(now))
    }

    run(true)

    const onVisible = () => {
      if (document.visibilityState === 'visible') run(true)
    }
    const onFocus = () => run()
    const timer = window.setInterval(() => run(), 15 * 60 * 1000)

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [records, moods])

  return null
}
