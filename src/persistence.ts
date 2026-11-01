import type { DayData, Person, StoredSchedule, Time } from './types'
import { emptyDay, PEOPLE, TIMES } from './types'

const ENDPOINT = '/.netlify/functions/week'
const LS_KEY = 'escuelita-week'

const VALID_PEOPLE = new Set<string>(PEOPLE.map((p) => p.id))
const VALID_TIMES = new Set<string>(TIMES)

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

function sanitizeDays(rawDays: unknown): DayData[] | null {
  if (!Array.isArray(rawDays) || rawDays.length !== 5) return null
  return rawDays.map((d) => {
    if (!d || typeof d !== 'object') return emptyDay()
    const drop = (d as Record<string, unknown>).dropOff as Record<string, unknown> | undefined
    const pick = (d as Record<string, unknown>).pickUp as Record<string, unknown> | undefined
    const dropPerson = sanitizePerson(drop?.person)
    const dropTime = dropPerson ? sanitizeTime(drop?.time) : null
    const pickPerson = sanitizePerson(pick?.person)
    return {
      dropOff: { person: dropPerson, time: dropTime },
      pickUp: { person: pickPerson },
    }
  })
}

function normalize(raw: unknown, currentMondayKey: string): Record<string, DayData[]> | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as StoredSchedule
  if (obj.weeks && typeof obj.weeks === 'object') {
    const out: Record<string, DayData[]> = {}
    for (const [k, v] of Object.entries(obj.weeks)) {
      const clean = sanitizeDays(v)
      if (clean) out[k] = clean
    }
    return out
  }
  const single = sanitizeDays(obj.days)
  if (single) {
    return { [currentMondayKey]: single }
  }
  return null
}

export async function loadSchedule(
  currentMondayKey: string,
): Promise<Record<string, DayData[]> | null> {
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
  actor?: Person | null,
): Promise<void> {
  const payload = { weeks, actor: actor ?? null }
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

export async function resetSchedule(): Promise<void> {
  try {
    await fetch(ENDPOINT, { method: 'DELETE' })
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(LS_KEY)
  } catch {
    /* ignore */
  }
}
