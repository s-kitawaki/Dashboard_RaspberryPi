<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import Dashboard from './components/Dashboard.vue'
import { useResource } from './composables/useResource'
import { parseWeather, parseForecast, parseRate } from './lib/api'

const weather = useResource('/api/weather', parseWeather)
const forecast = useResource('/api/forecast', parseForecast)
const rate = useResource('/api/rate', parseRate, data => data.as_of)
const now = ref(new Date())
let clock: ReturnType<typeof setInterval> | undefined
onMounted(() => { clock = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => clearInterval(clock))
</script>

<template>
  <v-app>
    <v-main>
      <Dashboard :now="now" :weather="weather.state.value" :forecast="forecast.state.value" :rate="rate.state.value"
        @retry-weather="weather.refresh" @retry-forecast="forecast.refresh" @retry-rate="rate.refresh" />
    </v-main>
  </v-app>
</template>
