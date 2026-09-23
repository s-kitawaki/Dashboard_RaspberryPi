import { test, expect, type Page } from '@playwright/test'
import { fixtureNow, sampleWeather, sampleForecast, sampleRate } from '../src/stories/fixtures'
import { dailyRailWalkers } from '../src/lib/lottery'

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
  await expect(page.locator('.forecast-slot')).toHaveCount(3)
  await expect(page.locator('.dashboard')).toHaveAttribute('data-phase', 'morning')
  await expect(page.locator('.room-scene.is-active')).toHaveAttribute('data-scene', 'morning')
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
  await expect(page.locator('.forecast-slot')).toHaveCount(3)
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
  await expect(page.locator('.weather-panel .data-status.is-stale')).toHaveCount(0)
  await expect(page.locator('.weather-panel')).not.toContainText('更新')
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

test('keeps three slots for partial forecasts and shows the current month calendar', async ({ page }) => {
  await mockApis(page, { partial: true })
  await page.goto('/')
  await expect(page.locator('.forecast-slot')).toHaveCount(3)
  await expect(page.getByText('予報なし')).toHaveCount(1)
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
  await expect(page.locator('.v-skeleton-loader')).toHaveCount(5)
  await expect(page.getByRole('button', { name: 'すべてのデータを更新' })).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('loading.png'), fullPage: true })
})

test('keeps kuchipatchi in the room, off the clock, and switches sleep at JST boundaries', async ({ page }, testInfo) => {
  await mockApis(page)
  await page.goto('/')
  await expect(page.locator('.clock-face .kuchipatchi')).toHaveCount(0)
  const pet = page.locator('.room-stage .kuchipatchi')
  const strawberry = page.locator('.room-stage [data-sprite="ichigotchi"]')
  await expect(pet).toBeVisible()
  await expect(strawberry).toBeVisible()
  await expect(pet).toHaveAttribute('aria-label', 'くちぱっち：足踏み中')
  const stageBox = (await page.locator('.room-stage').boundingBox())!
  for (const resident of [pet, strawberry]) {
    const box = (await resident.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(stageBox.x - 1)
    expect(box.x + box.width).toBeLessThanOrEqual(stageBox.x + stageBox.width + 1)
    expect(box.y + box.height).toBeLessThanOrEqual(stageBox.y + stageBox.height + 1)
  }
  await page.clock.setSystemTime(new Date('2026-09-05T11:59:58Z'))
  await page.clock.runFor(1000)
  await expect(pet).toHaveAttribute('aria-label', 'くちぱっち：足踏み中')
  await page.clock.runFor(1000)
  await expect(pet).toHaveAttribute('aria-label', 'くちぱっち：おやすみ中')
  await expect(strawberry).toHaveAttribute('aria-label', 'いちごっち：おやすみ中')
  await page.screenshot({ path: testInfo.outputPath('sleeping.png'), fullPage: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(pet.locator('.pet-body')).toHaveCSS('animation-name', 'none')
  await expect(pet.locator('.pet-eyes-closed')).toHaveCSS('opacity', '1')
  await expect(strawberry.locator('.ts-eyes-closed')).toHaveCSS('opacity', '1')
  await page.clock.setSystemTime(new Date('2026-09-05T20:59:58Z'))
  await page.clock.runFor(1000)
  await expect(pet).toHaveAttribute('aria-label', 'くちぱっち：おやすみ中')
  await page.clock.runFor(1000)
  await expect(pet).toHaveAttribute('aria-label', 'くちぱっち：足踏み中')
  await expect(strawberry).toHaveAttribute('aria-label', /いちごっち：(足踏み中|お散歩中)/)
  await expect(pet.locator('.pet-eyes-open')).toHaveCSS('opacity', '1')
})


test('two daily characters walk the seam, jump the column gap and wrap from the right edge', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'the seam only exists in the two-column layout')
  await mockApis(page)
  await page.goto('/')
  const runners = page.locator('.rail-runner')
  await expect(runners).toHaveCount(2)
  const expected = dailyRailWalkers(fixtureNow)
  await expect(runners.nth(0)).toHaveAttribute('data-sprite', expected[0]!)
  await expect(runners.nth(1)).toHaveAttribute('data-sprite', expected[1]!)
  expect(expected[0]).not.toBe(expected[1])
  const grid = (await page.locator('.dashboard-grid').boundingBox())!
  const calendar = (await page.locator('.calendar-panel').boundingBox())!
  const rate = (await page.locator('.rate-panel').boundingBox())!
  const gapStart = calendar.x + calendar.width, gapEnd = rate.x
  const runner = runners.nth(0)
  let previous = -Infinity, jumpedGap = false, wrapped = false, walkedOnGround = 0
  for (let i = 0; i < 220 && !wrapped; i++) {
    await page.clock.runFor(200)
    const box = (await runner.boundingBox())!
    const jumping = (await runner.getAttribute('data-jumping')) === 'true'
    const center = box.x + box.width / 2
    if (jumping) {
      if (center > gapStart - 60 && center < gapEnd + 60) jumpedGap = true
      expect(box.y + box.height - 6).toBeLessThan(calendar.y + 1)
    } else {
      expect(Math.abs(box.y + box.height - 6 - calendar.y)).toBeLessThan(2)
      expect(center < gapStart - 1 || center > gapEnd + 1).toBe(true)
      walkedOnGround++
    }
    if (box.x < previous - 200) wrapped = true
    else expect(box.x).toBeGreaterThanOrEqual(previous - .5)
    expect(box.x + box.width).toBeLessThanOrEqual(grid.x + grid.width + box.width)
    previous = box.x
  }
  expect(walkedOnGround).toBeGreaterThan(20)
  expect(jumpedGap).toBe(true)
  expect(wrapped).toBe(true)
  // The two runners never share the same spot.
  const a = (await runners.nth(0).boundingBox())!, b = (await runners.nth(1).boundingBox())!
  expect(Math.abs(a.x - b.x)).toBeGreaterThan(40)
  await page.clock.setSystemTime(new Date('2026-09-05T12:00:00Z'))
  await page.clock.runFor(1000)
  const frozen = (await runner.boundingBox())!.x
  await page.clock.runFor(2000)
  expect((await runner.boundingBox())!.x).toBe(frozen)
  await expect(runner.locator('.tama-sprite')).toHaveAttribute('aria-label', /おやすみ中/)
})

test('redraws the seam characters when the Japan-time date changes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'the seam only exists in the two-column layout')
  await mockApis(page)
  await page.goto('/')
  const runners = page.locator('.rail-runner')
  const today = dailyRailWalkers(fixtureNow)
  await expect(runners.nth(0)).toHaveAttribute('data-sprite', today[0]!)
  // Find the next day whose draw differs, so the change is observable.
  let next = new Date('2026-09-05T15:00:00Z')
  while (dailyRailWalkers(next).join() === today.join()) next = new Date(next.getTime() + 86_400_000)
  await page.clock.setSystemTime(next)
  await page.clock.runFor(1000)
  const drawn = dailyRailWalkers(next)
  await expect(runners.nth(0)).toHaveAttribute('data-sprite', drawn[0]!)
  await expect(runners.nth(1)).toHaveAttribute('data-sprite', drawn[1]!)
})

test('switches the room and panel palette at the JST time bands', async ({ page }, testInfo) => {
  await mockApis(page)
  await page.goto('/')
  const bands: [string, string, string][] = [
    ['2026-09-04T21:00:00Z', 'morning', 'brush'],   // 06:00 JST
    ['2026-09-05T01:59:58Z', 'morning', 'brush'],   // 10:59:59 JST after the 1 s tick
    ['2026-09-05T02:00:00Z', 'day', 'walk'],        // 11:00 JST
    ['2026-09-05T05:00:00Z', 'evening', 'walk'],    // 14:00 JST
    ['2026-09-05T08:00:00Z', 'night', 'walk'],      // 17:00 JST
    ['2026-09-05T12:00:00Z', 'bedroom', 'sleep'],   // 21:00 JST
    ['2026-09-05T20:59:58Z', 'bedroom', 'sleep'],   // 05:59:59 JST after the 1 s tick
  ]
  for (const [time, phase, behavior] of bands) {
    await page.clock.setSystemTime(new Date(time))
    await page.clock.runFor(1000)
    await expect(page.locator('.dashboard')).toHaveAttribute('data-phase', phase)
    await expect(page.locator('.room-scene.is-active')).toHaveAttribute('data-scene', phase)
    await expect(page.locator('.room-stage')).toHaveAttribute('data-behavior', behavior)
    await expect(page.locator('.room-scene.is-active')).toHaveCSS('opacity', '1')
    await page.screenshot({ path: testInfo.outputPath(`room-${phase}.png`), fullPage: true })
  }
  await expect(page.locator('.room-scene:not(.is-active)').first()).toHaveCSS('opacity', '0')
  await expect(page.locator('.room-stage [data-sprite="ichigotchi"]')).toHaveAttribute('aria-label', /おやすみ中/)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.room-scene.is-active')).toHaveCSS('transition-property', 'none')
})

test('the room resident walks inside the stage and rests between destinations', async ({ page }) => {
  await mockApis(page)
  await page.goto('/')
  await page.clock.setSystemTime(new Date('2026-09-05T03:00:00Z')) // 12:00 JST, a walking phase
  await page.clock.runFor(1500)
  const stage = page.locator('.room-stage')
  const resident = page.locator('.room-stage [data-sprite="ichigotchi"]')
  await expect(stage).toHaveAttribute('data-behavior', 'walk')
  await expect(resident).toHaveAttribute('aria-label', /いちごっち：(お散歩中|足踏み中)/)
  const stageBox = (await stage.boundingBox())!
  const positions: { x: number; y: number }[] = []
  for (let i = 0; i < 12; i++) {
    await page.clock.runFor(500)
    const box = (await resident.boundingBox())!
    positions.push({ x: box.x + box.width / 2, y: box.y + box.height })
    expect(box.x).toBeGreaterThanOrEqual(stageBox.x - 1)
    expect(box.x + box.width).toBeLessThanOrEqual(stageBox.x + stageBox.width + 1)
    expect(box.y + box.height).toBeLessThanOrEqual(stageBox.y + stageBox.height + 1)
    expect(box.y + box.height).toBeGreaterThanOrEqual(stageBox.y + stageBox.height * 0.5)
  }
  const distinct = new Set(positions.map(p => `${Math.round(p.x)},${Math.round(p.y)}`))
  expect(distinct.size).toBeGreaterThan(1)
})

test('shows no scrollbar on a desktop window where everything fits', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1100 })
  await mockApis(page)
  await page.goto('/')
  await expect(page.locator('.rate-value')).toHaveText('147.82円')
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).toBe('auto')
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)
  expect(await page.evaluate(() => innerWidth - document.documentElement.clientWidth)).toBe(0)
})
