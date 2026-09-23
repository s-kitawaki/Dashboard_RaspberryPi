<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ROOM_PHASES, PHASE_LABELS, type RoomPhase } from '../lib/room'
import { SCENE_WIDTH, SCENE_HEIGHT, drawScene } from '../lib/roomScenes'

defineOptions({ name: 'RoomBackground' })
defineProps<{ phase: RoomPhase }>()
const canvases = ref<HTMLCanvasElement[]>([])
// All five scenes are drawn once (256x150 each) so a phase change is a CSS cross-fade, not a redraw.
onMounted(() => { canvases.value.forEach((canvas, index) => drawScene(canvas, ROOM_PHASES[index]!)) })
</script>

<template>
  <div class="room-background" :data-phase="phase" role="img" :aria-label="PHASE_LABELS[phase]">
    <canvas v-for="scene in ROOM_PHASES" :key="scene" ref="canvases" :width="SCENE_WIDTH" :height="SCENE_HEIGHT"
      class="room-scene" :class="{ 'is-active': scene === phase }" :data-scene="scene" aria-hidden="true" />
  </div>
</template>

<style scoped>
.room-background { position: fixed; inset: 0; z-index: 0; overflow: hidden; background: #101719; pointer-events: none; }
.room-scene { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 1s linear; image-rendering: pixelated; image-rendering: crisp-edges; }
.room-scene.is-active { opacity: 1; }
@media (prefers-reduced-motion: reduce) { .room-scene { transition: none; } }
</style>
