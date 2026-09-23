import type { Meta, StoryObj } from '@storybook/vue3-vite'
import TamaSprite from '../components/TamaSprite.vue'
import { SPRITE_NAMES } from '../lib/sprites'

const meta = {
  title: 'Dashboard/キャラクター', component: TamaSprite,
  args: { name: 'mametchi', facing: 'right', moving: false, sleeping: false },
  argTypes: { name: { control: 'select', options: SPRITE_NAMES }, facing: { control: 'select', options: ['left', 'right'] } },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof TamaSprite>
export default meta
type Story = StoryObj<typeof meta>
export const Single: Story = {}
export const Walking: Story = { args: { moving: true } }
export const Sleeping: Story = { args: { sleeping: true } }
/** All seven characters side by side, awake and asleep. */
export const Gallery: Story = {
  render: () => ({
    components: { TamaSprite },
    setup: () => ({ names: SPRITE_NAMES }),
    template: `<div style="display: grid; grid-template-columns: repeat(7, 96px); gap: 12px; padding: 16px; background: #e8fff5">
      <TamaSprite v-for="n in names" :key="n" :name="n" moving />
      <TamaSprite v-for="n in names" :key="n + '-sleep'" :name="n" sleeping />
    </div>`,
  }),
}
