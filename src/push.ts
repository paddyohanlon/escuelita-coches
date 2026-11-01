import type { Person } from './types'

const PUSH_ENDPOINT = '/.netlify/functions/push'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    return await reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

export async function subscribePersonToPush(person: Person): Promise<{
  ok: boolean
  reason?: string
}> {
  if (!isPushSupported()) {
    return {
      ok: false,
      reason: 'Este navegador no soporta notificaciones (en iPhone abre desde la pantalla de inicio con Safari).',
    }
  }

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') {
    return {
      ok: false,
      reason: 'Permiso de notificaciones denegado en el navegador.',
    }
  }

  try {
    const keyRes = await fetch(PUSH_ENDPOINT)
    if (!keyRes.ok) throw new Error('No se pudo obtener la clave VAPID')
    const { publicKey } = (await keyRes.json()) as { publicKey?: string }
    if (!publicKey) throw new Error('Falta clave VAPID en el servidor')

    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      const appServerKey = urlBase64ToUint8Array(publicKey)
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      })
    }

    const saveRes = await fetch(PUSH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person, subscription: sub.toJSON() }),
    })
    if (!saveRes.ok) throw new Error('Error guardando suscripción')

    return { ok: true }
  } catch (err: unknown) {
    return {
      ok: false,
      reason: (err as Error)?.message || 'No se pudieron activar los avisos.',
    }
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      await fetch(PUSH_ENDPOINT, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
    }
  } catch {
    /* ignore */
  }
}
