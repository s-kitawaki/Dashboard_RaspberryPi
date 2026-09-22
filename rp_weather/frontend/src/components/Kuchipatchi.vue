<script setup lang="ts">
import { computed } from 'vue'
import { japanDate } from '../lib/time'

defineOptions({ name: 'KuchipatchiPet' })
const props = withDefaults(defineProps<{ now: Date; facing?: 'front' | 'left' | 'right'; walking?: boolean }>(), { facing: 'front' })
const sleeping = computed(() => {
  const hour = Number(japanDate(props.now).hour)
  return hour >= 22 || hour < 7
})
</script>

<template>
  <div class="kuchipatchi" :class="{ 'is-sleeping': sleeping, 'is-walking': walking }" role="img"
    :aria-label="sleeping ? 'くちぱっち：おやすみ中' : walking ? 'くちぱっち：お散歩中' : 'くちぱっち：足踏み中'">
    <!-- Integer coordinates and crisp edges keep this small, editable SVG pixel-sharp. -->
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true">
      <path fill="#10201d" opacity=".4" d="M10 37h20v1H10z" />
      <g class="pet-direction" :transform="facing === 'left' ? 'translate(40 0) scale(-1 1)' : undefined">
      <!-- Feet sit behind the body so stepping never opens a gap at the belly. -->
      <g class="pet-foot pet-foot-left">
        <path fill="#173f70" d="M10 31h9v5h-1v1h-6v-1h-2z" />
        <path fill="#a8ce0b" d="M11 32h7v3h-1v1h-4v-1h-2z" />
      </g>
      <g class="pet-foot pet-foot-right">
        <path fill="#173f70" d="M22 31h9v5h-2v1h-5v-1h-2z" />
        <path fill="#a8ce0b" d="M23 32h7v3h-2v1h-3v-1h-2z" />
      </g>
      <g v-if="!walking && facing === 'front'" class="pet-body">
        <!-- Front view: broad rounded body, navy outline and two green lips. -->
        <path fill="#173f70" d="M15 3h10v1h4v1h2v2h2v3h1v10h1v2h2v3h1v3h-1v1h-3v2h-1v1h-2v1h-3v1H13v-1h-3v-1H8v-2H7v-1H4v-1H3v-3h1v-2h1v-2h2v-2H6v-8h1V9h1V7h2V5h2V4h3z" />
        <path fill="#a8ce0b" d="M15 5h10V6h4v1h2v3h1v11h1v2h2v3h1v1h-3v-4h-1v-1h-1v6h1v2h-2v1h-3v1H13v-1h-3v-1H9v-7H8v1H7v3H5v-2h1v-2h1v-2h2v-2H8v-8h1V9h1V8h2V6h3z" />
        <g class="pet-eyes-open" fill="#173f70">
          <path d="M11 10h2v1h1v2h-1v1h-2v-1h-1v-2h1zM27 10h2v1h1v2h-1v1h-2v-1h-1v-2h1z" />
        </g>
        <g class="pet-eyes-closed" fill="#173f70">
          <path d="M10 12h4v1h-4zM26 12h4v1h-4z" />
        </g>
        <path fill="#d5df00" d="M10 15h2v1h1v3h-1v1h-2v-1H9v-3h1zM28 15h2v1h1v3h-1v1h-2v-1h-1v-3h1z" />
        <!-- The bill is the same green as the body, with a dark middle seam. -->
        <path fill="#173f70" d="M15 14h10v1h2v8h-2v1H15v-1h-2v-8h2z" />
        <path fill="#a8ce0b" d="M15 16h10v2h-1v1h-8v-1h-1zM15 20h10v2h-2v1h-6v-1h-2z" />
      </g>
      <g v-else class="pet-body">
        <!-- Three-quarter profile: lips extend from the face, with a rounded back. -->
        <path fill="#173f70" d="M14 3h10v1h4v2h3v2h1v3h5v1h2v4h-1v1h-3v1h2v1h1v3h-2v1h-4v6h-1v2h-2v2h-4v1H12v-1H9v-1H7v-2H5v-3H4v-7h1v-4h1v-6h1V8h2V6h2V4h3z" />
        <path fill="#a8ce0b" d="M14 5h10v1h4v2h1v2h1v3h7v1h1v1h-2v1h-7v2h5v1h2v1h1v1h-7v8h-1v2h-4v1H12v-1H9v-2H7v-3H6v-6h1v-4h1v-6h1V9h2V7h3z" />
        <g class="pet-eyes-open" fill="#173f70">
          <path d="M14 11h3v3h-3zM25 8h3v3h-3z" />
        </g>
        <g class="pet-eyes-closed" fill="#173f70">
          <path d="M14 13h3v1h-3zM25 10h3v1h-3z" />
        </g>
        <path fill="#d5df00" d="M14 16h3v1h1v3h-1v1h-3v-1h-1v-3h1z" />
        <path fill="#173f70" d="M12 22h2v2h-1v3h1v1h2v-1h1v-4h2v4h-1v2h-2v1h-3v-1h-2v-5h1z" />
      </g>
      </g>
      <g v-if="sleeping" class="pet-sleep" fill="#d4e4be">
        <path d="M29 6h5v1h-1v1h-1v1h-1v1h3v1h-5V9h1V8h1V7h-2zM35 1h4v1h-1v1h-1v1h2v1h-4V4h1V3h1V2h-2z" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.kuchipatchi { width: 80px; height: 80px; flex: 0 0 80px; pointer-events: none; }
.is-walking { flex: 1 0 80px; width: auto; min-width: 80px; position: relative; }
.is-walking svg { position: absolute; width: 80px; left: calc(100% - 80px); animation: pet-walk 16s linear infinite; }
.is-walking .pet-direction { transform-origin: 20px 20px; animation: pet-turn 16s steps(1, end) infinite; }
.is-walking.is-sleeping svg, .is-walking.is-sleeping .pet-direction { animation-play-state: paused; }
@keyframes pet-walk { 0%, 100% { left: calc(100% - 80px); } 50% { left: 0; } }
@keyframes pet-turn { 0%, 100% { transform: scaleX(-1); } 50% { transform: scaleX(1); } }
svg { display: block; width: 100%; height: 100%; }
.pet-body { animation: pet-bob 1s steps(1, end) infinite; }
.pet-foot { animation: pet-step 1s steps(1, end) infinite; }
.pet-foot-right { animation-delay: -.5s; }
.pet-eyes-open { animation: pet-blink-open 6s steps(1, end) infinite; }
.pet-eyes-closed { opacity: 0; animation: pet-blink-closed 6s steps(1, end) infinite; }
.is-sleeping .pet-body { animation: pet-breathe 4s steps(1, end) infinite; }
.is-sleeping .pet-foot { animation: none; }
.is-sleeping .pet-eyes-open { animation: none; opacity: 0; }
.is-sleeping .pet-eyes-closed { animation: none; opacity: 1; }
.pet-sleep { animation: pet-dream 4s steps(1, end) infinite; }
@keyframes pet-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
@keyframes pet-step { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
@keyframes pet-blink-open { 0%, 96%, 100% { opacity: 1; } 97% { opacity: 0; } }
@keyframes pet-blink-closed { 0%, 96%, 100% { opacity: 0; } 97% { opacity: 1; } }
@keyframes pet-breathe { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(1px); } }
@keyframes pet-dream { 0%, 100% { opacity: .4; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .kuchipatchi * { animation: none !important; } }
</style>
