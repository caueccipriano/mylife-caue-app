export type AmbientPeriod = 'morning' | 'afternoon' | 'evening' | 'night'
export type AmbientPressure = 'quiet' | 'balanced' | 'loaded'

export type AmbientProfile = {
  period: AmbientPeriod
  label: string
  note: string
  themeColor: string
  pressure: AmbientPressure
}

export function ambientPeriodForHour(hour: number): AmbientPeriod {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 21) return 'evening'
  return 'night'
}

export function deriveAmbientProfile(date: Date, pressure: AmbientPressure): AmbientProfile {
  const period = ambientPeriodForHour(date.getHours())

  const base: Record<AmbientPeriod, Omit<AmbientProfile, 'period' | 'pressure'>> = {
    morning: {
      label: 'manhã clara',
      note: 'comece com pouco ruído',
      themeColor: '#EEF3FF',
    },
    afternoon: {
      label: 'tarde em foco',
      note: 'avance sem abrir dez frentes',
      themeColor: '#F5F6FA',
    },
    evening: {
      label: 'fim de tarde',
      note: 'feche o que merece fechar',
      themeColor: '#F1EDF8',
    },
    night: {
      label: 'modo noturno',
      note: 'menos estímulo, mais fechamento',
      themeColor: '#171B31',
    },
  }

  const pressureNote: Record<AmbientPressure, string> = {
    quiet: 'ritmo leve',
    balanced: 'ritmo estável',
    loaded: 'atenção protegida',
  }

  return {
    period,
    pressure,
    ...base[period],
    note: base[period].note + ' · ' + pressureNote[pressure],
  }
}
