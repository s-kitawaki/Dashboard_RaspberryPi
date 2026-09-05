import { createApp } from 'vue'
import App from './App.vue'
import { makeVuetify } from './plugins/vuetify'
import './style.css'

createApp(App).use(makeVuetify()).mount('#app')
