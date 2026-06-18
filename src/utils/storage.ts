const STORAGE_PREFIX = 'campsite_booking_'

export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data))
  } catch (error) {
    console.error('Storage save error:', error)
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(STORAGE_PREFIX + key)
    if (data === null) {
      return defaultValue
    }
    return JSON.parse(data) as T
  } catch (error) {
    console.error('Storage load error:', error)
    return defaultValue
  }
}

export function removeFromStorage(key: string): void {
  localStorage.removeItem(STORAGE_PREFIX + key)
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}
