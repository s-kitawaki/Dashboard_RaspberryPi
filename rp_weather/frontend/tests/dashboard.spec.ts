import { test, expect, type Page } from '@playwright/test'
import { fixtureNow, sampleWeather, sampleForecast, sampleRate } from '../src/stories/fixtures'

async function mockApis(page: Page, options: { failWeather?: boolean; stale?: boolean; weekend?: boolean; partial?: boolean; delayWeather?: boolean } = {}) {
  await page.clock.install({ time: fixtureNow })
  await page.clock.pauseAt(fixtureNow)
  const calls: Record<string, number> = {}
  await page.route('**/api/**', async route => {
    const endpoint = new URL(route.request().url()).pathname
    calls[endpoint] = (calls[endpoint] ?? 0) + 1
    if (endpoint === '/api/weather' && options.delayWeather) return route.abort('timedout')
    if (endpoint === '/api/weather' && options.failWeather) return route.fulfill({ status: 503, json: { status: 'error', message: 'データの準備中です' } })
    const data = endpoint === '/api/weather' ? sampleWeather : endpoint === '/api/forecast' ? options.partial ? sampleForecast.slice(0, 2) : sampleForecast : { ...sampleRate, as_of: options.weekend ? '2026-09-04T20:59:00Z' : sampleRate.as_of, entry_price: 'PRIVATE_SENTINEL' }
    await route.fulfill({ json: { status: 'success', data, timestamp: fixtureNow.toISOString(), stale: options.stale ?? false } })
  })
  return calls
}

test('renders the actual Vuetify dashboard without overflow or private fields', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const calls = await mockApis(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '現在の天気' })).toBeVisible()
  await expect(page.locator('.temperature')).toHaveText('28°C')
  await expect(page.locator('.rate-value')).toHaveText('147.82円')
  await expect(page.locator('.forecast-slot')).toHaveCount(4)
  await expect(page.locator('.clock')).toHaveAttribute('aria-label', '日本時間 10時24分36秒')
  await expect(page.locator('body')).not.toContainText('PRIVATE_SENTINEL')
  await expect(page.locator('[aria-current="date"]')).toHaveText('5')
  await expect(page.locator('.v-application')).toHaveCSS('color-scheme', 'dark')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (testInfo.project.name === 'raspberry-pi') expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true })
  expect(errors).toEqual([])
  expect(calls).toEqual({ '/api/weather': 1, '/api/forecast': 1, '/api/rate': 1 })
})

test('keeps the desktop dashboard at the Raspberry Pi display height on a tall viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1000 })
  await mockApis(page)
  await page.goto('/')
  const grid = await page.locator('.dashboard-grid').boundingBox()
  expect(grid?.height).toBeLessThanOrEqual(540)
})

test('isolates 503 failures and allows a successful retry', async ({ page }, testInfo) => {
  const options = { failWeather: true }
  await mockApis(page, options)
  await page.goto('/')
  await expect(page.getByText('天気を取得できませんでした')).toBeVisible()
  await expect(page.locator('.rate-value')).toHaveText('147.82円')
  await expect(page.locator('.forecast-slot')).toHaveCount(4)
  await page.screenshot({ path: testInfo.outputPath('independent-error.png'), fullPage: true })
  options.failWeather = false
  await page.getByRole('button', { name: '天気を再試行' }).click()
  await expect(page.locator('.temperature')).toHaveText('28°C')
})

test('shows stale snapshots and old weekend provider time', async ({ page }, testInfo) => {
  await mockApis(page, { stale: true, weekend: true })
  await page.goto('/')
  await expect(page.locator('.rate-meta')).toHaveCount(0)
  await expect(page.locator('.data-status.is-stale')).toHaveCount(2)
  await page.screenshot({ path: testInfo.outputPath('stale.png'), fullPage: true })
})

test('does not display provider metadata in the rate panel', async ({ page }) => {
  await mockApis(page, { weekend: true })
  await page.goto('/')
  await expect(page.locator('.rate-panel .data-status')).toHaveCount(0)
  await expect(page.getByText('9/5 05:59 JST')).toHaveCount(0)
  await expect(page.locator('.weather-panel .data-status')).not.toHaveClass(/is-stale/)
})

test('refreshes hourly, retains stale data on error and rolls the calendar at JST midnight', async ({ page }) => {
  const options = { failWeather: false }
  const calls = await mockApis(page, options)
  await page.goto('/')
  await expect(page.locator('.temperature')).toHaveText('28°C')
  options.failWeather = true
  await page.clock.fastForward(3_600_000)
  await expect(page.locator('.weather-panel .is-stale')).toContainText('更新できませんでした')
  await expect(page.locator('.temperature')).toHaveText('28°C')
  expect(calls['/api/weather']).toBe(2)
  expect(calls['/api/forecast']).toBe(2)
  expect(calls['/api/rate']).toBe(2)
  await page.clock.setSystemTime(new Date('2026-09-30T14:59:59Z'))
  await page.clock.runFor(1000)
  await expect(page.locator('.clock-date')).toContainText('10月1日')
  await expect(page.locator('.calendar-toolbar')).toContainText('10月')
})

test('keeps four slots for partial forecasts and shows the current month calendar', async ({ page }) => {
  await mockApis(page, { partial: true })
  await page.goto('/')
  await expect(page.locator('.forecast-slot')).toHaveCount(4)
  await expect(page.getByText('予報なし')).toHaveCount(2)
  await expect(page.locator('.calendar-toolbar')).toContainText('09月')
  await expect(page.locator('.calendar-table tbody tr')).toHaveCount(5)
  await expect(page.locator('[aria-current="date"]')).toHaveText('5')
  await expect(page.locator('.calendar-panel button')).toHaveCount(0)
})

test('displays skeletons while requests are pending', async ({ page }, testInfo) => {
  await page.clock.install({ time: fixtureNow })
  await page.clock.pauseAt(fixtureNow)
  await page.route('**/api/**', () => {})
  await page.goto('/')
  await expect(page.locator('.v-skeleton-loader')).toHaveCount(6)
  await expect(page.getByRole('button', { name: 'すべてのデータを更新' })).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('loading.png'), fullPage: true })
})
