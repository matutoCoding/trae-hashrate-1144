<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-content">
        <div class="logo">
          <el-icon size="32"><Camp /></el-icon>
          <h1>露营地营位预订系统</h1>
        </div>
        <div class="header-right">
          <el-text class="current-time">{{ currentTime }}</el-text>
        </div>
      </div>
    </el-header>
    <el-container>
      <el-aside width="220px" class="app-aside">
        <el-menu
          :default-active="activeMenu"
          router
          class="sidebar-menu"
        >
          <el-menu-item index="/schedule">
            <el-icon><Calendar /></el-icon>
            <span>营位排期</span>
          </el-menu-item>
          <el-menu-item index="/campsite">
            <el-icon><House /></el-icon>
            <span>营位管理</span>
          </el-menu-item>
          <el-menu-item index="/waitlist">
            <el-icon><List /></el-icon>
            <span>候补补位</span>
            <el-badge v-if="notifiedCount > 0" :value="notifiedCount" class="menu-badge" />
          </el-menu-item>
          <el-menu-item index="/billing">
            <el-icon><Wallet /></el-icon>
            <span>账单管理</span>
          </el-menu-item>
          <el-menu-item index="/rate">
            <el-icon><Money /></el-icon>
            <span>费率管理</span>
          </el-menu-item>
          <el-menu-item index="/equipment">
            <el-icon><Goods /></el-icon>
            <span>装备租赁</span>
          </el-menu-item>
          <el-menu-item index="/settings">
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-main class="app-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useWaitlistStore } from '@/stores/waitlist'
import dayjs from 'dayjs'

const route = useRoute()
const waitlistStore = useWaitlistStore()

const currentTime = ref('')
let timer: NodeJS.Timeout

const activeMenu = computed(() => route.path)
const notifiedCount = computed(() => waitlistStore.notifiedList.length)

function updateTime() {
  currentTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style lang="scss" scoped>
.app-container {
  height: 100vh;
}

.app-header {
  background: linear-gradient(135deg, #2d5a27 0%, #3d7a35 100%);
  color: white;
  padding: 0;
  height: 70px;
  display: flex;
  align-items: center;

  .header-content {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 24px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 12px;

    h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
    }
  }

  .current-time {
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
  }
}

.app-aside {
  background: #1f2937;
  border-right: 1px solid #374151;
}

.sidebar-menu {
  border-right: none;
  background: #1f2937;

  :deep(.el-menu-item) {
    color: #9ca3af;
    height: 56px;
    line-height: 56px;

    &:hover {
      background: #374151;
      color: white;
    }

    &.is-active {
      background: #3d7a35;
      color: white;
    }
  }

  :deep(.el-menu-item.is-active) {
    background: #3d7a35 !important;
  }
}

.menu-badge {
  margin-left: 8px;
}

.app-main {
  background: #f3f4f6;
  padding: 24px;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
