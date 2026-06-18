import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import type { Rate } from '@/types'
import { saveToStorage, loadFromStorage, generateId } from '@/utils/storage'

const STORAGE_KEY = 'rates'

const defaultRates: Rate[] = [
  {
    id: generateId(),
    name: '平日标准价',
    type: 'off-peak',
    startTime: '2024-01-01 00:00:00',
    endTime: '2024-12-31 23:59:59',
    priceMultiplier: 1,
    isActive: true,
    validFrom: '2024-01-01',
    validTo: '2099-12-31',
    description: '周一至周四平日价格'
  },
  {
    id: generateId(),
    name: '周末价',
    type: 'weekend',
    startTime: '2024-01-01 00:00:00',
    endTime: '2024-12-31 23:59:59',
    priceMultiplier: 1.5,
    isActive: true,
    validFrom: '2024-01-01',
    validTo: '2099-12-31',
    description: '周五至周日周末价格上浮50%'
  },
  {
    id: generateId(),
    name: '旺季价',
    type: 'peak',
    startTime: '2024-06-01 00:00:00',
    endTime: '2024-08-31 23:59:59',
    priceMultiplier: 2,
    isActive: true,
    validFrom: '2024-01-01',
    validTo: '2029-12-31',
    description: '6-8月旺季价格上浮100%'
  },
  {
    id: generateId(),
    name: '国庆节假日',
    type: 'holiday',
    startTime: '2024-10-01 00:00:00',
    endTime: '2024-10-07 23:59:59',
    priceMultiplier: 2.5,
    isActive: true,
    validFrom: '2024-01-01',
    validTo: '2024-12-31',
    description: '国庆假期价格上浮150%'
  }
]

export const useRateStore = defineStore('rate', () => {
  const rates = ref<Rate[]>(loadFromStorage(STORAGE_KEY, defaultRates))

  const activeRates = computed(() => 
    rates.value.filter(r => r.isActive)
  )

  const getRateById = computed(() => (id: string) => 
    rates.value.find(r => r.id === id)
  )

  function addRate(rate: Omit<Rate, 'id'>) {
    const newRate: Rate = {
      ...rate,
      id: generateId()
    }
    rates.value.push(newRate)
    saveToStorage(STORAGE_KEY, rates.value)
    return newRate
  }

  function updateRate(id: string, updates: Partial<Rate>) {
    const index = rates.value.findIndex(r => r.id === id)
    if (index !== -1) {
      rates.value[index] = { ...rates.value[index], ...updates }
      saveToStorage(STORAGE_KEY, rates.value)
    }
  }

  function deleteRate(id: string) {
    rates.value = rates.value.filter(r => r.id !== id)
    saveToStorage(STORAGE_KEY, rates.value)
  }

  function getApplicableRates(date: string) {
    const targetDate = dayjs(date)
    return rates.value.filter(r => 
      r.isActive && 
      targetDate.isAfter(dayjs(r.validFrom)) && 
      targetDate.isBefore(dayjs(r.validTo).endOf('day'))
    )
  }

  function toggleRateStatus(id: string) {
    const rate = rates.value.find(r => r.id === id)
    if (rate) {
      rate.isActive = !rate.isActive
      saveToStorage(STORAGE_KEY, rates.value)
    }
  }

  return {
    rates,
    activeRates,
    getRateById,
    addRate,
    updateRate,
    deleteRate,
    getApplicableRates,
    toggleRateStatus
  }
})
