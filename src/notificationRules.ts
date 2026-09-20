import type { MoodCheckin, StoredRecord } from './storage'
import { isRecordVisibleForInsights } from './storage'
import {
  canCreateNotification,
  saveEuNotification,
  type EuNotificationCategory,
  type EuNotificationPriority,
} from './notifications'
import { deriveWeeklyDigest } from './uxFeatures'

function add(input: {
  title: string
  body: string
  category: EuNotificationCategory
  priority: EuNotificationPriority
  actionUrl?: string
  sourceId?: string
  dedupeKey: string
}) {
  if (!canCreateNotification(input.category, input.priority)) return null
  return saveEuNotification(input)
}

function localDay(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function weekKey(date = new Date()) {
  const value = new Date(date)
  value.setHours(12, 0, 0, 0)
  const day = (value.getDay() + 6) % 7
  value.setDate(value.getDate() - day)
  return localDay(value)
}

function monthKey(date = new Date()) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
}

export function evaluateEuNotifications(records: StoredRecord[], moods: MoodCheckin[], now = new Date()) {
  const visible = records.filter(isRecordVisibleForInsights)
  const created = []
  const today = localDay(now)

  // Essential: explicit follow-ups that are already due.
  const dueFollowups = visible
    .filter((record) => record.status === 'active' && record.followUpAt && new Date(record.followUpAt).getTime() <= now.getTime())
    .sort((a, b) => String(a.followUpAt).localeCompare(String(b.followUpAt)))
    .slice(0, 3)

  for (const record of dueFollowups) {
    const item = add({
      title: 'Isso voltou pra você.',
      body: record.nextMove || record.text,
      category: 'followup',
      priority: 'essential',
      actionUrl: '/registro/' + record.id,
      sourceId: record.id,
      dedupeKey: 'followup:' + record.id + ':' + String(record.followUpAt).slice(0, 10),
    })
    if (item) created.push(item)
  }

  // Essential: time capsules ready to open.
  const readyCapsules = visible
    .filter((record) => record.revealAt && !record.capsuleOpenedAt && new Date(record.revealAt).getTime() <= now.getTime())
    .slice(0, 3)

  for (const record of readyCapsules) {
    const item = add({
      title: 'Uma cápsula chegou até você.',
      body: 'Tem uma mensagem do seu EU de antes pronta para abrir.',
      category: 'capsule',
      priority: 'essential',
      actionUrl: '/registro/' + record.id,
      sourceId: record.id,
      dedupeKey: 'capsule:' + record.id,
    })
    if (item) created.push(item)
  }

  // Useful: ask for mood only in the evening and only when missing.
  const hasMoodToday = moods.some((item) => item.date === today)
  if (!hasMoodToday && now.getHours() >= 18) {
    const item = add({
      title: 'Como tá seu humor hoje?',
      body: 'Um toque basta. O heatmap fica mais interessante quando os dias vão ganhando cor.',
      category: 'humor',
      priority: 'useful',
      actionUrl: '/',
      dedupeKey: 'mood:' + today,
    })
    if (item) created.push(item)
  }

  // Useful: revisit older decisions with no outcome.
  const reviewableDecision = visible
    .filter((record) =>
      record.type === 'Decisão'
      && (!record.outcome || record.outcome === 'unknown')
      && new Date(record.createdAt).getTime() <= now.getTime() - 14 * 86400000,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

  if (reviewableDecision) {
    const ageBucket = Math.floor((now.getTime() - new Date(reviewableDecision.createdAt).getTime()) / (14 * 86400000))
    const item = add({
      title: 'E aquela decisão?',
      body: 'Agora que passou um tempo: ' + reviewableDecision.text,
      category: 'decision',
      priority: 'useful',
      actionUrl: '/registro/' + reviewableDecision.id,
      sourceId: reviewableDecision.id,
      dedupeKey: 'decision:' + reviewableDecision.id + ':' + ageBucket,
    })
    if (item) created.push(item)
  }

  // Weekly recap: Sunday evening or Monday, one per week.
  if ((now.getDay() === 0 && now.getHours() >= 17) || now.getDay() === 1) {
    const digest = deriveWeeklyDigest(visible, moods)
    if (digest.records || digest.completed || digest.mood) {
      const item = add({
        title: 'Seu EU fechou a semana.',
        body: digest.text,
        category: 'weekly',
        priority: 'useful',
        actionUrl: '/?view=signals',
        dedupeKey: 'weekly:' + weekKey(now),
      })
      if (item) created.push(item)
    }
  }

  // Monthly recap: first three days, summarizing the previous month.
  if (now.getDate() <= 3) {
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 12)
    const key = monthKey(previousMonth)
    const previousRecords = visible.filter((record) => record.createdAt.slice(0, 7) === key)
    if (previousRecords.length) {
      const topAreas = new Map<string, number>()
      previousRecords.forEach((record) => topAreas.set(record.area, (topAreas.get(record.area) || 0) + 1))
      const topArea = [...topAreas.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
      const item = add({
        title: 'Seu mês está pronto.',
        body: previousRecords.length + ' registros' + (topArea ? ' · ' + topArea + ' apareceu mais.' : '.'),
        category: 'monthly',
        priority: 'useful',
        actionUrl: '/vida/fases',
        dedupeKey: 'monthly:' + key,
      })
      if (item) created.push(item)
    }
  }

  // Silent insight: an active item untouched for 30+ days.
  const stale = visible
    .filter((record) =>
      record.status === 'active'
      && !record.followUpAt
      && new Date(record.updatedAt || record.createdAt).getTime() <= now.getTime() - 30 * 86400000,
    )
    .sort((a, b) => String(a.updatedAt || a.createdAt).localeCompare(String(b.updatedAt || b.createdAt)))[0]

  if (stale) {
    const monthBucket = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    const item = add({
      title: 'Isso ainda importa?',
      body: stale.text,
      category: 'insight',
      priority: 'silent',
      actionUrl: '/registro/' + stale.id,
      sourceId: stale.id,
      dedupeKey: 'stale:' + stale.id + ':' + monthBucket,
    })
    if (item) created.push(item)
  }

  return created
}
