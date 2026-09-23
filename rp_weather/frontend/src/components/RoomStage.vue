<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { FLOOR_BAND, PHASE_LABELS, PHASE_ROOMS, createWalker, depthScale, stepWalker, type RoomPhase, type Walker } from '../lib/room'
import RoomCharacter from './RoomCharacter.vue'

defineOptions({ name: 'RoomStage' })
const props = withDefaults(defineProps<{ phase: RoomPhase; animated?: boolean }>(), { animated: true })
const room = computed(() => PHASE_ROOMS[props.phase])
const walker = ref<Walker>(createWalker(FLOOR_BAND, Math.random, room.value.favorite))
const moving = ref(false)
let timer: ReturnType<typeof setInterval> | undefined
let last = 0
const TICK_MS = 100

function tick() {
  const now = Date.now()
  const next = stepWalker(walker.value, now, now - last, FLOOR_BAND, Math.random, room.value.favorite)
  moving.value = next.x !== walker.value.x || next.y !== walker.value.y
  walker.value = next
  last = now
}
function start() {
  stop()
  if (room.value.behavior !== 'walk' || !props.animated) { moving.value = false; return }
  last = Date.now()
  timer = setInterval(tick, TICK_MS)
}
function stop() { clearInterval(timer); timer = undefined }
onMounted(start)
onUnmounted(stop)
watch(() => [props.phase, props.animated], () => {
  // Re-enter the floor from the doorway side when a walking phase starts, so the character never pops in mid-room.
  if (room.value.behavior === 'walk') walker.value = { ...walker.value, x: FLOOR_BAND.x[0], y: FLOOR_BAND.y[1], facing: 'right', restUntil: 0 }
  start()
})

/** The character's feet stand at (x, y) percent of the stage; stationary behaviors pin it to the phase's spot. */
const position = computed(() => room.value.spot ?? { x: walker.value.x, y: walker.value.y })
const style = computed(() => ({
  left: `${position.value.x}%`,
  top: `${position.value.y}%`,
  zIndex: Math.round(position.value.y),
  transform: `translate(-50%, -100%) scale(${depthScale(position.value.y, FLOOR_BAND).toFixed(3)})`,
}))
</script>

<template>
  <section class="room-stage" :data-phase="phase" :data-behavior="room.behavior" :aria-label="`おへや：${PHASE_LABELS[phase]}`">
    <RoomCharacter class="room-resident" :style="style" :behavior="room.behavior" :facing="walker.facing" :moving="moving" />
  </section>
</template>

<style scoped>
.room-stage { position: relative; flex: 1; min-height: 120px; min-width: 0; overflow: hidden; }
.room-resident { position: absolute; transform-origin: 50% 100%; will-change: left, top; }
</style>
