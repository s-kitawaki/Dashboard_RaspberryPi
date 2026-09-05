import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Dashboard from '../components/Dashboard.vue'
import { fixtureNow, ready, loading, failed, stale, sampleWeather, sampleForecast, sampleRate } from './fixtures'

const meta = {
  title: 'Dashboard/日々', component: Dashboard,
  args: { now: fixtureNow, weather: ready(sampleWeather), forecast: ready(sampleForecast), rate: ready(sampleRate) },
} satisfies Meta<typeof Dashboard>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Loading: Story = { args: { weather: loading(), forecast: loading(), rate: loading() } }
export const Unavailable: Story = { args: { weather: failed(), forecast: failed(), rate: failed() } }
export const IndependentFailure: Story = { args: { weather: failed() } }
export const StaleSnapshots: Story = { args: { weather: stale(sampleWeather), forecast: stale(sampleForecast), rate: stale(sampleRate) } }
export const WeekendQuote: Story = { args: { rate: stale({ ...sampleRate, as_of: '2026-09-04T20:59:00Z' }) } }
export const FailedRefresh: Story = { args: { weather: { ...stale(sampleWeather), error: '取得失敗' } } }
export const PartialForecast: Story = { args: { forecast: ready(sampleForecast.slice(0, 2)) } }
export const NegativeRate: Story = { args: { rate: ready({ ...sampleRate, exchange_diff: -0.42 }) } }
export const FlatRate: Story = { args: { rate: ready({ ...sampleRate, exchange_diff: 0 }) } }
export const UnknownProviderTime: Story = { args: { rate: stale({ ...sampleRate, as_of: null, exchange_diff: null }) } }
export const SixWeekCalendar: Story = { args: { now: new Date('2026-08-31T14:59:59Z') } }
export const JapanNewYear: Story = { args: { now: new Date('2026-12-31T15:00:00Z') } }
export const BrokenIcons: Story = { args: { weather: ready({ ...sampleWeather, icon: '' }), forecast: ready(sampleForecast.map(f => ({ ...f, icon: '' }))) } }
