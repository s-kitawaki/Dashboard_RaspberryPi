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

export const SleepingKuchipatchi: Story = { args: { now: new Date('2026-09-05T13:00:00Z') } }

// Room phases (JST): 6-10 morning, 11-13 day, 14-16 evening, 17-20 night, 21-5 bedroom.
export const MorningRoom: Story = { args: { now: new Date('2026-09-04T23:30:00Z') } }
export const DayRoom: Story = { args: { now: new Date('2026-09-05T03:15:00Z') } }
export const EveningRoom: Story = { args: { now: new Date('2026-09-05T06:40:00Z') } }
export const NightRoom: Story = { args: { now: new Date('2026-09-05T10:20:00Z') } }
export const BedroomRoom: Story = { args: { now: new Date('2026-09-05T13:40:00Z') } }
export const StillRoom: Story = { args: { roomAnimated: false, petWalking: false, petFacing: 'front' } }

export const LeftKuchipatchi: Story = { args: { petFacing: 'left' } }
export const RightKuchipatchi: Story = { args: { petFacing: 'right' } }

export const FrontKuchipatchi: Story = { args: { petWalking: false, petFacing: 'front' } }
