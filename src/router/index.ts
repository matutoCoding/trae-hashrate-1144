import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/schedule'
  },
  {
    path: '/schedule',
    name: 'schedule',
    component: () => import('@/views/ScheduleView.vue'),
    meta: { title: '营位排期' }
  },
  {
    path: '/campsite',
    name: 'campsite',
    component: () => import('@/views/CampsiteView.vue'),
    meta: { title: '营位管理' }
  },
  {
    path: '/waitlist',
    name: 'waitlist',
    component: () => import('@/views/WaitlistView.vue'),
    meta: { title: '候补补位' }
  },
  {
    path: '/billing',
    name: 'billing',
    component: () => import('@/views/BillingView.vue'),
    meta: { title: '账单管理' }
  },
  {
    path: '/rate',
    name: 'rate',
    component: () => import('@/views/RateView.vue'),
    meta: { title: '费率管理' }
  },
  {
    path: '/equipment',
    name: 'equipment',
    component: () => import('@/views/EquipmentView.vue'),
    meta: { title: '装备租赁' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: '系统设置' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
