<script setup lang="ts">
import { computed } from 'vue'
import { mdiWaterOutline, mdiUmbrellaOutline, mdiWeatherPartlyCloudy, mdiArrowRight } from '@mdi/js'
import type { Weather, Forecast, Rate, ResourceState } from '../lib/api'
import { japanDate, weekdays } from '../lib/time'
import CalendarPanel from './CalendarPanel.vue'
import DataStatus from './DataStatus.vue'
import WeatherIcon from './WeatherIcon.vue'

defineOptions({ name: 'DailyDashboard' })
const props = defineProps<{ now: Date; weather: ResourceState<Weather>; forecast: ResourceState<Forecast[]>; rate: ResourceState<Rate> }>()
defineEmits<{ retryWeather: []; retryForecast: []; retryRate: [] }>()
const japan = computed(() => japanDate(props.now))
const slots = computed(() => Array.from({ length: 4 }, (_, i) => props.forecast.data?.[i] ?? null))
</script>

<template>
  <div class="dashboard">
    <main class="dashboard-grid">
      <v-card tag="section" class="panel clock-panel" aria-label="現在の日本時間">
        <div class="clock-center">
          <p class="clock-date">{{ japan.year }}年 {{ japan.month }}月{{ japan.day }}日 <span>{{ weekdays[japan.weekday] }}曜日</span></p>
          <time class="clock" :datetime="now.toISOString()" :aria-label="`日本時間 ${japan.hour}時${japan.minute}分${japan.second}秒`"><span>{{ japan.hour }}</span><span class="clock-colon">:</span><span>{{ japan.minute }}</span><span class="clock-seconds">{{ japan.second }}</span></time>
        </div>
      </v-card>

      <v-card tag="section" class="panel weather-panel" aria-labelledby="weather-heading" :aria-busy="weather.loading">
        <div class="panel-heading"><h2 id="weather-heading">現在の天気 <span class="english-label">WEATHER</span></h2></div>
        <template v-if="weather.data">
          <div class="current-weather"><div><p class="weather-condition">{{ weather.data.condition }}</p><p class="temperature">{{ weather.data.temperature }}<span>°C</span></p></div><WeatherIcon :src="weather.data.icon" :label="weather.data.condition" class="current-icon" /></div>
          <div class="weather-details"><span><v-icon :icon="mdiWaterOutline" size="18" /> 湿度</span><strong>{{ weather.data.humidity }}<small>%</small></strong></div>
        </template>
        <v-skeleton-loader v-else-if="weather.loading" type="article" class="widget-skeleton" aria-label="天気を読み込み中" />
        <div v-else class="empty-state"><v-icon :icon="mdiWeatherPartlyCloudy" size="42" /><p>天気を取得できませんでした</p><small>しばらくしてから、もう一度お試しください。</small></div>
        <DataStatus :state="weather" label="天気" @retry="$emit('retryWeather')" />
      </v-card>

      <CalendarPanel :now="now" />

      <div class="right-stack">
        <v-card tag="section" class="panel forecast-panel" aria-labelledby="forecast-heading" :aria-busy="forecast.loading">
          <div class="panel-heading"><h2 id="forecast-heading">これからの天気</h2></div>
          <div v-if="forecast.data" class="forecast-grid">
            <div v-for="(item, index) in slots" :key="index" class="forecast-slot">
              <template v-if="item"><time>{{ item.hour }}</time><WeatherIcon :src="item.icon" /><strong>{{ item.temp }}<small>°C</small></strong><span class="forecast-humidity"><v-icon :icon="mdiWaterOutline" size="14" /><span class="sr-only">湿度</span>{{ item.humidity }}%</span><span class="forecast-pop"><v-icon :icon="mdiUmbrellaOutline" size="14" /><span class="sr-only">降水確率</span>{{ item.pop }}%</span></template>
              <template v-else><span>—</span><span class="slot-missing">予報なし</span></template>
            </div>
          </div>
          <div v-else-if="forecast.loading" class="forecast-grid"><v-skeleton-loader v-for="i in 4" :key="i" type="text, avatar, text" aria-label="予報を読み込み中" /></div>
          <div v-else class="empty-state compact"><p>予報を取得できませんでした</p><small>次の更新までお待ちいただくか、再試行してください。</small></div>
          <DataStatus :state="forecast" label="予報" @retry="$emit('retryForecast')" />
        </v-card>

        <v-card tag="section" class="panel rate-panel" aria-labelledby="rate-heading" :aria-busy="rate.loading">
          <div class="panel-heading"><h2 id="rate-heading">為替レート <span class="english-label">EXCHANGE</span></h2></div>
          <template v-if="rate.data">
            <div class="rate-main"><div class="currency-pair"><div class="currency-symbols" aria-hidden="true"><span>$</span><span>¥</span></div><div><strong>USD <v-icon :icon="mdiArrowRight" size="14" /> JPY</strong><small>1 米ドル / 日本円</small></div></div><p class="rate-value">{{ rate.data.exchange_rate.toFixed(2) }}<small>円</small></p></div>
          </template>
          <v-skeleton-loader v-else-if="rate.loading" type="list-item-two-line" class="widget-skeleton" aria-label="為替を読み込み中" />
          <div v-else class="empty-state compact"><p>為替レートを取得できませんでした</p></div>
          <DataStatus v-if="rate.error" :state="rate" label="為替" @retry="$emit('retryRate')" />
        </v-card>
      </div>
    </main>
  </div>
</template>
