import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Equipment } from '@/types'
import { saveToStorage, loadFromStorage, generateId } from '@/utils/storage'

const STORAGE_KEY = 'equipment'

function getDefaultEquipment(): Equipment[] {
  return [
    {
      id: generateId(),
      name: '双人帐篷',
      category: '帐篷',
      unit: '顶',
      price: 50,
      stock: 20,
      stockOccupied: 0,
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
      stockOccupied: 0,
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
      stockOccupied: 0,
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
      stockOccupied: 0,
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
      stockOccupied: 0,
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
      stockOccupied: 0,
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
      stockOccupied: 0,
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
      stockOccupied: 0,
      status: 'available',
      description: '3x4米遮阳天幕'
    }
  ]
}

function migrateEquipmentData(data: Equipment[]): Equipment[] {
  let changed = false
  const migrated = data.map(item => {
    if (item.stockOccupied === undefined) {
      changed = true
      return { ...item, stockOccupied: 0 }
    }
    return item
  })
  if (changed) {
    saveToStorage(STORAGE_KEY, migrated)
  }
  return migrated
}

const initialData = loadFromStorage(STORAGE_KEY, null)
const equipmentData = initialData 
  ? migrateEquipmentData(initialData)
  : getDefaultEquipment()

export const useEquipmentStore = defineStore('equipment', () => {
  const equipment = ref<Equipment[]>(equipmentData)

  const availableEquipment = computed(() => 
    equipment.value.filter(e => e.status === 'available' && (e.stock - e.stockOccupied) > 0)
  )

  const getEquipmentById = computed(() => (id: string) => 
    equipment.value.find(e => e.id === id)
  )

  function getAvailableStock(id: string): number {
    const item = equipment.value.find(e => e.id === id)
    return item ? Math.max(0, item.stock - item.stockOccupied) : 0
  }

  function addEquipment(item: Omit<Equipment, 'id'>) {
    const newItem: Equipment = {
      ...item,
      id: generateId(),
      stockOccupied: item.stockOccupied || 0
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

  function occupyStock(id: string, quantity: number): boolean {
    const item = equipment.value.find(e => e.id === id)
    if (!item) return false
    
    const available = item.stock - item.stockOccupied
    if (quantity > available) {
      return false
    }
    
    item.stockOccupied += quantity
    saveToStorage(STORAGE_KEY, equipment.value)
    return true
  }

  function releaseStock(id: string, quantity: number) {
    const item = equipment.value.find(e => e.id === id)
    if (item) {
      item.stockOccupied = Math.max(0, item.stockOccupied - quantity)
      saveToStorage(STORAGE_KEY, equipment.value)
    }
  }

  function batchOccupyStock(rentals: { equipmentId: string; quantity: number }[]): boolean {
    for (const rental of rentals) {
      const available = getAvailableStock(rental.equipmentId)
      if (rental.quantity > available) {
        return false
      }
    }
    
    for (const rental of rentals) {
      occupyStock(rental.equipmentId, rental.quantity)
    }
    return true
  }

  function batchReleaseStock(rentals: { equipmentId: string; quantity: number }[]) {
    for (const rental of rentals) {
      releaseStock(rental.equipmentId, rental.quantity)
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
    getAvailableStock,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    updateStock,
    occupyStock,
    releaseStock,
    batchOccupyStock,
    batchReleaseStock,
    getEquipmentByCategory,
    getCategories
  }
})
