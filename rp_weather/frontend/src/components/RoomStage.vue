<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { FLOOR_BAND, PHASE_LABELS, PHASE_ROOMS, createWalker, depthScale, spotFor, stepWalker, type RoomPhase, type Walker } from '../lib/room'
import type { SpriteName } from '../lib/sprites'
import Kuchipatchi from './Kuchipatchi.vue'
import TamaSprite from './TamaSprite.vue'

/** Kuchipatchi keeps its own hand-drawn component; everyone else is a shared pixel sprite. */
export type Resident = 'kuchipatchi' | SpriteName

defineOptions({ name: 'RoomStage' })
const props = withDefaults(defineProps<{ phase: RoomPhase; animated?: boolean; residents?: Resident[]; now?: Date }>(), {
  animated: true, residents: () => ['kuchipatchi', 'ichigotchi'], now: () => new Date(),
})
const room = computed(() => PHASE_ROOMS[props.phase])
const sleeping = computed(() => room.value.behavior === 'sleep')

interface Mover { walker: Walker; moving: boolean }
const movers = ref<Mover[]>([])
function reset() {
  movers.value = props.residents.map((_, index) => {
    const walker = createWalker(FLOOR_BAND, Math.random, room.value.favorite)
    // Enter from the doorway side, staggered so residents do not overlap.
    return { walker: { ...walker, x: FLOOR_BAND.x[0] + index * 22, y: FLOOR_BAND.y[1] - index * 8, facing: 'right', restUntil: 0 }, moving: false }
  })
}
reset()

let timer: ReturnType<typeof setInterval> | undefined
let last = 0
const TICK_MS = 100
function tick() {
  const now = Date.now()
  movers.value = movers.value.map(m => {
    const next = stepWalker(m.walker, now, now - last, FLOOR_BAND, Math.random, room.value.favorite)
    return { walker: next, moving: next.x !== m.walker.x || next.y !== m.walker.y }
  })
  last = now
}
function start() {
  stop()
  if (room.value.behavior !== 'walk' || !props.animated) { movers.value = movers.value.map(m => ({ ...m, moving: false })); return }
  last = Date.now()
  timer = setInterval(tick, TICK_MS)
}
function stop() { clearInterval(timer); timer = undefined }
onMounted(start)
onUnmounted(stop)
watch(() => props.residents, reset)
watch(() => [props.phase, props.animated], () => { if (room.value.behavior === 'walk') reset(); start() })

/** Feet stand at (x, y) percent of the stage; stationary phases pin each resident to its spot. */
function styleFor(index: number) {
  const m = movers.value[index]
  const spot = spotFor(room.value, index)
  const p = spot ?? (m ? { x: m.walker.x, y: m.walker.y } : { x: 50, y: 80 })
  return { left: `${p.x}%`, top: `${p.y}%`, zIndex: Math.round(p.y), transform: `translate(-50%, -100%) scale(${depthScale(p.y, FLOOR_BAND).toFixed(3)})` }
}
</script>

<template>
  <section class="room-stage" :data-phase="phase" :data-behavior="room.behavior" :aria-label="`おへや：${PHASE_LABELS[phase]}`">
    <template v-for="(resident, index) in residents" :key="resident">
      <Kuchipatchi v-if="resident === 'kuchipatchi'" class="room-resident" :style="styleFor(index)" :now="now"
        :facing="movers[index]?.walker.facing ?? 'right'" :walking="false" :data-resident="resident" />
      <TamaSprite v-else class="room-resident" :style="styleFor(index)" :name="resident"
        :facing="movers[index]?.walker.facing ?? 'right'" :moving="movers[index]?.moving ?? false" :sleeping="sleeping" :data-resident="resident" />
    </template>
  </section>
</template>

<style scoped>
.room-stage { position: relative; flex: 1; min-height: 120px; min-width: 0; overflow: hidden; }
.room-resident { position: absolute; transform-origin: 50% 100%; will-change: left, top; width: 72px; height: 72px; }
</style>
