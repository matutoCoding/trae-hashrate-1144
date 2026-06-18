import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Campsite } from '@/types'
import { saveToStorage, loadFromStorage, generateId } from '@/utils/storage'

const STORAGE_KEY = 'campsites'

const defaultCampsites: Campsite[] = [
  {
    id: generateId(),
    name: '帐篷营位 A1',
    type: 'tent',
    capacity: 4,
    area: 20,
    facilities: ['电源', '水源', '桌椅'],
    priceBase: 100,
    status: 'available',
    description: '标准帐篷营位，位于营地东侧',
    createdAt: new Date().toISOString()
  },
  {
    id: generateId(),
    name: '帐篷营位 A2',
    type: 'tent',
    capacity: 4,
    area: 20,
    facilities: ['电源', '水源', '桌椅'],
    priceBase: 100,
    status: 'available',
    description: '标准帐篷营位，位于营地东侧',
    createdAt: new Date().toISOString()
  },
  {
    id: generateId(),
    name: '房车营位 B1',
    type: 'rv',
    capacity: 6,
    area: 40,
    facilities: ['电源', '水源', '排污', 'WiFi'],
    priceBase: 200,
    status: 'available',
    description: '豪华房车营位，配套设施齐全',
    createdAt: new Date().toISOString()
  },
  {
    id: generateId(),
    name: '木屋营位 C1',
    type: 'cabin',
    capacity: 8,
    area: 60,
    facilities: ['电源', '水源', '空调', '卫浴', '厨房'],
    priceBase: 500,
    status: 'available',
    description: '豪华木屋，拎包入住',
    createdAt: new Date().toISOString()
  },
  {
    id: generateId(),
    name: '团体营位 D1',
    type: 'group',
    capacity: 20,
    area: 100,
    facilities: ['电源', '水源', '烧烤区', '篝火区'],
    priceBase: 300,
    status: 'available',
    description: '大型团体营位，适合团建活动',
    createdAt: new Date().toISOString()
  }
]

export const useCampsiteStore = defineStore('campsite', () => {
  const campsites = ref<Campsite[]>(loadFromStorage(STORAGE_KEY, defaultCampsites))

  const availableCampsites = computed(() => 
    campsites.value.filter(c => c.status === 'available')
  )

  const getCampsiteById = computed(() => (id: string) => 
    campsites.value.find(c => c.id === id)
  )

  function addCampsite(campsite: Omit<Campsite, 'id' | 'createdAt'>) {
    const newCampsite: Campsite = {
      ...campsite,
      id: generateId(),
      createdAt: new Date().toISOString()
    }
    campsites.value.push(newCampsite)
    saveToStorage(STORAGE_KEY, campsites.value)
    return newCampsite
  }

  function updateCampsite(id: string, updates: Partial<Campsite>) {
    const index = campsites.value.findIndex(c => c.id === id)
    if (index !== -1) {
      campsites.value[index] = { ...campsites.value[index], ...updates }
      saveToStorage(STORAGE_KEY, campsites.value)
    }
  }

  function deleteCampsite(id: string) {
    campsites.value = campsites.value.filter(c => c.id !== id)
    saveToStorage(STORAGE_KEY, campsites.value)
  }

  function getCampsitesByType(type: Campsite['type']) {
    return campsites.value.filter(c => c.type === type && c.status === 'available')
  }

  return {
    campsites,
    availableCampsites,
    getCampsiteById,
    addCampsite,
    updateCampsite,
    deleteCampsite,
    getCampsitesByType
  }
})
