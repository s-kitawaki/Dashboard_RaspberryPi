import { createApp } from 'vue'
import App from './App.vue'
import { makeVuetify } from './plugins/vuetify'
// Bundled pixel font: no request to Google Fonts, so the kiosk renders the same offline.
import '@fontsource/dotgothic16'
import './style.css'

createApp(App).use(makeVuetify()).mount('#app')
