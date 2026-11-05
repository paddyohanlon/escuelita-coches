import type {
  DayData,
  Person,
  PersonDaySetting,
  SlotRuleState,
  StoredSchedule,
  Time,
  UserSettingsMap,
} from './types'
import { defaultTimeFor, emptyDay, emptyPersonSettings, PEOPLE, TIMES } from './types'

const ENDPOINT = '/.netlify/functions/week'
const LS_KEY = 'escuelita-week'

const VALID_PEOPLE = new Set<string>(PEOPLE.map((p) => p.id))
const VALID_TIMES = new Set<string>(TIMES)
const VALID_STATES = new Set<string>(['available', 'unavailable', 'default'])

function sanitizePerson(val: unknown): Person | null {
  if (typeof val === 'string' && VALID_PEOPLE.has(val)) {
    return val as Person
  }
  return null
}

function sanitizeTime(val: unknown): Time | null {
  if (typeof val === 'string' && VALID_TIMES.has(val)) {
    return val as Time
  }
  return null
}

function sanitizeState(val: unknown): SlotRuleState {
  if (typeof val === 'string' && VALID_STATES.has(val)) {
    return val as SlotRuleState
  }
  return 'available'
}

function sanitizeDays(rawDays: unknown): DayData[] | null {
  if (!Array.isArray(rawDays) || rawDays.length !== 5) return null
  return rawDays.map((d) => {
    if (!d || typeof d !== 'object') return emptyDay()
    const drop = (d as Record<string, unknown>).dropOff as Record<string, unknown> | undefined
    const pick = (d as Record<string, unknown>).pickUp as Record<string, unknown> | undefined
    const dropPerson = sanitizePerson(drop?.person)
    const dropTime = dropPerson ? sanitizeTime(drop?.time) : null
    const dropOverridden =
      typeof drop?.overridden === 'boolean' ? drop.overridden : dropPerson !== null
    const pickPerson = sanitizePerson(pick?.person)
    const pickOverridden =
      typeof pick?.overridden === 'boolean' ? pick.overridden : pickPerson !== null
    return {
      dropOff: { person: dropPerson, time: dropTime, overridden: dropOverridden },
      pickUp: { person: pickPerson, overridden: pickOverridden },
    }
  })
}

function sanitizePersonDays(person: Person, raw: unknown): PersonDaySetting[] {
  if (!Array.isArray(raw) || raw.length !== 5) {
    return emptyPersonSettings(person)
  }
  return raw.map((d, i) => {
    if (!d || typeof d !== 'object') {
      return {
        dropOff: { state: 'available', time: defaultTimeFor(person, i) },
        pickUp: { state: 'available' },
      }
    }
    const drop = (d as Record<string, unknown>).dropOff as Record<string, unknown> | undefined
    const pick = (d as Record<string, unknown>).pickUp as Record<string, unknown> | undefined
    const dropState = sanitizeState(drop?.state)
    const dropTime = sanitizeTime(drop?.time) ?? defaultTimeFor(person, i)
    const pickState = sanitizeState(pick?.state)
    return {
      dropOff: { state: dropState, time: dropTime },
      pickUp: { state: pickState },
    }
  })
}

function sanitizeSettings(raw: unknown): UserSettingsMap {
  const out: UserSettingsMap = {}
  if (!raw || typeof raw !== 'object') return out
  const obj = raw as Record<string, unknown>
  for (const p of PEOPLE) {
    if (obj[p.id]) {
      out[p.id] = sanitizePersonDays(p.id, obj[p.id])
    }
  }
  return out
}

export interface LoadedScheduleData {
  weeks: Record<string, DayData[]>
  settings: UserSettingsMap
}

function normalize(raw: unknown, currentMondayKey: string): LoadedScheduleData | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as StoredSchedule
  const settings = sanitizeSettings(obj.settings)
  if (obj.weeks && typeof obj.weeks === 'object') {
    const out: Record<string, DayData[]> = {}
    for (const [k, v] of Object.entries(obj.weeks)) {
      const clean = sanitizeDays(v)
      if (clean) out[k] = clean
    }
    return { weeks: out, settings }
  }
  const single = sanitizeDays(obj.days)
  if (single) {
    return { weeks: { [currentMondayKey]: single }, settings }
  }
  if (obj.settings) {
    return { weeks: {}, settings }
  }
  return null
}

export async function loadSchedule(
  currentMondayKey: string,
): Promise<LoadedScheduleData | null> {
  try {
    const res = await fetch(ENDPOINT, { method: 'GET' })
    if (!res.ok) throw new Error('bad status')
    const data = await res.json()
    return normalize(data, currentMondayKey)
  } catch {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return null
      return normalize(JSON.parse(raw), currentMondayKey)
    } catch {
      return null
    }
  }
}

export async function saveSchedule(
  weeks: Record<string, DayData[]>,
  settings: UserSettingsMap,
  actor?: Person | null,
): Promise<void> {
  const payload = { weeks, settings, actor: actor ?? null }
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('bad status')
  } catch {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  }
}

export async function resetSchedule(settings?: UserSettingsMap): Promise<void> {
  try {
    await fetch(ENDPOINT, { method: 'DELETE' })
  } catch {
    /* ignore */
  }
  try {
    if (settings && Object.keys(settings).length > 0) {
      localStorage.setItem(LS_KEY, JSON.stringify({ weeks: {}, settings }))
    } else {
      localStorage.removeItem(LS_KEY)
    }
  } catch {
    /* ignore */
  }
}
