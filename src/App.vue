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

    <!-- Identity, Settings & Push Notifications Bar -->
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

      <div class="identity-bar__actions">
        <button
          v-if="currentActor"
          type="button"
          class="btn btn--sm btn--ghost btn--settings"
          :title="`Ajustes de ${currentActor}`"
          @click="openSettingsModal"
        >
          <span class="cog-icon" aria-hidden="true">⚙️</span>
          <span>Ajustes ({{ currentActor }})</span>
        </button>

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
      </div>
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
                <div class="slot__head">
                  <div class="slot__label">
                    <span class="row-icon">🚗</span>
                    <span>Llevar</span>
                  </div>
                  <div class="theo-toggle" role="group" aria-label="Casa de Theo por la mañana">
                    <span class="theo-toggle__label">Theo:</span>
                    <button
                      v-for="h in theoHouses"
                      :key="h"
                      type="button"
                      class="theo-btn"
                      :class="{ 'theo-btn--active': (day.dropOff.theoHouse ?? 'Jo') === h }"
                      @click="setTheoHouse(w.key, i, 'dropOff', h)"
                    >
                      {{ h }}
                    </button>
                  </div>
                </div>
                <div class="slot__controls">
                  <div class="people-grid">
                    <button
                      v-for="p in people"
                      :key="p.id"
                      type="button"
                      class="pill"
                      :disabled="isUnavailable(p.id, i, 'dropOff') && day.dropOff.person !== p.id"
                      :class="{
                        'pill--active': day.dropOff.person === p.id,
                        'pill--unavailable': isUnavailable(p.id, i, 'dropOff'),
                        'pill--default': isDefaultFor(p.id, i, 'dropOff'),
                        'pill--cf': p.group === 'CF',
                        'pill--lp': p.group === 'LP',
                      }"
                      :title="pillTitle(p.id, i, 'dropOff')"
                      @click="selectDropPerson(w.key, i, p.id)"
                    >
                      <span>{{ p.label }}</span>
                      <span
                        v-if="isDefaultFor(p.id, i, 'dropOff')"
                        class="pill__star"
                        aria-hidden="true"
                      >★</span>
                    </button>
                  </div>
                  <div class="time-row" v-if="day.dropOff.person">
                    <label class="time-label">Abajo</label>
                    <select
                      class="time-select"
                      :value="day.dropOff.time"
                      @change="onDropTimeChange(w.key, i, $event)"
                    >
                      <option v-for="t in times" :key="t" :value="t">{{ t }}</option>
                    </select>
                    <span
                      v-if="showJoDropTime(day)"
                      class="jo-time"
                    >
                      Jo {{ addMinutesToTime(day.dropOff.time!, 10) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Row 2: School pick-up -->
              <div class="slot slot--pickup">
                <div class="slot__head">
                  <div class="slot__label">
                    <span class="row-icon">🏠</span>
                    <span>Recoger</span>
                  </div>
                  <div class="theo-toggle" role="group" aria-label="Casa de Theo por la tarde">
                    <span class="theo-toggle__label">Theo:</span>
                    <button
                      v-for="h in theoHouses"
                      :key="h"
                      type="button"
                      class="theo-btn"
                      :class="{ 'theo-btn--active': (day.pickUp.theoHouse ?? 'Jo') === h }"
                      @click="setTheoHouse(w.key, i, 'pickUp', h)"
                    >
                      {{ h }}
                    </button>
                  </div>
                </div>
                <div class="slot__controls">
                  <div class="people-grid">
                    <button
                      v-for="p in people"
                      :key="p.id"
                      type="button"
                      class="pill pill--pick"
                      :disabled="isUnavailable(p.id, i, 'pickUp') && day.pickUp.person !== p.id"
                      :class="{
                        'pill--active': day.pickUp.person === p.id,
                        'pill--unavailable': isUnavailable(p.id, i, 'pickUp'),
                        'pill--default': isDefaultFor(p.id, i, 'pickUp'),
                        'pill--cf': p.group === 'CF',
                        'pill--lp': p.group === 'LP',
                      }"
                      :title="pillTitle(p.id, i, 'pickUp')"
                      @click="selectPickupPerson(w.key, i, p.id)"
                    >
                      <span>{{ p.label }}</span>
                      <span
                        v-if="isDefaultFor(p.id, i, 'pickUp')"
                        class="pill__star"
                        aria-hidden="true"
                      >★</span>
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

    <!-- User Settings modal -->
    <Transition name="fade">
      <div
        v-if="showSettingsModal && currentActor"
        class="modal-backdrop"
        @click.self="closeSettingsModal"
      >
        <div class="modal modal--settings" role="dialog" aria-modal="true">
          <header class="settings-modal__header">
            <div>
              <h3 class="modal__title">⚙️ Ajustes de {{ currentActor }}</h3>
              <p class="settings-modal__subtitle">
                Marca cuándo no estás disponible o qué turnos haces siempre por defecto (★).
                Los turnos por defecto se pueden cambiar cualquier semana.
              </p>
            </div>
            <button
              type="button"
              class="btn btn--ghost btn--sm"
              aria-label="Cerrar"
              @click="closeSettingsModal"
            >
              ✕
            </button>
          </header>

          <div class="settings-sections">
            <!-- Morning Drop-off Settings -->
            <section class="settings-block">
              <div class="settings-block__head">
                <div class="settings-block__title">
                  <span>🚗</span>
                  <span>Llevar al cole (mañanas)</span>
                </div>
                <button
                  type="button"
                  class="btn btn--ghost btn--xs"
                  @click="toggleAllSlotUnavailable('dropOff')"
                >
                  {{ isAllSlotUnavailable('dropOff') ? 'Habilitar todos' : 'Nunca disponible' }}
                </button>
              </div>

              <div class="settings-days">
                <div
                  v-for="(dayName, di) in dayNames"
                  :key="`drop-${di}`"
                  class="settings-day-row"
                >
                  <div class="settings-day-label">
                    <span class="settings-day-name">{{ dayName }}</span>
                    <span
                      v-if="otherDefaultPerson(di, 'dropOff')"
                      class="settings-other-default"
                    >
                      ★ {{ otherDefaultPerson(di, 'dropOff') }}
                    </span>
                  </div>

                  <div class="settings-day-controls">
                    <div class="seg-group" role="group" :aria-label="`Llevar ${dayName}`">
                      <button
                        type="button"
                        class="seg-btn"
                        :class="{ 'seg-btn--active': draftSettings[di].dropOff.state === 'available' }"
                        @click="setDraftState(di, 'dropOff', 'available')"
                      >
                        Disponible
                      </button>
                      <button
                        type="button"
                        class="seg-btn seg-btn--unavail"
                        :class="{ 'seg-btn--active': draftSettings[di].dropOff.state === 'unavailable' }"
                        @click="setDraftState(di, 'dropOff', 'unavailable')"
                      >
                        No disp.
                      </button>
                      <button
                        type="button"
                        class="seg-btn seg-btn--default"
                        :class="{ 'seg-btn--active': draftSettings[di].dropOff.state === 'default' }"
                        @click="setDraftState(di, 'dropOff', 'default')"
                      >
                        ★ Por defecto
                      </button>
                    </div>

                    <select
                      v-if="draftSettings[di].dropOff.state === 'default'"
                      class="time-select time-select--sm"
                      :value="draftSettings[di].dropOff.time"
                      @change="setDraftDropTime(di, $event)"
                    >
                      <option v-for="t in times" :key="t" :value="t">{{ t }}</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <!-- Afternoon Pick-up Settings -->
            <section class="settings-block">
              <div class="settings-block__head">
                <div class="settings-block__title">
                  <span>🏠</span>
                  <span>Recoger del cole (tardes)</span>
                </div>
                <button
                  type="button"
                  class="btn btn--ghost btn--xs"
                  @click="toggleAllSlotUnavailable('pickUp')"
                >
                  {{ isAllSlotUnavailable('pickUp') ? 'Habilitar todos' : 'Nunca disponible' }}
                </button>
              </div>

              <div class="settings-days">
                <div
                  v-for="(dayName, di) in dayNames"
                  :key="`pick-${di}`"
                  class="settings-day-row"
                >
                  <div class="settings-day-label">
                    <span class="settings-day-name">{{ dayName }}</span>
                    <span
                      v-if="otherDefaultPerson(di, 'pickUp')"
                      class="settings-other-default"
                    >
                      ★ {{ otherDefaultPerson(di, 'pickUp') }}
                    </span>
                  </div>

                  <div class="settings-day-controls">
                    <div class="seg-group" role="group" :aria-label="`Recoger ${dayName}`">
                      <button
                        type="button"
                        class="seg-btn"
                        :class="{ 'seg-btn--active': draftSettings[di].pickUp.state === 'available' }"
                        @click="setDraftState(di, 'pickUp', 'available')"
                      >
                        Disponible
                      </button>
                      <button
                        type="button"
                        class="seg-btn seg-btn--unavail"
                        :class="{ 'seg-btn--active': draftSettings[di].pickUp.state === 'unavailable' }"
                        @click="setDraftState(di, 'pickUp', 'unavailable')"
                      >
                        No disp.
                      </button>
                      <button
                        type="button"
                        class="seg-btn seg-btn--default"
                        :class="{ 'seg-btn--active': draftSettings[di].pickUp.state === 'default' }"
                        @click="setDraftState(di, 'pickUp', 'default')"
                      >
                        ★ Por defecto
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div class="modal__actions">
            <button
              type="button"
              class="btn btn--ghost"
              @click="closeSettingsModal"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="btn btn--primary"
              @click="saveUserSettings"
            >
              Guardar ajustes
            </button>
          </div>
        </div>
      </div>
    </Transition>

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
import type {
  DayData,
  Person,
  PersonDaySetting,
  SlotRuleState,
  TheoHouse,
  Time,
  UserSettingsMap,
} from './types'
import {
  DEFAULT_THEO_HOUSE,
  PEOPLE,
  THEO_HOUSES,
  TIMES,
  addMinutesToTime,
  applyDefaultsToDays,
  defaultDaysFromSettings,
  defaultTimeFor,
  emptyDays,
  emptyPersonSettings,
  getDefaultDropOff,
  getDefaultPickUp,
  isBuildingPerson,
  isPersonUnavailable,
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
const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

const people = PEOPLE
const times = TIMES
const theoHouses = THEO_HOUSES

const currentActor = ref<Person | null>(null)
const pushSubscribed = ref(false)
const pushBusy = ref(false)

const userSettings = ref<UserSettingsMap>({})
const showSettingsModal = ref(false)
const draftSettings = ref<PersonDaySetting[]>(emptyPersonSettings('Cris'))

try {
  const savedActor = localStorage.getItem(ACTOR_KEY) as Person | null
  if (savedActor && people.some((p) => p.id === savedActor)) {
    currentActor.value = savedActor
  }
} catch {
  /* ignore */
}

function isUnavailable(
  person: Person,
  dayIndex: number,
  slot: 'dropOff' | 'pickUp',
): boolean {
  return isPersonUnavailable(userSettings.value, person, dayIndex, slot)
}

function isDefaultFor(
  person: Person,
  dayIndex: number,
  slot: 'dropOff' | 'pickUp',
): boolean {
  return userSettings.value[person]?.[dayIndex]?.[slot]?.state === 'default'
}

function pillTitle(
  person: Person,
  dayIndex: number,
  slot: 'dropOff' | 'pickUp',
): string {
  if (isUnavailable(person, dayIndex, slot)) {
    return `${person} no está disponible en este turno`
  }
  if (isDefaultFor(person, dayIndex, slot)) {
    return `${person} (por defecto en este turno)`
  }
  return person
}

function openSettingsModal() {
  if (!currentActor.value) return
  const actor = currentActor.value
  const existing = userSettings.value[actor] ?? emptyPersonSettings(actor)
  draftSettings.value = existing.map((d, i) => ({
    dropOff: {
      state: d.dropOff.state,
      time: d.dropOff.time ?? defaultTimeFor(actor, i),
    },
    pickUp: {
      state: d.pickUp.state,
    },
  }))
  showSettingsModal.value = true
}

function closeSettingsModal() {
  showSettingsModal.value = false
}

function setDraftState(
  dayIndex: number,
  slot: 'dropOff' | 'pickUp',
  state: SlotRuleState,
) {
  if (slot === 'dropOff') {
    const actor = currentActor.value ?? 'Cris'
    draftSettings.value[dayIndex].dropOff.state = state
    if (state === 'default' && !draftSettings.value[dayIndex].dropOff.time) {
      draftSettings.value[dayIndex].dropOff.time = defaultTimeFor(actor, dayIndex)
    }
  } else {
    draftSettings.value[dayIndex].pickUp.state = state
  }
}

function setDraftDropTime(dayIndex: number, ev: Event) {
  const selectEl = ev.target as HTMLSelectElement
  draftSettings.value[dayIndex].dropOff.time = selectEl.value as Time
}

function isAllSlotUnavailable(slot: 'dropOff' | 'pickUp'): boolean {
  return draftSettings.value.every((d) => d[slot].state === 'unavailable')
}

function toggleAllSlotUnavailable(slot: 'dropOff' | 'pickUp') {
  const target: SlotRuleState = isAllSlotUnavailable(slot)
    ? 'available'
    : 'unavailable'
  for (let i = 0; i < draftSettings.value.length; i++) {
    setDraftState(i, slot, target)
  }
}

function otherDefaultPerson(
  dayIndex: number,
  slot: 'dropOff' | 'pickUp',
): Person | null {
  const actor = currentActor.value
  if (slot === 'dropOff') {
    const def = getDefaultDropOff(userSettings.value, dayIndex)
    return def && def.person !== actor ? def.person : null
  }
  const def = getDefaultPickUp(userSettings.value, dayIndex)
  return def && def !== actor ? def : null
}

function saveUserSettings() {
  const actor = currentActor.value
  if (!actor) return

  const nextSettings: UserSettingsMap = {}
  for (const p of people) {
    const src = userSettings.value[p.id] ?? emptyPersonSettings(p.id)
    nextSettings[p.id] = src.map((d, i) => ({
      dropOff: {
        state: d.dropOff.state,
        time: d.dropOff.time ?? defaultTimeFor(p.id, i),
      },
      pickUp: { state: d.pickUp.state },
    }))
  }

  nextSettings[actor] = draftSettings.value.map((d, i) => ({
    dropOff: {
      state: d.dropOff.state,
      time: d.dropOff.time ?? defaultTimeFor(actor, i),
    },
    pickUp: { state: d.pickUp.state },
  }))

  // Ensure at most one person has 'default' per day + slot
  for (let i = 0; i < 5; i++) {
    if (nextSettings[actor]![i].dropOff.state === 'default') {
      for (const p of people) {
        if (p.id !== actor && nextSettings[p.id]?.[i]?.dropOff.state === 'default') {
          nextSettings[p.id]![i].dropOff.state = 'available'
        }
      }
    }
    if (nextSettings[actor]![i].pickUp.state === 'default') {
      for (const p of people) {
        if (p.id !== actor && nextSettings[p.id]?.[i]?.pickUp.state === 'default') {
          nextSettings[p.id]![i].pickUp.state = 'available'
        }
      }
    }
  }

  userSettings.value = nextSettings

  // Apply defaults / unavailability to active weeks for non-past days
  for (const w of weeksMeta) {
    const days = getWeekDays(w.key)
    for (let i = 0; i < 5; i++) {
      if (w.days[i].isPast) continue

      const actorDropState = nextSettings[actor]![i].dropOff.state
      if (actorDropState === 'unavailable' && days[i].dropOff.person === actor) {
        days[i].dropOff = {
          person: null,
          time: null,
          theoHouse: days[i].dropOff.theoHouse ?? DEFAULT_THEO_HOUSE,
          overridden: false,
        }
      } else if (actorDropState === 'default' && days[i].dropOff.person === null) {
        days[i].dropOff.overridden = false
      }

      const actorPickState = nextSettings[actor]![i].pickUp.state
      if (actorPickState === 'unavailable' && days[i].pickUp.person === actor) {
        days[i].pickUp = {
          person: null,
          theoHouse: days[i].pickUp.theoHouse ?? DEFAULT_THEO_HOUSE,
          overridden: false,
        }
      } else if (actorPickState === 'default' && days[i].pickUp.person === null) {
        days[i].pickUp.overridden = false
      }
    }
    schedule.value[w.key] = applyDefaultsToDays(days, userSettings.value)
  }

  showSettingsModal.value = false
  scheduleSave(`Ajustes guardados · ${actor}`)
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
    schedule.value[key] = defaultDaysFromSettings(userSettings.value)
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
    await saveSchedule(activePayload(), userSettings.value, currentActor.value)
    saving.value = false
    savedAt.value = Date.now()
    showToast(noticeText)
  }, 250)
}

function preferredDropTimeFor(person: Person, dayIndex: number): Time {
  return (
    userSettings.value[person]?.[dayIndex]?.dropOff.time ??
    defaultTimeFor(person, dayIndex)
  )
}

function showJoDropTime(day: DayData): boolean {
  return (
    isBuildingPerson(day.dropOff.person) &&
    Boolean(day.dropOff.time) &&
    (day.dropOff.theoHouse ?? DEFAULT_THEO_HOUSE) === 'Jo'
  )
}

function setTheoHouse(
  weekKey: string,
  i: number,
  slot: 'dropOff' | 'pickUp',
  house: TheoHouse,
) {
  const days = getWeekDays(weekKey)
  const current = days[i][slot].theoHouse ?? DEFAULT_THEO_HOUSE
  if (current === house) return
  days[i][slot].theoHouse = house
  const dayStr = getDayTitle(weekKey, i)
  const slotStr = slot === 'dropOff' ? 'llevar' : 'recoger'
  scheduleSave(`Guardado · ${dayStr}: Theo en casa de ${house} (${slotStr})`)
}

async function selectDropPerson(weekKey: string, i: number, p: Person) {
  const days = getWeekDays(weekKey)
  const current = days[i].dropOff.person
  const theoHouse = days[i].dropOff.theoHouse ?? DEFAULT_THEO_HOUSE
  if (isUnavailable(p, i, 'dropOff') && current !== p) return
  const dayStr = getDayTitle(weekKey, i)

  if (current === p) {
    const ok = await askConfirm(
      'Quitar asignación',
      `¿Quitar a ${p} de llevar al cole el ${dayStr}?`,
    )
    if (!ok) return
    days[i].dropOff = { person: null, time: null, theoHouse, overridden: true }
    scheduleSave(`Guardado · ${dayStr}: sin asignar (llevar)`)
  } else {
    const nextTime = preferredDropTimeFor(p, i)
    const msg = current
      ? `¿Cambiar de ${current} a ${p} (${nextTime}) para llevar al cole el ${dayStr}?`
      : `¿Asignar a ${p} (${nextTime}) para llevar al cole el ${dayStr}?`
    const ok = await askConfirm('Confirmar cambio', msg)
    if (!ok) return
    days[i].dropOff = { person: p, time: nextTime, theoHouse, overridden: true }
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
  days[i].dropOff.overridden = true
  scheduleSave(`Guardado · ${dayStr}: ${person} a las ${nextTime}`)
}

async function selectPickupPerson(weekKey: string, i: number, p: Person) {
  const days = getWeekDays(weekKey)
  const current = days[i].pickUp.person
  const theoHouse = days[i].pickUp.theoHouse ?? DEFAULT_THEO_HOUSE
  if (isUnavailable(p, i, 'pickUp') && current !== p) return
  const dayStr = getDayTitle(weekKey, i)

  if (current === p) {
    const ok = await askConfirm(
      'Quitar asignación',
      `¿Quitar a ${p} de recoger del cole el ${dayStr}?`,
    )
    if (!ok) return
    days[i].pickUp = { person: null, theoHouse, overridden: true }
    scheduleSave(`Guardado · ${dayStr}: sin asignar (recoger)`)
  } else {
    const msg = current
      ? `¿Cambiar de ${current} a ${p} para recoger del cole el ${dayStr}?`
      : `¿Asignar a ${p} para recoger del cole el ${dayStr}?`
    const ok = await askConfirm('Confirmar cambio', msg)
    if (!ok) return
    days[i].pickUp = { person: p, theoHouse, overridden: true }
    scheduleSave(`Guardado · ${dayStr}: ${p} recoge`)
  }
}

async function resetOneWeek(weekKey: string, label: string) {
  const ok = await askConfirm(
    'Reiniciar semana',
    `¿Seguro que quieres borrar las asignaciones manuales de ${label.toLowerCase()} y volver a los valores por defecto?`,
  )
  if (!ok) return
  schedule.value[weekKey] = defaultDaysFromSettings(userSettings.value)
  scheduleSave(`Semana reiniciada · ${label}`)
}

async function resetAll() {
  const ok = await askConfirm(
    'Reiniciar todo',
    '¿Seguro que quieres reiniciar las dos semanas a sus valores por defecto?',
  )
  if (!ok) return
  schedule.value = {
    [weeksMeta[0].key]: defaultDaysFromSettings(userSettings.value),
    [weeksMeta[1].key]: defaultDaysFromSettings(userSettings.value),
  }
  await resetSchedule(userSettings.value)
  await saveSchedule(activePayload(), userSettings.value, currentActor.value)
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
    userSettings.value = loaded.settings ?? {}
    for (const w of weeksMeta) {
      const rawWeek = loaded.weeks[w.key]
      if (Array.isArray(rawWeek) && rawWeek.length === 5) {
        schedule.value[w.key] = applyDefaultsToDays(rawWeek, userSettings.value)
      } else {
        schedule.value[w.key] = defaultDaysFromSettings(userSettings.value)
      }
    }
  }
  loading.value = false
})
</script>
