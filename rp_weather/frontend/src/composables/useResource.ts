import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { getData, PublicApiError, type ResourceState } from '../lib/api'

export const REFRESH_MS = 60 * 60 * 1000
export const STALE_MS = 90 * 60 * 1000
export const TIMEOUT_MS = 20_000

export function useResource<T>(url: string, parse: (value: unknown) => T, providerTime?: (value: T) => string | null) {
  const data = shallowRef<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const updatedAt = ref<number | null>(null)
  const now = ref(Date.now())
  const sourceStale = ref(false)
  const snapshotAt = ref<number | null>(null)
  let disposed = false
  let controller: AbortController | undefined
  let refreshTimer: ReturnType<typeof setInterval> | undefined
  let ageTimer: ReturnType<typeof setInterval> | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined

  const state = computed<ResourceState<T>>(() => ({
    data: data.value, loading: loading.value, error: error.value, updatedAt: updatedAt.value,
    stale: data.value !== null && (!!error.value || sourceStale.value ||
      (snapshotAt.value !== null && now.value - snapshotAt.value >= STALE_MS) ||
      (updatedAt.value !== null && now.value - updatedAt.value >= STALE_MS) ||
      (providerTime !== undefined && isOldProviderTime(providerTime(data.value), now.value))),
  }))

  async function refresh() {
    if (loading.value || disposed) return
    loading.value = true
    controller = new AbortController()
    timeout = setTimeout(() => controller?.abort(), TIMEOUT_MS)
    try {
      const next = await getData(url, parse, controller.signal)
      if (disposed) return
      data.value = next.data
      sourceStale.value = next.stale
      snapshotAt.value = next.timestamp
      updatedAt.value = Date.now()
      now.value = Date.now()
      error.value = null
    } catch (cause) {
      if (!disposed) error.value = cause instanceof PublicApiError ? cause.message : 'データを取得できませんでした'
    } finally {
      clearTimeout(timeout)
      if (!disposed) loading.value = false
    }
  }

  function onVisible() {
    now.value = Date.now()
    if (document.visibilityState === 'visible' && (updatedAt.value === null || now.value - updatedAt.value >= REFRESH_MS)) void refresh()
  }
  onMounted(() => {
    void refresh()
    refreshTimer = setInterval(() => void refresh(), REFRESH_MS)
    ageTimer = setInterval(() => { now.value = Date.now() }, 15_000)
    document.addEventListener('visibilitychange', onVisible)
  })
  onUnmounted(() => {
    disposed = true
    controller?.abort()
    clearTimeout(timeout)
    clearInterval(refreshTimer)
    clearInterval(ageTimer)
    document.removeEventListener('visibilitychange', onVisible)
  })
  return { state, refresh }
}

export function isOldProviderTime(value: string | null, now: number): boolean {
  if (!value || !/(Z|[+-]\d{2}:?\d{2})$/i.test(value)) return true
  const time = Date.parse(value)
  return !Number.isFinite(time) || now - time >= STALE_MS
}
