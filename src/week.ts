const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']

export interface DayMeta {
  name: string
  date: string
  isToday: boolean
  isPast: boolean
  isCurrent: boolean
  currentBadge: string | null
}

export function getWeekMonday(d: Date = new Date()): Date {
  const date = new Date(d)
  const day = date.getDay() // 0 Sun
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function mondayKey(monday: Date): string {
  const y = monday.getFullYear()
  const m = String(monday.getMonth() + 1).padStart(2, '0')
  const d = String(monday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export function monthLabel(monday: Date): string {
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const fmt = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
  if (monday.getMonth() === friday.getMonth()) {
    return fmt.format(monday)
  }
  const fmtM = new Intl.DateTimeFormat('es-ES', { month: 'long' })
  return `${fmtM.format(monday)} – ${fmt.format(friday)}`
}

export function dayLabel(monday: Date, i: number, now: Date = new Date()): DayMeta {
  const d = new Date(monday)
  d.setDate(monday.getDate() + i)
  d.setHours(0, 0, 0, 0)

  // Pick-up is done at 15:00 local time on that school day
  const cutoff = new Date(d)
  cutoff.setHours(15, 0, 0, 0)

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const isSameDay = d.getTime() === today.getTime()
  const isPast = now.getTime() >= cutoff.getTime()

  const date = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(d)
  return {
    name: DAY_NAMES[i],
    date,
    isToday: isSameDay && !isPast,
    isPast,
    isCurrent: false,
    currentBadge: null,
  }
}

export const DAY_NAMES_EXPORT = DAY_NAMES
