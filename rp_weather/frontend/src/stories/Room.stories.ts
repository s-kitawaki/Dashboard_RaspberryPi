import type { Meta, StoryObj } from '@storybook/vue3-vite'
import RoomStage from '../components/RoomStage.vue'

const meta = {
  title: 'Dashboard/おへや', component: RoomStage,
  args: { phase: 'day', animated: true, residents: ['kuchipatchi', 'ichigotchi'], now: new Date('2026-09-05T03:00:00Z') },
  argTypes: { phase: { control: 'select', options: ['morning', 'day', 'evening', 'night', 'bedroom'] } },
  parameters: { layout: 'centered' },
  decorators: [() => ({ template: '<div style="width: 452px; height: 236px; display: flex; background: #e8fff5"><story /></div>' })],
} satisfies Meta<typeof RoomStage>
export default meta
type Story = StoryObj<typeof meta>
export const Morning: Story = { args: { phase: 'morning' } }
export const Day: Story = {}
export const Evening: Story = { args: { phase: 'evening' } }
export const Night: Story = { args: { phase: 'night' } }
export const Bedroom: Story = { args: { phase: 'bedroom' } }
export const Still: Story = { args: { animated: false } }
export const FullHouse: Story = { args: { residents: ['kuchipatchi', 'ichigotchi', 'mametchi', 'furawatchi'] } }
