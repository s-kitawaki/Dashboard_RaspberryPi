<script setup lang="ts">
import { computed } from 'vue'
import { calendarWeeks, japanDate, weekdays } from '../lib/time'
const props = defineProps<{ now: Date }>()
const today = computed(() => japanDate(props.now))
const shown = computed(() => ({ year: today.value.year, month: today.value.month }))
const weeks = computed(() => calendarWeeks(shown.value.year, shown.value.month))
function isToday(day: number | null) { return day === today.value.day }
</script>

<template>
  <v-card tag="section" class="panel calendar-panel" aria-label="カレンダー">
    <div class="calendar-toolbar">
      <h3>{{ shown.year }}<span>年</span> {{ String(shown.month).padStart(2, '0') }}<span>月</span></h3>
    </div>
    <table class="calendar-table" :aria-label="`${shown.year}年${shown.month}月のカレンダー`">
      <thead><tr><th v-for="day in weekdays" :key="day" scope="col">{{ day }}</th></tr></thead>
      <tbody><tr v-for="(week, index) in weeks" :key="index">
        <td v-for="(day, column) in week" :key="column" :aria-current="isToday(day) ? 'date' : undefined"><span :class="{ today: isToday(day) }">{{ day }}</span></td>
      </tr></tbody>
    </table>
  </v-card>
</template>
