import type { Meta, StoryObj } from '@storybook/vue3-vite'
import CalendarPanel from '../components/CalendarPanel.vue'
const meta = {
  title: 'Components/Calendar', component: CalendarPanel,
  args: { now: new Date('2026-09-05T01:24:36Z') },
  decorators: [() => ({ template: '<div style="max-width:600px;padding:24px"><story /></div>' })],
} satisfies Meta<typeof CalendarPanel>
export default meta
type Story = StoryObj<typeof meta>
export const CurrentMonth: Story = {}
export const LeapYear: Story = { args: { now: new Date('2028-02-29T03:00:00Z') } }
export const SixWeeks: Story = { args: { now: new Date('2026-08-01T03:00:00Z') } }
