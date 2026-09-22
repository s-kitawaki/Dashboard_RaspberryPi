import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Kuchipatchi from '../components/Kuchipatchi.vue'

const meta = {
  title: 'Dashboard/くちぱっち', component: Kuchipatchi,
  args: { now: new Date('2026-09-05T01:00:00Z') },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Kuchipatchi>
export default meta
type Story = StoryObj<typeof meta>
export const Awake: Story = {}
export const Sleeping: Story = { args: { now: new Date('2026-09-05T13:00:00Z') } }

export const Left: Story = { args: { facing: 'left' } }
export const Right: Story = { args: { facing: 'right' } }
export const SleepingSide: Story = { args: { facing: 'right', now: new Date('2026-09-05T13:00:00Z') } }

export const Walking: Story = {
  args: { walking: true },
  decorators: [() => ({ template: '<div style="width: 280px; display: flex"><story /></div>' })],
}
