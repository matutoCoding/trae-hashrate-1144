import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

import App from './App.vue'
import router from './router'
import { useBookingStore } from './stores/booking'
import { useWaitlistStore } from './stores/waitlist'
import './styles/global.scss'

dayjs.locale('zh-cn')

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.config.globalProperties.$dayjs = dayjs

const bookingStore = useBookingStore()
const waitlistStore = useWaitlistStore()
bookingStore.startAutoReleaseCheck()
waitlistStore.startWaitlistExpireCheck()

app.mount('#app')
