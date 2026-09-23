<script setup lang="ts">
import { computed } from 'vue'
import { FEET, SHADOW, SPRITES, SPRITE_SIZE, ZZZ_PATH, rectsToPath, type SpriteName } from '../lib/sprites'

defineOptions({ name: 'TamaSprite' })
const props = withDefaults(defineProps<{ name: SpriteName; facing?: 'left' | 'right'; moving?: boolean; sleeping?: boolean }>(), { facing: 'right', moving: false, sleeping: false })
const sprite = computed(() => SPRITES[props.name])
const state = computed(() => props.sleeping ? 'おやすみ中' : props.moving ? 'お散歩中' : '足踏み中')
const feetOutline = rectsToPath([...FEET.left.outline, ...FEET.right.outline])
const shadow = rectsToPath(SHADOW)
</script>

<template>
  <!-- Shared pixel sprite: rectangles from sprites.ts, with the same stepping, blinking and sleeping motion for every character. -->
  <div class="tama-sprite" :class="{ 'is-sleeping': sleeping, 'is-moving': moving }" :data-sprite="name" role="img" :aria-label="`${sprite.label}：${state}`">
    <svg :viewBox="`0 0 ${SPRITE_SIZE} ${SPRITE_SIZE}`" shape-rendering="crispEdges" aria-hidden="true">
      <path fill="#10201d" opacity=".35" :d="shadow" />
      <g :transform="facing === 'left' ? `translate(${SPRITE_SIZE} 0) scale(-1 1)` : undefined">
        <g class="ts-foot ts-foot-left"><path :fill="sprite.feet.outline" :d="rectsToPath(FEET.left.outline)" /><path :fill="sprite.feet.fill" :d="rectsToPath(FEET.left.fill)" /></g>
        <g class="ts-foot ts-foot-right"><path :fill="sprite.feet.outline" :d="rectsToPath(FEET.right.outline)" /><path :fill="sprite.feet.fill" :d="rectsToPath(FEET.right.fill)" /></g>
        <g class="ts-body">
          <path v-for="(layer, index) in sprite.body" :key="index" :fill="layer.fill" :d="rectsToPath(layer.rects)" />
          <g class="ts-eyes-open"><path v-for="(layer, index) in sprite.eyesOpen" :key="index" :fill="layer.fill" :d="rectsToPath(layer.rects)" /></g>
          <g class="ts-eyes-closed"><path v-for="(layer, index) in sprite.eyesClosed" :key="index" :fill="layer.fill" :d="rectsToPath(layer.rects)" /></g>
        </g>
        <path v-if="sleeping" class="ts-zzz" :fill="sprite.zzz" :d="ZZZ_PATH" />
      </g>
      <path v-if="false" :d="feetOutline" />
    </svg>
  </div>
</template>

<style scoped>
.tama-sprite { width: 80px; height: 80px; pointer-events: none; }
svg { display: block; width: 100%; height: 100%; }
.ts-body { animation: ts-bob 1s steps(1, end) infinite; }
.ts-foot { animation: ts-step 1s steps(1, end) infinite; }
.ts-foot-right { animation-delay: -.5s; }
.is-moving .ts-foot { animation-duration: .6s; }
.is-moving .ts-foot-right { animation-delay: -.3s; }
.ts-eyes-open { animation: ts-blink-open 6s steps(1, end) infinite; }
.ts-eyes-closed { opacity: 0; animation: ts-blink-closed 6s steps(1, end) infinite; }
.is-sleeping .ts-body { animation: ts-breathe 4s steps(1, end) infinite; }
.is-sleeping .ts-foot { animation: none; }
.is-sleeping .ts-eyes-open { animation: none; opacity: 0; }
.is-sleeping .ts-eyes-closed { animation: none; opacity: 1; }
.ts-zzz { animation: ts-dream 4s steps(1, end) infinite; }
@keyframes ts-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
@keyframes ts-step { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
@keyframes ts-blink-open { 0%, 96%, 100% { opacity: 1; } 97% { opacity: 0; } }
@keyframes ts-blink-closed { 0%, 96%, 100% { opacity: 0; } 97% { opacity: 1; } }
@keyframes ts-breathe { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(1px); } }
@keyframes ts-dream { 0%, 100% { opacity: .4; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .tama-sprite * { animation: none !important; } }
</style>
