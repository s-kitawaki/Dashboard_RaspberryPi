import { setup, type Preview } from '@storybook/vue3-vite'
import { makeVuetify } from '../src/plugins/vuetify'
import '../src/style.css'

setup(app => app.use(makeVuetify()))
const preview: Preview = {
  decorators: [() => ({ template: '<v-app><v-main><story /></v-main></v-app>' })],
  parameters: { layout: 'fullscreen', controls: { expanded: true } },
}
export default preview
