import { useEffect, useState } from 'react'
import { forceRefreshAppBridges, readAppBridges, type BridgeCard } from './integrations'
import { listChatInbox, type ChatInboxBatch } from './chatInbox'
import { listRecords, moodForToday, type MoodCheckin, type StoredRecord } from './storage'
import { getPersonalProfile, type PersonalProfile } from './profile'

export function useRecords() {
  const [records, setRecords] = useState<StoredRecord[]>([])

  useEffect(() => {
    const refresh = () => void listRecords().then(setRecords)
    refresh()
    window.addEventListener('eu-record-saved', refresh)
    window.addEventListener('eu-records-restored', refresh)
    return () => {
      window.removeEventListener('eu-record-saved', refresh)
      window.removeEventListener('eu-records-restored', refresh)
    }
  }, [])

  return records
}

export function useMood() {
  const [mood, setMood] = useState<MoodCheckin | null>(() => moodForToday())

  useEffect(() => {
    const refresh = () => setMood(moodForToday())
    window.addEventListener('eu-mood-updated', refresh)
    return () => window.removeEventListener('eu-mood-updated', refresh)
  }, [])

  return mood
}

export function useBridges() {
  const [bridges, setBridges] = useState<BridgeCard[]>(() => readAppBridges())
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const refresh = () => setBridges(readAppBridges())
    const visible = () => !document.hidden && refresh()

    refresh()

    const current = readAppBridges()
    const needsRefresh = current.some((card) => !card.bridge?.summary || card.stale)
    const lastAutoRefresh = Number(sessionStorage.getItem('eu-bridge-auto-refresh-at') || 0)
    if (needsRefresh && Date.now() - lastAutoRefresh > 60000) {
      sessionStorage.setItem('eu-bridge-auto-refresh-at', String(Date.now()))
      setRefreshing(true)
      void forceRefreshAppBridges()
        .then(setBridges)
        .finally(() => setRefreshing(false))
    }

    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    document.addEventListener('visibilitychange', visible)
    const timer = window.setInterval(refresh, 15000)

    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
      document.removeEventListener('visibilitychange', visible)
      window.clearInterval(timer)
    }
  }, [])

  async function forceRefresh() {
    if (refreshing) return
    setRefreshing(true)
    try {
      setBridges(await forceRefreshAppBridges())
    } finally {
      setRefreshing(false)
    }
  }

  return { bridges, refreshing, forceRefresh }
}


export function useChatInbox() {
  const [batches, setBatches] = useState<ChatInboxBatch[]>(() => listChatInbox())

  useEffect(() => {
    const refresh = () => setBatches(listChatInbox())
    window.addEventListener('eu-chat-inbox-updated', refresh)
    return () => window.removeEventListener('eu-chat-inbox-updated', refresh)
  }, [])

  return batches
}


export function usePersonalProfile() {
  const [profile, setProfile] = useState<PersonalProfile>(() => getPersonalProfile())

  useEffect(() => {
    const refresh = () => setProfile(getPersonalProfile())
    window.addEventListener('eu-profile-updated', refresh)
    return () => window.removeEventListener('eu-profile-updated', refresh)
  }, [])

  return profile
}
