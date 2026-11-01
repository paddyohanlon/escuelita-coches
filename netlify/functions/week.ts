import type { Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import {
  ALL_PEOPLE,
  sendPushToPeople,
  STORE_NAME,
  type Person,
} from '../lib/push-notify'

const KEY = 'week'
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']

interface DaySlotData {
  dropOff?: { person?: Person | null; time?: string | null }
  pickUp?: { person?: Person | null }
}

interface StoredPayload {
  weeks?: Record<string, DaySlotData[]>
}

function formatDayName(mondayIso: string, dayIndex: number): string {
  const parts = mondayIso.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) {
    return DAY_NAMES[dayIndex] ?? ''
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2] + dayIndex)
  const dateStr = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
  }).format(d)
  return `${DAY_NAMES[dayIndex]} ${dateStr}`
}

async function notifyDiffs(
  prevWeeks: Record<string, DaySlotData[]> | undefined,
  nextWeeks: Record<string, DaySlotData[]> | undefined,
  actor: Person | null,
): Promise<void> {
  if (!prevWeeks || !nextWeeks) return

  const actorLabel = actor ?? 'Alguien'

  for (const [weekKey, nextDays] of Object.entries(nextWeeks)) {
    const prevDays = prevWeeks[weekKey]
    if (!Array.isArray(nextDays) || !Array.isArray(prevDays)) continue

    for (let i = 0; i < Math.min(nextDays.length, prevDays.length); i++) {
      const prev = prevDays[i] ?? {}
      const next = nextDays[i] ?? {}
      const dayStr = formatDayName(weekKey, i)

      // Check morning drop-off
      const prevDropP = prev.dropOff?.person ?? null
      const nextDropP = next.dropOff?.person ?? null
      const prevDropT = prev.dropOff?.time ?? null
      const nextDropT = next.dropOff?.time ?? null

      if (prevDropP !== nextDropP || prevDropT !== nextDropT) {
        const affected = new Set<Person>()
        if (prevDropP && prevDropP !== actor) affected.add(prevDropP)
        if (nextDropP && nextDropP !== actor) affected.add(nextDropP)
        if (affected.size === 0) {
          for (const p of ALL_PEOPLE) {
            if (p !== actor) affected.add(p)
          }
        }

        const summary = nextDropP
          ? `${dayStr} · Llevar al cole → ${nextDropP} (${nextDropT ?? ''})`
          : `${dayStr} · Llevar al cole → sin asignar`

        await sendPushToPeople([...affected], {
          title: `Cambio de ${actorLabel}`,
          body: summary,
        })
      }

      // Check afternoon pick-up
      const prevPickP = prev.pickUp?.person ?? null
      const nextPickP = next.pickUp?.person ?? null

      if (prevPickP !== nextPickP) {
        const affected = new Set<Person>()
        if (prevPickP && prevPickP !== actor) affected.add(prevPickP)
        if (nextPickP && nextPickP !== actor) affected.add(nextPickP)
        if (affected.size === 0) {
          for (const p of ALL_PEOPLE) {
            if (p !== actor) affected.add(p)
          }
        }

        const summary = nextPickP
          ? `${dayStr} · Recoger del cole → ${nextPickP}`
          : `${dayStr} · Recoger del cole → sin asignar`

        await sendPushToPeople([...affected], {
          title: `Cambio de ${actorLabel}`,
          body: summary,
        })
      }
    }
  }
}

export default async (req: Request, _context: Context): Promise<Response> => {
  const store = getStore(STORE_NAME)

  if (req.method === 'GET') {
    try {
      const data = await store.get(KEY, { type: 'json' })
      return Response.json(data ?? null)
    } catch {
      return Response.json(null)
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const body = (await req.json()) as StoredPayload & { actor?: Person | null }
      let prev: StoredPayload | null = null
      try {
        prev = (await store.get(KEY, { type: 'json' })) as StoredPayload | null
      } catch {
        prev = null
      }

      await store.setJSON(KEY, { weeks: body.weeks })

      await notifyDiffs(prev?.weeks, body.weeks, body.actor ?? null)

      return Response.json({ ok: true })
    } catch {
      return new Response('Bad request', { status: 400 })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await store.delete(KEY)
      return Response.json({ ok: true })
    } catch {
      return new Response('Error', { status: 500 })
    }
  }

  return new Response('Method not allowed', { status: 405 })
}
