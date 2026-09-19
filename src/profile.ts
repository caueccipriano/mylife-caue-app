export type ProfileNatalPoint = {
  name: string
  symbol: string
  longitude: number
  house?: number
  retrograde?: boolean
}

export type AstrologyProfile = {
  westernNatal: ProfileNatalPoint[]
  vedicNatal: ProfileNatalPoint[]
}

export type PersonalProfile = {
  displayName?: string
  astrology?: AstrologyProfile
}

const KEY = 'eu-personal-profile-v1'

export function getPersonalProfile(): PersonalProfile {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}') as PersonalProfile
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function mergePersonalProfile(patch: PersonalProfile) {
  const current = getPersonalProfile()
  const next: PersonalProfile = {
    ...current,
    ...patch,
    astrology: patch.astrology ?? current.astrology,
  }

  if (next.displayName) next.displayName = next.displayName.trim().slice(0, 80)
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('eu-profile-updated'))
  return next
}
