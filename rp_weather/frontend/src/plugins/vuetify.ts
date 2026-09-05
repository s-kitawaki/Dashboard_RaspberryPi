import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { VApp, VMain, VCard, VBtn, VIcon, VChip, VSkeletonLoader } from 'vuetify/components'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'

export function makeVuetify() {
  return createVuetify({
    components: { VApp, VMain, VCard, VBtn, VIcon, VChip, VSkeletonLoader },
    icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
    theme: {
      defaultTheme: 'dailyDark',
      themes: {
        dailyDark: {
          dark: true,
          colors: { background: '#101719', surface: '#1a2326', primary: '#b6d5bb', secondary: '#b3cddd', error: '#ffb4ab', warning: '#efd29b', 'on-surface': '#edf1ec' },
        },
      },
    },
    defaults: { VCard: { elevation: 0, rounded: 'xl' }, VBtn: { rounded: 'pill', variant: 'text' } },
  })
}
