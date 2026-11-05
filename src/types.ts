export type Person = 'Cris' | 'Fran' | 'Paddy' | 'Lidiya' | 'Jo' | 'Cuke'
export type CoupleGroup = 'CF' | 'LP'
export type Time = '08:30' | '08:35' | '08:40' | '08:45' | '08:50'

export type SlotRuleState = 'available' | 'unavailable' | 'default'

export interface DropOffRule {
  state: SlotRuleState
  time?: Time | null
}

export interface PickUpRule {
  state: SlotRuleState
}

export interface PersonDaySetting {
  dropOff: DropOffRule
  pickUp: PickUpRule
}

export type UserSettingsMap = Partial<Record<Person, PersonDaySetting[]>>

export interface DropOff {
  person: Person | null
  time: Time | null
  overridden?: boolean
}

export interface PickUp {
  person: Person | null
  overridden?: boolean
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
  /** Per-user availability & default rules (Mon-Fri) */
  settings?: UserSettingsMap
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
  { id: 'Cuke', label: 'Cuke', group: 'LP' },
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
  return {
    dropOff: { person: null, time: null, overridden: false },
    pickUp: { person: null, overridden: false },
  }
}

export function emptyDays(): DayData[] {
  return Array.from({ length: 5 }, () => emptyDay())
}

export function emptyWeek(): WeekData {
  return { days: emptyDays() }
}

export function emptyPersonSettings(person: Person): PersonDaySetting[] {
  return Array.from({ length: 5 }, (_, i) => ({
    dropOff: { state: 'available', time: defaultTimeFor(person, i) },
    pickUp: { state: 'available' },
  }))
}

export function isPersonUnavailable(
  settings: UserSettingsMap,
  person: Person,
  dayIndex: number,
  slot: 'dropOff' | 'pickUp',
): boolean {
  return settings[person]?.[dayIndex]?.[slot]?.state === 'unavailable'
}

export function getDefaultDropOff(
  settings: UserSettingsMap,
  dayIndex: number,
): { person: Person; time: Time } | null {
  for (const p of PEOPLE) {
    const rule = settings[p.id]?.[dayIndex]?.dropOff
    if (rule?.state === 'default') {
      return {
        person: p.id,
        time: rule.time ?? defaultTimeFor(p.id, dayIndex),
      }
    }
  }
  return null
}

export function getDefaultPickUp(
  settings: UserSettingsMap,
  dayIndex: number,
): Person | null {
  for (const p of PEOPLE) {
    const rule = settings[p.id]?.[dayIndex]?.pickUp
    if (rule?.state === 'default') {
      return p.id
    }
  }
  return null
}

export function applyDefaultsToDays(
  days: DayData[],
  settings: UserSettingsMap,
): DayData[] {
  return days.map((d, i) => {
    const defDrop = getDefaultDropOff(settings, i)
    const defPick = getDefaultPickUp(settings, i)

    const dropOff: DropOff = d.dropOff.overridden
      ? { ...d.dropOff }
      : {
          person: defDrop ? defDrop.person : null,
          time: defDrop ? defDrop.time : null,
          overridden: false,
        }

    const pickUp: PickUp = d.pickUp.overridden
      ? { ...d.pickUp }
      : {
          person: defPick ?? null,
          overridden: false,
        }

    return { dropOff, pickUp }
  })
}

export function defaultDaysFromSettings(settings: UserSettingsMap): DayData[] {
  return applyDefaultsToDays(emptyDays(), settings)
}
