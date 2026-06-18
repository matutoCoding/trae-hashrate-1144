import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SystemSettings } from '@/types'
import { saveToStorage, loadFromStorage } from '@/utils/storage'

const STORAGE_KEY = 'settings'

const defaultSettings: SystemSettings = {
  autoReleaseMinutes: 30,
  waitlistNotifyExpireMinutes: 60,
  checkInTime: '14:00',
  checkOutTime: '12:00',
  defaultDepositRate: 0.3
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<SystemSettings>(loadFromStorage(STORAGE_KEY, defaultSettings))

  function updateSettings(newSettings: Partial<SystemSettings>) {
    settings.value = { ...settings.value, ...newSettings }
    saveToStorage(STORAGE_KEY, settings.value)
  }

  function resetSettings() {
    settings.value = { ...defaultSettings }
    saveToStorage(STORAGE_KEY, settings.value)
  }

  return {
    settings,
    updateSettings,
    resetSettings
  }
})
