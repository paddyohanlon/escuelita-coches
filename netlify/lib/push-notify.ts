import { getStore } from '@netlify/blobs'
import webpush, { type PushSubscription } from 'web-push'

export const STORE_NAME = 'escuelita'
export const SUBS_KEY = 'push-subs'

export type Person = 'Cris' | 'Fran' | 'Paddy' | 'Lidiya' | 'Jo'
export const ALL_PEOPLE: Person[] = ['Cris', 'Fran', 'Lidiya', 'Paddy', 'Jo']

export type SubsByPerson = Partial<Record<Person, PushSubscription[]>>

export function configureVapid(): { ok: boolean; publicKey: string | null } {
  const publicKey = Netlify.env.get('VAPID_PUBLIC_KEY') ?? null
  const privateKey = Netlify.env.get('VAPID_PRIVATE_KEY') ?? null
  const subject = Netlify.env.get('VAPID_SUBJECT') ?? 'mailto:ohanlon.paddy@gmail.com'

  if (!publicKey || !privateKey) {
    return { ok: false, publicKey }
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  return { ok: true, publicKey }
}

export async function loadSubscriptions(): Promise<SubsByPerson> {
  const store = getStore(STORE_NAME)
  try {
    const data = await store.get(SUBS_KEY, { type: 'json' })
    if (data && typeof data === 'object') {
      return data as SubsByPerson
    }
  } catch {
    /* ignore */
  }
  return {}
}

export async function saveSubscriptions(subs: SubsByPerson): Promise<void> {
  const store = getStore(STORE_NAME)
  await store.setJSON(SUBS_KEY, subs)
}

export async function sendPushToPeople(
  recipients: Person[],
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  const { ok } = configureVapid()
  if (!ok || recipients.length === 0) return

  const subs = await loadSubscriptions()
  let dirty = false
  const bodyStr = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
  })

  await Promise.all(
    recipients.map(async (person) => {
      const list = subs[person] ?? []
      if (list.length === 0) return
      const keep: PushSubscription[] = []

      await Promise.all(
        list.map(async (sub) => {
          try {
            await webpush.sendNotification(sub, bodyStr)
            keep.push(sub)
          } catch (err: unknown) {
            const status = (err as { statusCode?: number })?.statusCode
            if (status === 404 || status === 410) {
              dirty = true
            } else {
              keep.push(sub)
            }
          }
        }),
      )

      if (keep.length !== list.length) {
        subs[person] = keep
      }
    }),
  )

  if (dirty) {
    await saveSubscriptions(subs)
  }
}
