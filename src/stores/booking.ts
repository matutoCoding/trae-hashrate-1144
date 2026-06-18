import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import type { Booking, TimeSegment, EquipmentRental } from '@/types'
import { saveToStorage, loadFromStorage, generateId } from '@/utils/storage'
import { splitTimeSegments, calculateTotalAmount, calculateEquipmentTotal } from '@/utils/billing'
import { useCampsiteStore } from './campsite'
import { useRateStore } from './rate'
import { useSettingsStore } from './settings'
import { useWaitlistStore } from './waitlist'
import { useEquipmentStore } from './equipment'

const STORAGE_KEY = 'bookings'

export const useBookingStore = defineStore('booking', () => {
  const bookings = ref<Booking[]>(loadFromStorage(STORAGE_KEY, []))
  const autoReleaseTimer = ref<NodeJS.Timeout | null>(null)

  const activeBookings = computed(() => 
    bookings.value.filter(b => ['pending', 'confirmed', 'checked-in'].includes(b.status))
  )

  const pendingBookings = computed(() => 
    bookings.value.filter(b => b.status === 'pending')
  )

  const getBookingById = computed(() => (id: string) => 
    bookings.value.find(b => b.id === id)
  )

  const getBookingsByCampsite = computed(() => (campsiteId: string) => 
    bookings.value.filter(b => b.campsiteId === campsiteId)
  )

  function checkAvailability(
    campsiteId: string,
    checkInTime: string,
    checkOutTime: string,
    excludeBookingId?: string
  ): boolean {
    const campsiteBookings = bookings.value.filter(b => 
      b.campsiteId === campsiteId && 
      b.id !== excludeBookingId &&
      ['pending', 'confirmed', 'checked-in'].includes(b.status)
    )

    const newStart = dayjs(checkInTime)
    const newEnd = dayjs(checkOutTime)

    for (const booking of campsiteBookings) {
      const existingStart = dayjs(booking.checkInTime)
      const existingEnd = dayjs(booking.checkOutTime)

      if (newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart)) {
        return false
      }
    }

    return true
  }

  function getAvailableCampsites(checkInTime: string, checkOutTime: string, type?: string) {
    const campsiteStore = useCampsiteStore()
    return campsiteStore.campsites.filter(c => {
      if (c.status !== 'available') return false
      if (type && c.type !== type) return false
      return checkAvailability(c.id, checkInTime, checkOutTime)
    })
  }

  function calculateBookingPrice(
    campsiteId: string,
    checkInTime: string,
    checkOutTime: string,
    equipmentRentals: EquipmentRental[] = []
  ): { segments: TimeSegment[], totalAmount: number, equipmentAmount: number } {
    const campsiteStore = useCampsiteStore()
    const rateStore = useRateStore()
    const campsite = campsiteStore.getCampsiteById(campsiteId)

    if (!campsite) {
      return { segments: [], totalAmount: 0, equipmentAmount: 0 }
    }

    const segments = splitTimeSegments(checkInTime, checkOutTime, rateStore.rates, campsite.priceBase)
    const accommodationAmount = calculateTotalAmount(segments)
    const equipmentAmount = calculateEquipmentTotal(equipmentRentals, checkInTime, checkOutTime)
    const totalAmount = accommodationAmount + equipmentAmount

    return { segments, totalAmount, equipmentAmount }
  }

  function createBooking(booking: Omit<Booking, 'id' | 'bookingTime' | 'status' | 'equipmentRentals' | 'depositAmount' | 'totalAmount' | 'paidAmount'> & { equipmentRentals?: EquipmentRental[] }) {
    const settingsStore = useSettingsStore()
    const equipmentStore = useEquipmentStore()
    const rentals = booking.equipmentRentals || []

    if (rentals.length > 0) {
      const stockOk = equipmentStore.batchOccupyStock(
        rentals.map(r => ({ equipmentId: r.equipmentId, quantity: r.quantity }))
      )
      if (!stockOk) {
        return null
      }
    }

    const priceInfo = calculateBookingPrice(
      booking.campsiteId,
      booking.checkInTime,
      booking.checkOutTime,
      rentals
    )

    const depositAmount = priceInfo.totalAmount * settingsStore.settings.defaultDepositRate

    const newBooking: Booking = {
      ...booking,
      id: generateId(),
      status: 'pending',
      bookingTime: new Date().toISOString(),
      totalAmount: priceInfo.totalAmount,
      depositAmount,
      paidAmount: 0,
      equipmentRentals: rentals
    }

    bookings.value.push(newBooking)
    saveToStorage(STORAGE_KEY, bookings.value)

    scheduleAutoRelease(newBooking.id)

    return newBooking
  }

  function confirmBooking(id: string) {
    const index = bookings.value.findIndex(b => b.id === id)
    if (index !== -1) {
      bookings.value[index].status = 'confirmed'
      saveToStorage(STORAGE_KEY, bookings.value)
      cancelAutoRelease(id)
    }
  }

  function checkInBooking(id: string) {
    const index = bookings.value.findIndex(b => b.id === id)
    if (index !== -1) {
      bookings.value[index].status = 'checked-in'
      saveToStorage(STORAGE_KEY, bookings.value)
      cancelAutoRelease(id)
    }
  }

  function checkOutBooking(id: string) {
    const index = bookings.value.findIndex(b => b.id === id)
    if (index !== -1) {
      const booking = bookings.value[index]
      bookings.value[index].status = 'checked-out'
      saveToStorage(STORAGE_KEY, bookings.value)
      cancelAutoRelease(id)
      
      releaseBookingEquipment(booking)
    }
  }

  function releaseBookingEquipment(booking: Booking) {
    if (booking.equipmentRentals && booking.equipmentRentals.length > 0) {
      const equipmentStore = useEquipmentStore()
      equipmentStore.batchReleaseStock(
        booking.equipmentRentals.map(r => ({ equipmentId: r.equipmentId, quantity: r.quantity }))
      )
    }
  }

  function cancelBooking(id: string) {
    const index = bookings.value.findIndex(b => b.id === id)
    if (index !== -1) {
      const booking = bookings.value[index]
      bookings.value[index].status = 'cancelled'
      saveToStorage(STORAGE_KEY, bookings.value)
      cancelAutoRelease(id)

      releaseBookingEquipment(booking)

      const waitlistStore = useWaitlistStore()
      waitlistStore.notifyNextWaitlist(booking.campsiteId, booking.checkInTime, booking.checkOutTime)
    }
  }

  function expireBooking(id: string) {
    const index = bookings.value.findIndex(b => b.id === id)
    if (index !== -1) {
      const booking = bookings.value[index]
      bookings.value[index].status = 'expired'
      saveToStorage(STORAGE_KEY, bookings.value)

      releaseBookingEquipment(booking)

      if (window.ipcRenderer) {
        window.ipcRenderer.send('notify', '预订已超时', `${booking.customerName} 的预订因超时未到已自动释放`)
      }

      const waitlistStore = useWaitlistStore()
      waitlistStore.notifyNextWaitlist(booking.campsiteId, booking.checkInTime, booking.checkOutTime)
    }
  }

  function scheduleAutoRelease(bookingId: string) {
    const settingsStore = useSettingsStore()
    const booking = bookings.value.find(b => b.id === bookingId)
    if (!booking) return

    const expectedArrival = dayjs(booking.expectedArrivalTime)
    const releaseTime = expectedArrival.add(settingsStore.settings.autoReleaseMinutes, 'minute')
    const delay = releaseTime.diff(dayjs(), 'millisecond')

    if (delay > 0) {
      const timer = setTimeout(() => {
        const currentBooking = bookings.value.find(b => b.id === bookingId)
        if (currentBooking && currentBooking.status === 'pending') {
          expireBooking(bookingId)
        }
      }, delay)
      autoReleaseTimer.value = timer
    }
  }

  function cancelAutoRelease(bookingId: string) {
    if (autoReleaseTimer.value) {
      clearTimeout(autoReleaseTimer.value)
      autoReleaseTimer.value = null
    }
  }

  function startAutoReleaseCheck() {
    setInterval(() => {
      const settingsStore = useSettingsStore()
      const now = dayjs()

      bookings.value.forEach(booking => {
        if (booking.status === 'pending') {
          const expectedArrival = dayjs(booking.expectedArrivalTime)
          const releaseTime = expectedArrival.add(settingsStore.settings.autoReleaseMinutes, 'minute')
          
          if (now.isAfter(releaseTime)) {
            expireBooking(booking.id)
          }
        }
      })
    }, 60000)
  }

  function updateBooking(id: string, updates: Partial<Booking>) {
    const index = bookings.value.findIndex(b => b.id === id)
    if (index !== -1) {
      bookings.value[index] = { ...bookings.value[index], ...updates }
      saveToStorage(STORAGE_KEY, bookings.value)
    }
  }

  function addPayment(id: string, amount: number) {
    const index = bookings.value.findIndex(b => b.id === id)
    if (index !== -1) {
      bookings.value[index].paidAmount += amount
      saveToStorage(STORAGE_KEY, bookings.value)
    }
  }

  return {
    bookings,
    activeBookings,
    pendingBookings,
    getBookingById,
    getBookingsByCampsite,
    checkAvailability,
    getAvailableCampsites,
    calculateBookingPrice,
    createBooking,
    confirmBooking,
    checkInBooking,
    checkOutBooking,
    cancelBooking,
    expireBooking,
    scheduleAutoRelease,
    startAutoReleaseCheck,
    updateBooking,
    addPayment
  }
})
