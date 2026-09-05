<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { mdiWeatherCloudy } from '@mdi/js'
const props = defineProps<{ src: string; label?: string }>()
const failed = ref(false)
watch(() => props.src, () => { failed.value = false })
const safeSource = computed(() => {
  if (props.src.startsWith('data:image/svg+xml,')) return props.src
  try {
    const url = new URL(props.src)
    return url.protocol === 'https:' ? url.href : ''
  } catch { return '' }
})
</script>

<template>
  <span class="weather-icon">
    <img v-if="safeSource && !failed" :src="safeSource" :alt="label || '天気'" width="100" height="100" @error="failed = true" />
    <v-icon v-else :icon="mdiWeatherCloudy" size="inherit" :aria-label="label || '天気アイコンなし'" role="img" />
  </span>
</template>
