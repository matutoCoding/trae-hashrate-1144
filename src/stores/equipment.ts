import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Equipment } from '@/types'
import { saveToStorage, loadFromStorage, generateId } from '@/utils/storage'

const STORAGE_KEY = 'equipment'

const defaultEquipment: Equipment[] = [
  {
    id: generateId(),
    name: '双人帐篷',
    category: '帐篷',
    unit: '顶',
    price: 50,
    stock: 20,
    status: 'available',
    description: '标准双人帐篷，含防潮垫'
  },
  {
    id: generateId(),
    name: '四人帐篷',
    category: '帐篷',
    unit: '顶',
    price: 80,
    stock: 15,
    status: 'available',
    description: '家庭四人帐篷，空间宽敞'
  },
  {
    id: generateId(),
    name: '睡袋',
    category: '睡眠装备',
    unit: '个',
    price: 30,
    stock: 50,
    status: 'available',
    description: '舒适保暖睡袋，适合15°C以上'
  },
  {
    id: generateId(),
    name: '自动充气垫',
    category: '睡眠装备',
    unit: '个',
    price: 40,
    stock: 40,
    status: 'available',
    description: '自动充气防潮垫，厚度5cm'
  },
  {
    id: generateId(),
    name: '露营灯',
    category: '照明',
    unit: '个',
    price: 20,
    stock: 30,
    status: 'available',
    description: 'LED露营灯，可充电'
  },
  {
    id: generateId(),
    name: '折叠桌椅套装',
    category: '家具',
    unit: '套',
    price: 60,
    stock: 25,
    status: 'available',
    description: '一桌四椅折叠套装'
  },
  {
    id: generateId(),
    name: '烧烤炉',
    category: '炊具',
    unit: '个',
    price: 80,
    stock: 15,
    status: 'available',
    description: '便携式炭烤炉'
  },
  {
    id: generateId(),
    name: '天幕',
    category: '遮阳装备',
    unit: '套',
    price: 100,
    stock: 10,
    status: 'available',
    description: '3x4米遮阳天幕'
  }
]

export const useEquipmentStore = defineStore('equipment', () => {
  const equipment = ref<Equipment[]>(loadFromStorage(STORAGE_KEY, defaultEquipment))

  const availableEquipment = computed(() => 
    equipment.value.filter(e => e.status === 'available' && e.stock > 0)
  )

  const getEquipmentById = computed(() => (id: string) => 
    equipment.value.find(e => e.id === id)
  )

  function addEquipment(item: Omit<Equipment, 'id'>) {
    const newItem: Equipment = {
      ...item,
      id: generateId()
    }
    equipment.value.push(newItem)
    saveToStorage(STORAGE_KEY, equipment.value)
    return newItem
  }

  function updateEquipment(id: string, updates: Partial<Equipment>) {
    const index = equipment.value.findIndex(e => e.id === id)
    if (index !== -1) {
      equipment.value[index] = { ...equipment.value[index], ...updates }
      saveToStorage(STORAGE_KEY, equipment.value)
    }
  }

  function deleteEquipment(id: string) {
    equipment.value = equipment.value.filter(e => e.id !== id)
    saveToStorage(STORAGE_KEY, equipment.value)
  }

  function updateStock(id: string, change: number) {
    const item = equipment.value.find(e => e.id === id)
    if (item) {
      item.stock = Math.max(0, item.stock + change)
      saveToStorage(STORAGE_KEY, equipment.value)
    }
  }

  function getEquipmentByCategory(category: string) {
    return equipment.value.filter(e => e.category === category && e.status === 'available')
  }

  function getCategories() {
    return [...new Set(equipment.value.map(e => e.category))]
  }

  return {
    equipment,
    availableEquipment,
    getEquipmentById,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    updateStock,
    getEquipmentByCategory,
    getCategories
  }
})
