<script setup lang="ts">
import type { Behavior } from '../lib/room'

defineOptions({ name: 'RoomCharacter' })
withDefaults(defineProps<{ behavior: Behavior; facing?: 'left' | 'right'; moving?: boolean; name?: string }>(), { facing: 'right', moving: false, name: 'おきゃくさん' })
const labels: Record<Behavior, string> = { walk: 'お散歩中', brush: '歯みがき中', sleep: 'おやすみ中' }
</script>

<template>
  <!-- Placeholder resident: a round yellow critter drawn from integer rects so it stays pixel-sharp. -->
  <div class="room-character" :class="[`is-${behavior}`, { 'is-moving': moving }]" role="img" :aria-label="`${name}：${labels[behavior]}`">
    <svg viewBox="0 0 40 40" shape-rendering="crispEdges" aria-hidden="true">
      <path fill="#10201d" opacity=".35" d="M10 37h20v1H10z" />
      <g :transform="facing === 'left' ? 'translate(40 0) scale(-1 1)' : undefined">
        <g class="rc-foot rc-foot-left"><path fill="#4a4a6a" d="M12 31h6v4h-6z" /><path fill="#ffd23f" d="M13 32h4v2h-4z" /></g>
        <g class="rc-foot rc-foot-right"><path fill="#4a4a6a" d="M22 31h6v4h-6z" /><path fill="#ffd23f" d="M23 32h4v2h-4z" /></g>
        <g class="rc-body">
          <path fill="#4a4a6a" d="M13 4h14v1h3v1h2v2h2v3h1v14h-1v3h-2v2h-2v1h-3v1H13v-1h-3v-1H8v-2H6v-3H5V11h1V8h2V6h2V5h3z" />
          <path fill="#ffd23f" d="M13 6h14v1h3v2h2v3h1v12h-1v3h-2v2h-3v1H13v-1h-3v-2H8v-3H7V12h1V9h2V7h3z" />
          <g class="rc-eyes-open" fill="#4a4a6a"><path d="M13 13h3v3h-3zM24 13h3v3h-3z" /></g>
          <g class="rc-eyes-closed" fill="#4a4a6a"><path d="M12 15h4v1h-4zM24 15h4v1h-4z" /></g>
          <path fill="#ff8fb8" d="M9 18h3v2H9zM28 18h3v2h-3z" />
          <path fill="#4a4a6a" d="M17 21h6v1h-1v1h-4v-1h-1z" />
          <path fill="#4a4a6a" d="M18 2h2v3h-2z" /><path fill="#ffd23f" d="M17 0h4v2h-4z" />
          <!-- Toothbrush, only while brushing. -->
          <g v-if="behavior === 'brush'" class="rc-brush"><path fill="#7fb7e6" d="M28 20h2v10h-2z" /><path fill="#ffffff" d="M27 18h4v3h-4z" /></g>
        </g>
        <g v-if="behavior === 'sleep'" class="rc-zzz" fill="#d4e4be"><path d="M29 6h5v1h-1v1h-1v1h-1v1h3v1h-5V9h1V8h1V7h-2zM35 1h4v1h-1v1h-1v1h2v1h-4V4h1V3h1V2h-2z" /></g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.room-character { width: 72px; height: 72px; pointer-events: none; }
svg { display: block; width: 100%; height: 100%; }
.rc-body { animation: rc-bob 1s steps(1, end) infinite; }
.is-moving .rc-foot { animation: rc-step .6s steps(1, end) infinite; }
.is-moving .rc-foot-right { animation-delay: -.3s; }
.rc-eyes-open { animation: rc-blink-open 5s steps(1, end) infinite; }
.rc-eyes-closed { opacity: 0; animation: rc-blink-closed 5s steps(1, end) infinite; }
.is-brush .rc-brush { animation: rc-scrub .4s steps(1, end) infinite; }
.is-sleep .rc-body { animation: rc-breathe 4s steps(1, end) infinite; }
.is-sleep .rc-foot { animation: none; }
.is-sleep .rc-eyes-open { animation: none; opacity: 0; }
.is-sleep .rc-eyes-closed { animation: none; opacity: 1; }
.rc-zzz { animation: rc-dream 4s steps(1, end) infinite; }
@keyframes rc-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
@keyframes rc-step { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
@keyframes rc-blink-open { 0%, 94%, 100% { opacity: 1; } 95% { opacity: 0; } }
@keyframes rc-blink-closed { 0%, 94%, 100% { opacity: 0; } 95% { opacity: 1; } }
@keyframes rc-scrub { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(2px); } }
@keyframes rc-breathe { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(1px); } }
@keyframes rc-dream { 0%, 100% { opacity: .4; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .room-character * { animation: none !important; } }
</style>
