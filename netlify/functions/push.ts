import type { Context } from '@netlify/functions'
import type { PushSubscription } from 'web-push'
import {
  ALL_PEOPLE,
  configureVapid,
  loadSubscriptions,
  saveSubscriptions,
  sendPushToPeople,
  type Person,
} from '../lib/push-notify'

function isValidPerson(val: unknown): val is Person {
  return typeof val === 'string' && (ALL_PEOPLE as string[]).includes(val)
}

export default async (req: Request, _context: Context): Promise<Response> => {
  const { publicKey } = configureVapid()

  if (req.method === 'GET') {
    return Response.json({ publicKey })
  }

  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as {
        person?: unknown
        subscription?: PushSubscription
      }
      if (!isValidPerson(body.person) || !body.subscription?.endpoint) {
        return new Response('Bad request', { status: 400 })
      }
      const person = body.person
      const sub = body.subscription

      const subs = await loadSubscriptions()
      // Remove this endpoint from any other person on the same device
      for (const p of ALL_PEOPLE) {
        subs[p] = (subs[p] ?? []).filter((s) => s.endpoint !== sub.endpoint)
      }
      subs[person] = [...(subs[person] ?? []), sub]
      await saveSubscriptions(subs)

      await sendPushToPeople([person], {
        title: 'Escuelita Coches',
        body: `Avisos activados para ${person} 🔔`,
      })

      return Response.json({ ok: true })
    } catch {
      return new Response('Bad request', { status: 400 })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const body = (await req.json()) as { endpoint?: string }
      if (!body.endpoint) {
        return new Response('Bad request', { status: 400 })
      }
      const subs = await loadSubscriptions()
      for (const p of ALL_PEOPLE) {
        subs[p] = (subs[p] ?? []).filter((s) => s.endpoint !== body.endpoint)
      }
      await saveSubscriptions(subs)
      return Response.json({ ok: true })
    } catch {
      return new Response('Bad request', { status: 400 })
    }
  }

  return new Response('Method not allowed', { status: 405 })
}
