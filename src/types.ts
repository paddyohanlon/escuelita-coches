export type Person = 'Cris' | 'Fran' | 'Paddy' | 'Lidiya' | 'Jo'
export type CoupleGroup = 'CF' | 'LP'
export type Time = '08:30' | '08:35' | '08:40' | '08:45' | '08:50'

export interface DropOff {
  person: Person | null
  time: Time | null
}

export interface PickUp {
  person: Person | null
}

export interface DayData {
  dropOff: DropOff
  pickUp: PickUp
}

export interface WeekData {
  days: DayData[]
}

export interface StoredSchedule {
  /** Keyed by Monday ISO date (YYYY-MM-DD) for the 2 active weeks */
  weeks?: Record<string, DayData[]>
  /** Legacy single-week field kept for backward compatibility */
  days?: DayData[]
}

export const TIMES: Time[] = ['08:30', '08:35', '08:40', '08:45', '08:50']

export const PEOPLE: { id: Person; label: string; group: CoupleGroup }[] = [
  { id: 'Cris', label: 'Cris', group: 'CF' },
  { id: 'Fran', label: 'Fran', group: 'CF' },
  { id: 'Lidiya', label: 'Lidiya', group: 'LP' },
  { id: 'Paddy', label: 'Paddy', group: 'LP' },
  { id: 'Jo', label: 'Jo', group: 'LP' },
]

export const CF_DEFAULT_TIMES: Record<number, Time> = {
  0: '08:35', // Mon
  1: '08:35', // Tue
  2: '08:40', // Wed
  3: '08:35', // Thu
  4: '08:40', // Fri
}

export const LP_DEFAULT_TIME: Time = '08:40'

export function groupForPerson(person: Person): CoupleGroup {
  return person === 'Cris' || person === 'Fran' ? 'CF' : 'LP'
}

export function defaultTimeFor(person: Person, dayIndex: number): Time {
  return groupForPerson(person) === 'CF' ? CF_DEFAULT_TIMES[dayIndex] : LP_DEFAULT_TIME
}

export function emptyDay(): DayData {
  return { dropOff: { person: null, time: null }, pickUp: { person: null } }
}

export function emptyDays(): DayData[] {
  return Array.from({ length: 5 }, () => emptyDay())
}

export function emptyWeek(): WeekData {
  return { days: emptyDays() }
}
