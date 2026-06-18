import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import type { Waitlist } from '@/types'
import { saveToStorage, loadFromStorage, generateId } from '@/utils/storage'
import { useSettingsStore } from './settings'
import { useBookingStore } from './booking'

const STORAGE_KEY = 'waitlist'

export const useWaitlistStore = defineStore('waitlist', () => {
  const waitlist = ref<Waitlist[]>(loadFromStorage(STORAGE_KEY, []))

  const activeWaitlist = computed(() => 
    waitlist.value.filter(w => ['waiting', 'notified'].includes(w.status))
  )

  const waitingList = computed(() => 
    waitlist.value.filter(w => w.status === 'waiting')
  )

  const notifiedList = computed(() => 
    waitlist.value.filter(w => w.status === 'notified')
  )

  const getWaitlistById = computed(() => (id: string) => 
    waitlist.value.find(w => w.id === id)
  )

  const getWaitlistByCampsite = computed(() => (campsiteId: string) => 
    waitlist.value.filter(w => w.campsiteId === campsiteId && ['waiting', 'notified'].includes(w.status))
  )

  function getQueuePosition(campsiteId: string, checkInTime: string, checkOutTime: string): number {
    const relevantWaitlist = waitlist.value.filter(w => 
      w.campsiteId === campsiteId && 
      w.status === 'waiting' &&
      w.checkInTime === checkInTime &&
      w.checkOutTime === checkOutTime
    )
    return relevantWaitlist.length + 1
  }

  function addToWaitlist(entry: Omit<Waitlist, 'id' | 'queuePosition' | 'bookingTime' | 'status'>) {
    const queuePosition = getQueuePosition(entry.campsiteId, entry.checkInTime, entry.checkOutTime)
    
    const newEntry: Waitlist = {
      ...entry,
      id: generateId(),
      status: 'waiting',
      queuePosition,
      bookingTime: new Date().toISOString()
    }

    waitlist.value.push(newEntry)
    saveToStorage(STORAGE_KEY, waitlist.value)
    return newEntry
  }

  function notifyNextWaitlist(campsiteId: string, checkInTime: string, checkOutTime: string) {
    const settingsStore = useSettingsStore()
    
    const nextEntry = waitlist.value
      .filter(w => 
        w.campsiteId === campsiteId && 
        w.status === 'waiting' &&
        w.checkInTime === checkInTime &&
        w.checkOutTime === checkOutTime
      )
      .sort((a, b) => a.queuePosition - b.queuePosition)[0]

    if (nextEntry) {
      const index = waitlist.value.findIndex(w => w.id === nextEntry.id)
      if (index !== -1) {
        waitlist.value[index].status = 'notified'
        waitlist.value[index].notifiedTime = new Date().toISOString()
        waitlist.value[index].expireTime = dayjs()
          .add(settingsStore.settings.waitlistNotifyExpireMinutes, 'minute')
          .toISOString()
        
        saveToStorage(STORAGE_KEY, waitlist.value)

        if (window.ipcRenderer) {
          window.ipcRenderer.send('notify', 
            '候补补位通知', 
            `${nextEntry.customerName} 候补的营位已空出，请在 ${settingsStore.settings.waitlistNotifyExpireMinutes} 分钟内确认`
          )
        }

        scheduleWaitlistExpire(nextEntry.id)
      }
    }
  }

  function scheduleWaitlistExpire(waitlistId: string) {
    const settingsStore = useSettingsStore()
    const entry = waitlist.value.find(w => w.id === waitlistId)
    if (!entry || !entry.expireTime) return

    const delay = dayjs(entry.expireTime).diff(dayjs(), 'millisecond')
    if (delay > 0) {
      setTimeout(() => {
        const currentEntry = waitlist.value.find(w => w.id === waitlistId)
        if (currentEntry && currentEntry.status === 'notified') {
          expireWaitlist(waitlistId)
        }
      }, delay)
    }
  }

  function confirmWaitlistBooking(id: string) {
    const index = waitlist.value.findIndex(w => w.id === id)
    if (index !== -1) {
      const entry = waitlist.value[index]
      waitlist.value[index].status = 'confirmed'
      saveToStorage(STORAGE_KEY, waitlist.value)
      updateQueuePositions(entry.campsiteId, entry.checkInTime, entry.checkOutTime)
    }
  }

  function cancelWaitlist(id: string) {
    const index = waitlist.value.findIndex(w => w.id === id)
    if (index !== -1) {
      const entry = waitlist.value[index]
      waitlist.value[index].status = 'cancelled'
      saveToStorage(STORAGE_KEY, waitlist.value)
      updateQueuePositions(entry.campsiteId, entry.checkInTime, entry.checkOutTime)

      if (entry.status === 'notified') {
        notifyNextWaitlist(entry.campsiteId, entry.checkInTime, entry.checkOutTime)
      }
    }
  }

  function expireWaitlist(id: string) {
    const index = waitlist.value.findIndex(w => w.id === id)
    if (index !== -1) {
      const entry = waitlist.value[index]
      waitlist.value[index].status = 'expired'
      saveToStorage(STORAGE_KEY, waitlist.value)
      updateQueuePositions(entry.campsiteId, entry.checkInTime, entry.checkOutTime)

      if (window.ipcRenderer) {
        window.ipcRenderer.send('notify', 
          '候补已过期', 
          `${entry.customerName} 的候补确认已超时，已自动放弃`
        )
      }

      notifyNextWaitlist(entry.campsiteId, entry.checkInTime, entry.checkOutTime)
    }
  }

  function updateQueuePositions(campsiteId: string, checkInTime: string, checkOutTime: string) {
    const relevantEntries = waitlist.value
      .filter(w => 
        w.campsiteId === campsiteId && 
        w.status === 'waiting' &&
        w.checkInTime === checkInTime &&
        w.checkOutTime === checkOutTime
      )
      .sort((a, b) => new Date(a.bookingTime).getTime() - new Date(b.bookingTime).getTime())

    relevantEntries.forEach((entry, index) => {
      const idx = waitlist.value.findIndex(w => w.id === entry.id)
      if (idx !== -1) {
        waitlist.value[idx].queuePosition = index + 1
      }
    })

    saveToStorage(STORAGE_KEY, waitlist.value)
  }

  function convertWaitlistToBooking(waitlistId: string) {
    const entry = waitlist.value.find(w => w.id === waitlistId)
    if (!entry) return null

    const bookingStore = useBookingStore()
    
    const isAvailable = bookingStore.checkAvailability(
      entry.campsiteId,
      entry.checkInTime,
      entry.checkOutTime
    )
    
    if (!isAvailable) {
      if (window.ipcRenderer) {
        window.ipcRenderer.send('notify', 
          '候补转预订失败', 
          `${entry.customerName} 候补的营位当前不可用，请稍后再试`
        )
      }
      return null
    }

    const booking = bookingStore.createBooking({
      campsiteId: entry.campsiteId,
      customerName: entry.customerName,
      customerPhone: entry.customerPhone,
      customerIdCard: '',
      checkInTime: entry.checkInTime,
      checkOutTime: entry.checkOutTime,
      peopleCount: entry.peopleCount,
      expectedArrivalTime: entry.checkInTime,
      notes: entry.notes
    })

    if (booking) {
      confirmWaitlistBooking(waitlistId)
    }
    
    return booking
  }

  function startWaitlistExpireCheck() {
    setInterval(() => {
      const now = dayjs()
      waitlist.value.forEach(entry => {
        if (entry.status === 'notified' && entry.expireTime && now.isAfter(entry.expireTime)) {
          expireWaitlist(entry.id)
        }
      })
    }, 60000)
  }

  return {
    waitlist,
    activeWaitlist,
    waitingList,
    notifiedList,
    getWaitlistById,
    getWaitlistByCampsite,
    getQueuePosition,
    addToWaitlist,
    notifyNextWaitlist,
    confirmWaitlistBooking,
    cancelWaitlist,
    expireWaitlist,
    updateQueuePositions,
    convertWaitlistToBooking,
    startWaitlistExpireCheck
  }
})
