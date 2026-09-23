<script setup lang="ts">
import type { ResourceState } from '../lib/api'
import { timeLabel } from '../lib/time'
withDefaults(defineProps<{ state: ResourceState<unknown>; label: string; quiet?: boolean }>(), { quiet: false })
defineEmits<{ retry: [] }>()
</script>

<template>
  <!-- quiet: show only loading, stale and error states; the routine "HH:MM 更新" line is omitted. -->
  <div class="data-status" :class="{ 'is-stale': state.stale, 'is-error': state.error && !state.data, 'is-quiet': quiet }" role="status" aria-live="polite">
    <span v-if="state.loading">{{ state.data ? '更新中…' : '読み込み中…' }}</span>
    <span v-else-if="state.stale">{{ state.error ? '更新できませんでした · 前回のデータを表示' : '前回のデータを表示' }}</span>
    <span v-else-if="state.error">{{ state.error }}</span>
    <span v-else-if="state.updatedAt && !quiet">{{ timeLabel(state.updatedAt) }} 更新</span>
    <span v-if="state.stale && state.updatedAt" class="last-success">最終取得 {{ timeLabel(state.updatedAt) }} JST</span>
    <v-btn v-if="state.error" size="small" :disabled="state.loading" :aria-label="`${label}を再試行`" @click="$emit('retry')">再試行</v-btn>
  </div>
</template>
