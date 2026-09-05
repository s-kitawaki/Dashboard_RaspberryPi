<script setup lang="ts">
import type { ResourceState } from '../lib/api'
import { timeLabel } from '../lib/time'
defineProps<{ state: ResourceState<unknown>; label: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="data-status" :class="{ 'is-stale': state.stale, 'is-error': state.error && !state.data }" role="status" aria-live="polite">
    <span v-if="state.loading">{{ state.data ? '更新中…' : '読み込み中…' }}</span>
    <span v-else-if="state.stale">{{ state.error ? '更新できませんでした · 前回のデータを表示' : '前回のデータを表示' }}</span>
    <span v-else-if="state.error">{{ state.error }}</span>
    <span v-else-if="state.updatedAt">{{ timeLabel(state.updatedAt) }} 更新</span>
    <span v-if="state.stale && state.updatedAt" class="last-success">最終取得 {{ timeLabel(state.updatedAt) }} JST</span>
    <v-btn v-if="state.error" size="small" :disabled="state.loading" :aria-label="`${label}を再試行`" @click="$emit('retry')">再試行</v-btn>
  </div>
</template>
