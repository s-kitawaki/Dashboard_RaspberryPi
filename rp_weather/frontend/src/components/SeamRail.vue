<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { japanDate } from '../lib/time'
import { isSleepHour } from '../lib/room'
import { createRailWalker, stepRail, type RailGeometry, type RailWalker } from '../lib/rail'
import type { SpriteName } from '../lib/sprites'
import TamaSprite from './TamaSprite.vue'

defineOptions({ name: 'SeamRail' })
const props = withDefaults(defineProps<{ now: Date; walkers: SpriteName[]; animated?: boolean }>(), { animated: true })

const PET_WIDTH = 80
/** Distance from the sprite's box bottom to its drawn feet (viewBox row 37 of 40 at 80px). */
const FOOT_OFFSET = 6

const root = ref<HTMLElement | null>(null)
const railTop = ref(0)
const geometry = ref<RailGeometry>({ width: 0, gapStart: 0, gapEnd: 0, petWidth: PET_WIDTH })
const runners = ref<RailWalker[]>([])
const sleeping = computed(() => isSleepHour(Number(japanDate(props.now).hour)))
const reducedMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null
const running = computed(() => props.animated && !sleeping.value && !(reducedMotion?.matches ?? false))

/** Walkers start evenly spaced along the line so they never bunch up. */
function spread() {
  const w = geometry.value.width
  runners.value = props.walkers.map((_, i) => createRailWalker(w > 0 ? Math.max(0, (w - PET_WIDTH) * i / Math.max(1, props.walkers.length)) : 0))
}

/** The line is the top edge of the lower row; the gap is between the calendar and the rate panel. */
function measure() {
  const grid = root.value?.parentElement
  const calendar = grid?.querySelector<HTMLElement>('.calendar-panel')
  const rate = grid?.querySelector<HTMLElement>('.rate-panel')
  if (!grid || !calendar || !rate) return
  const g = grid.getBoundingClientRect(), c = calendar.getBoundingClientRect(), r = rate.getBoundingClientRect()
  railTop.value = c.top - g.top
  const first = geometry.value.width === 0
  geometry.value = { width: g.width, gapStart: c.right - g.left, gapEnd: r.left - g.left, petWidth: PET_WIDTH }
  if (first || runners.value.some(x => x.x + PET_WIDTH > g.width)) spread()
}

let frame = 0
let last = 0
function tick(now: number) {
  if (last) { const dt = Math.min(now - last, 100); runners.value = runners.value.map(r => stepRail(r, now, dt, geometry.value)) }
  last = now
  frame = requestAnimationFrame(tick)
}
function start() { stop(); last = 0; frame = requestAnimationFrame(tick) }
function stop() { cancelAnimationFrame(frame); frame = 0 }

let observer: ResizeObserver | undefined
onMounted(() => {
  measure()
  if (typeof ResizeObserver === 'function' && root.value?.parentElement) {
    observer = new ResizeObserver(measure)
    observer.observe(root.value.parentElement)
  }
  window.addEventListener('resize', measure)
  reducedMotion?.addEventListener('change', sync)
  sync()
})
onUnmounted(() => { stop(); observer?.disconnect(); window.removeEventListener('resize', measure); reducedMotion?.removeEventListener('change', sync) })
function sync() { if (running.value) start(); else stop() }
watch(running, sync)
// Compare by content: a fresh array with the same names must not restart the walk.
watch(() => props.walkers.join(','), spread)

function styleFor(r: RailWalker) { return { transform: `translate(${r.x.toFixed(2)}px, ${(r.y + FOOT_OFFSET).toFixed(2)}px)` } }
</script>

<template>
  <div ref="root" class="seam-rail" :style="{ top: `${railTop}px` }">
    <div v-for="(name, index) in walkers" :key="name" class="rail-runner" :class="{ 'is-jumping': runners[index]?.jump != null }"
      :style="runners[index] ? styleFor(runners[index]) : undefined" :data-jumping="runners[index]?.jump != null ? 'true' : 'false'" :data-sprite="name">
      <TamaSprite :name="name" facing="right" :moving="running" :sleeping="sleeping" />
    </div>
  </div>
</template>

<style scoped>
.seam-rail { position: absolute; left: 0; right: 0; height: 0; z-index: 5; pointer-events: none; overflow: visible; }
/* The runner's box bottom sits on the line; the transform lifts it by the foot offset and any jump height. */
.rail-runner { position: absolute; left: 0; bottom: 0; width: 80px; height: 80px; will-change: transform; }
</style>
