<template>
  <div class="app">
    <header class="hero">
      <div class="hero__inner">
        <div class="brand">
          <span class="brand__dot"></span>
          <h1>Escuelita Coches</h1>
        </div>
        <p class="subtitle">
          Horario del cole · Semanas {{ weeksMeta[0].weekNumber }} y {{ weeksMeta[1].weekNumber }}
        </p>
      </div>
      <div class="hero__actions">
        <span class="status" :class="statusClass">{{ statusText }}</span>
        <button type="button" class="btn btn--primary" @click="scrollToCurrentDay">
          Hoy
        </button>
        <button class="btn btn--ghost" @click="resetAll" :disabled="saving">
          Reiniciar todo
        </button>
      </div>
    </header>

    <!-- Identity & Push Notifications Bar -->
    <section class="identity-bar">
      <div class="identity-bar__who">
        <span class="identity-label">Soy:</span>
        <div class="identity-pills">
          <button
            v-for="p in people"
            :key="p.id"
            type="button"
            class="chip"
            :class="{ 'chip--active': currentActor === p.id }"
            @click="selectActor(p.id)"
          >
            {{ p.label }}
          </button>
        </div>
      </div>

      <button
        type="button"
        class="btn btn--sm"
        :class="pushSubscribed ? 'btn--push-on' : 'btn--ghost'"
        :disabled="pushBusy"
        @click="togglePush"
      >
        <span v-if="pushBusy">Activando…</span>
        <span v-else-if="pushSubscribed">🔔 Avisos activos ({{ currentActor }})</span>
        <span v-else>🔕 Activar avisos</span>
      </button>
    </section>

    <main class="main">
      <section
        v-for="(w, wi) in weeksMeta"
        :key="w.key"
        class="week-section"
      >
        <div class="week-header">
          <div class="week-header__title">
            <span class="week-tag" :class="{ 'week-tag--next': wi === 1 }">
              {{ w.title }}
            </span>
            <h2 class="week-heading">Semana {{ w.weekNumber }} · {{ w.month }}</h2>
          </div>
          <button
            type="button"
            class="btn btn--ghost btn--sm"
            :disabled="saving"
            @click="resetOneWeek(w.key, w.title)"
          >
            Reiniciar semana
          </button>
        </div>

        <div class="week-grid">
          <article
            v-for="(day, i) in getWeekDays(w.key)"
            :key="i"
            :ref="(el) => setDayRef(el as HTMLElement | null, wi, i)"
            class="day-card"
            :class="{
              'day-card--today': w.days[i].isCurrent,
              'day-card--past': w.days[i].isPast,
              'day-card--collapsed': isDayCollapsed(wi, i),
            }"
          >
            <header
              class="day-card__header"
              :class="{ 'day-card__header--clickable': w.days[i].isPast }"
              @click="w.days[i].isPast && togglePastDay(wi, i)"
            >
              <div class="day-card__title">
                <span class="day-name">{{ w.days[i].name }}</span>
                <span class="day-date">{{ w.days[i].date }}</span>
              </div>
              <div class="day-card__meta">
                <span
                  v-if="isDayCollapsed(wi, i) && (day.dropOff.person || day.pickUp.person)"
                  class="past-summary"
                >
                  <span v-if="day.dropOff.person">
                    🚗 {{ day.dropOff.person }}<template v-if="day.dropOff.time"> {{ day.dropOff.time }}</template>
                  </span>
                  <span v-if="day.pickUp.person">
                    🏠 {{ day.pickUp.person }}
                  </span>
                </span>
                <span v-if="w.days[i].isCurrent" class="badge badge--today">
                  {{ w.days[i].currentBadge }}
                </span>
                <span v-else-if="w.days[i].isPast" class="badge badge--past">
                  Pasado {{ isDayCollapsed(wi, i) ? '▾' : '▴' }}
                </span>
              </div>
            </header>

            <template v-if="!isDayCollapsed(wi, i)">
              <!-- Row 1: Morning drop-off -->
              <div class="slot slot--drop">
                <div class="slot__label">
                  <span class="row-icon">🚗</span>
                  <span>Llevar al cole</span>
                </div>
                <div class="slot__controls">
                  <div class="people-grid">
                    <button
                      v-for="p in people"
                      :key="p.id"
                      type="button"
                      class="pill"
                      :class="{
                        'pill--active': day.dropOff.person === p.id,
                        'pill--cf': p.group === 'CF',
                        'pill--lp': p.group === 'LP',
                      }"
                      @click="selectDropPerson(w.key, i, p.id)"
                    >
                      {{ p.label }}
                    </button>
                  </div>
                  <div class="time-row" v-if="day.dropOff.person">
                    <label class="time-label">Hora</label>
                    <select
                      class="time-select"
                      :value="day.dropOff.time"
                      @change="onDropTimeChange(w.key, i, $event)"
                    >
                      <option v-for="t in times" :key="t" :value="t">{{ t }}</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Row 2: School pick-up -->
              <div class="slot slot--pickup">
                <div class="slot__label">
                  <span class="row-icon">🏠</span>
                  <span>Recoger del cole</span>
                </div>
                <div class="slot__controls">
                  <div class="people-grid">
                    <button
                      v-for="p in people"
                      :key="p.id"
                      type="button"
                      class="pill pill--pick"
                      :class="{
                        'pill--active': day.pickUp.person === p.id,
                        'pill--cf': p.group === 'CF',
                        'pill--lp': p.group === 'LP',
                      }"
                      @click="selectPickupPerson(w.key, i, p.id)"
                    >
                      {{ p.label }}
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </article>
        </div>
      </section>

      <footer class="foot">
        <span>Persistido 2 semanas · Netlify Blobs</span>
        <span class="sep">·</span>
        <span>Horas 08:30–08:50</span>
      </footer>
    </main>

    <!-- Confirmation modal -->
    <Transition name="fade">
      <div
        v-if="confirmModal"
        class="modal-backdrop"
        @click.self="closeConfirm(false)"
      >
        <div class="modal" role="dialog" aria-modal="true">
          <h3 class="modal__title">{{ confirmModal.title }}</h3>
          <p class="modal__body">{{ confirmModal.message }}</p>
          <div class="modal__actions">
            <button
              type="button"
              class="btn btn--ghost"
              @click="closeConfirm(false)"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="btn btn--primary"
              @click="closeConfirm(true)"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Saved notice toast -->
    <Transition name="toast">
      <div
        v-if="toastMessage"
        class="toast"
        role="status"
        aria-live="polite"
        @click="toastMessage = null"
      >
        <span class="toast__icon">✓</span>
        <span class="toast__text">{{ toastMessage }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import type { DayData, Person, Time } from './types'
import {
  PEOPLE,
  TIMES,
  defaultTimeFor,
  emptyDays,
} from './types'
import {
  addDays,
  dayLabel,
  getWeekMonday,
  isoWeek,
  mondayKey,
  monthLabel,
} from './week'
import { loadSchedule, resetSchedule, saveSchedule } from './persistence'
import {
  getCurrentSubscription,
  subscribePersonToPush,
  unsubscribeFromPush,
} from './push'

const ACTOR_KEY = 'escuelita-actor'

const people = PEOPLE
const times = TIMES

const currentActor = ref<Person | null>(null)
const pushSubscribed = ref(false)
const pushBusy = ref(false)

try {
  const savedActor = localStorage.getItem(ACTOR_KEY) as Person | null
  if (savedActor && people.some((p) => p.id === savedActor)) {
    currentActor.value = savedActor
  }
} catch {
  /* ignore */
}

async function selectActor(person: Person) {
  currentActor.value = person
  try {
    localStorage.setItem(ACTOR_KEY, person)
  } catch {
    /* ignore */
  }
  if (pushSubscribed.value) {
    pushBusy.value = true
    const res = await subscribePersonToPush(person)
    pushBusy.value = false
    if (res.ok) {
      showToast(`Avisos vinculados a ${person}`)
    }
  } else {
    showToast(`Editando como ${person}`)
  }
}

async function togglePush() {
  if (!currentActor.value) {
    showToast('Primero elige quién eres arriba ("Soy:")')
    return
  }
  pushBusy.value = true
  if (pushSubscribed.value) {
    await unsubscribeFromPush()
    pushSubscribed.value = false
    pushBusy.value = false
    showToast('Avisos desactivados en este dispositivo')
    return
  }

  const res = await subscribePersonToPush(currentActor.value)
  pushBusy.value = false
  if (res.ok) {
    pushSubscribed.value = true
    showToast(`Avisos activados para ${currentActor.value}`)
  } else if (res.reason) {
    showToast(res.reason)
  }
}

const now = new Date()
const monday0 = getWeekMonday(now)
const monday1 = addDays(monday0, 7)

const weeksMeta = [
  {
    key: mondayKey(monday0),
    title: 'Esta semana',
    weekNumber: isoWeek(monday0),
    month: monthLabel(monday0),
    days: Array.from({ length: 5 }, (_, i) => dayLabel(monday0, i, now)),
  },
  {
    key: mondayKey(monday1),
    title: 'Próxima semana',
    weekNumber: isoWeek(monday1),
    month: monthLabel(monday1),
    days: Array.from({ length: 5 }, (_, i) => dayLabel(monday1, i, now)),
  },
]

// Mark the first non-past school day (cutoff 15:00) as current
let currentTargetKey: string | null = null
for (let wi = 0; wi < weeksMeta.length; wi++) {
  const w = weeksMeta[wi]
  for (let di = 0; di < w.days.length; di++) {
    const d = w.days[di]
    if (!d.isPast) {
      d.isCurrent = true
      d.currentBadge = d.isToday ? 'Hoy' : 'Siguiente'
      currentTargetKey = `${wi}-${di}`
      break
    }
  }
  if (currentTargetKey) break
}

const schedule = ref<Record<string, DayData[]>>({
  [weeksMeta[0].key]: emptyDays(),
  [weeksMeta[1].key]: emptyDays(),
})

function getWeekDays(key: string): DayData[] {
  if (!schedule.value[key]) {
    schedule.value[key] = emptyDays()
  }
  return schedule.value[key]
}

function getDayTitle(weekKey: string, dayIndex: number): string {
  const w = weeksMeta.find((m) => m.key === weekKey)
  if (!w) return ''
  const d = w.days[dayIndex]
  return `${d.name} ${d.date}`
}

const loading = ref(true)
const saving = ref(false)
const savedAt = ref<number | null>(null)
let saveTimer: ReturnType<typeof setTimeout> | null = null

const toastMessage = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string) {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = null
  }, 3400)
}

interface ConfirmModalState {
  title: string
  message: string
  resolve: (ok: boolean) => void
}

const confirmModal = ref<ConfirmModalState | null>(null)

function askConfirm(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    confirmModal.value = { title, message, resolve }
  })
}

function closeConfirm(ok: boolean) {
  if (!confirmModal.value) return
  const { resolve } = confirmModal.value
  confirmModal.value = null
  resolve(ok)
}

const dayRefs = ref<Record<string, HTMLElement | null>>({})
function setDayRef(el: HTMLElement | null, wi: number, i: number) {
  dayRefs.value[`${wi}-${i}`] = el
}

const expandedPast = ref<Record<string, boolean>>({})
function isDayCollapsed(wi: number, i: number): boolean {
  const isPast = weeksMeta[wi]?.days[i]?.isPast ?? false
  return isPast && !expandedPast.value[`${wi}-${i}`]
}

function togglePastDay(wi: number, i: number) {
  const key = `${wi}-${i}`
  expandedPast.value[key] = !expandedPast.value[key]
}

const statusText = computed(() => {
  if (loading.value) return 'Cargando…'
  if (saving.value) return 'Guardando…'
  if (savedAt.value) return 'Guardado'
  return 'Listo'
})
const statusClass = computed(() => {
  if (loading.value) return 'status--loading'
  if (saving.value) return 'status--saving'
  return 'status--ok'
})

function activePayload(): Record<string, DayData[]> {
  return {
    [weeksMeta[0].key]: getWeekDays(weeksMeta[0].key),
    [weeksMeta[1].key]: getWeekDays(weeksMeta[1].key),
  }
}

function scheduleSave(noticeText: string) {
  if (saveTimer) clearTimeout(saveTimer)
  saving.value = true
  saveTimer = setTimeout(async () => {
    await saveSchedule(activePayload(), currentActor.value)
    saving.value = false
    savedAt.value = Date.now()
    showToast(noticeText)
  }, 250)
}

async function selectDropPerson(weekKey: string, i: number, p: Person) {
  const days = getWeekDays(weekKey)
  const current = days[i].dropOff.person
  const dayStr = getDayTitle(weekKey, i)

  if (current === p) {
    const ok = await askConfirm(
      'Quitar asignación',
      `¿Quitar a ${p} de llevar al cole el ${dayStr}?`,
    )
    if (!ok) return
    days[i].dropOff.person = null
    days[i].dropOff.time = null
    scheduleSave(`Guardado · ${dayStr}: sin asignar (llevar)`)
  } else {
    const nextTime = defaultTimeFor(p, i)
    const msg = current
      ? `¿Cambiar de ${current} a ${p} (${nextTime}) para llevar al cole el ${dayStr}?`
      : `¿Asignar a ${p} (${nextTime}) para llevar al cole el ${dayStr}?`
    const ok = await askConfirm('Confirmar cambio', msg)
    if (!ok) return
    days[i].dropOff.person = p
    days[i].dropOff.time = nextTime
    scheduleSave(`Guardado · ${dayStr}: ${p} lleva (${nextTime})`)
  }
}

async function onDropTimeChange(weekKey: string, i: number, ev: Event) {
  const selectEl = ev.target as HTMLSelectElement
  const nextTime = selectEl.value as Time
  const days = getWeekDays(weekKey)
  const prevTime = days[i].dropOff.time
  const person = days[i].dropOff.person
  if (!person || nextTime === prevTime) return

  const dayStr = getDayTitle(weekKey, i)
  const ok = await askConfirm(
    'Cambiar hora',
    `¿Cambiar la hora de ${person} el ${dayStr} de ${prevTime} a ${nextTime}?`,
  )
  if (!ok) {
    selectEl.value = prevTime ?? ''
    return
  }
  days[i].dropOff.time = nextTime
  scheduleSave(`Guardado · ${dayStr}: ${person} a las ${nextTime}`)
}

async function selectPickupPerson(weekKey: string, i: number, p: Person) {
  const days = getWeekDays(weekKey)
  const current = days[i].pickUp.person
  const dayStr = getDayTitle(weekKey, i)

  if (current === p) {
    const ok = await askConfirm(
      'Quitar asignación',
      `¿Quitar a ${p} de recoger del cole el ${dayStr}?`,
    )
    if (!ok) return
    days[i].pickUp.person = null
    scheduleSave(`Guardado · ${dayStr}: sin asignar (recoger)`)
  } else {
    const msg = current
      ? `¿Cambiar de ${current} a ${p} para recoger del cole el ${dayStr}?`
      : `¿Asignar a ${p} para recoger del cole el ${dayStr}?`
    const ok = await askConfirm('Confirmar cambio', msg)
    if (!ok) return
    days[i].pickUp.person = p
    scheduleSave(`Guardado · ${dayStr}: ${p} recoge`)
  }
}

async function resetOneWeek(weekKey: string, label: string) {
  const ok = await askConfirm(
    'Reiniciar semana',
    `¿Seguro que quieres borrar todas las asignaciones de ${label.toLowerCase()}?`,
  )
  if (!ok) return
  schedule.value[weekKey] = emptyDays()
  scheduleSave(`Semana reiniciada · ${label}`)
}

async function resetAll() {
  const ok = await askConfirm(
    'Reiniciar todo',
    '¿Seguro que quieres borrar las asignaciones de las dos semanas?',
  )
  if (!ok) return
  schedule.value = {
    [weeksMeta[0].key]: emptyDays(),
    [weeksMeta[1].key]: emptyDays(),
  }
  await resetSchedule()
  savedAt.value = Date.now()
  showToast('Guardado · Se han reiniciado las dos semanas')
}

function scrollToCurrentDay() {
  if (!currentTargetKey) return
  const el = dayRefs.value[currentTargetKey]
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
}

onMounted(async () => {
  await nextTick()
  requestAnimationFrame(() => scrollToCurrentDay())

  const [loaded, existingSub] = await Promise.all([
    loadSchedule(weeksMeta[0].key),
    getCurrentSubscription(),
  ])

  if (existingSub && currentActor.value) {
    pushSubscribed.value = true
  }

  if (loaded) {
    for (const w of weeksMeta) {
      if (Array.isArray(loaded[w.key]) && loaded[w.key].length === 5) {
        schedule.value[w.key] = loaded[w.key]
      }
    }
  }
  loading.value = false
})
</script>
