import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import type { Bill, TimeSegment, EquipmentRental } from '@/types'
import { saveToStorage, loadFromStorage, generateId } from '@/utils/storage'
import { generateBillNo, calculateTotalAmount, calculateEquipmentTotal } from '@/utils/billing'
import { useCampsiteStore } from './campsite'
import { useBookingStore } from './booking'

const STORAGE_KEY = 'bills'

export const useBillStore = defineStore('bill', () => {
  const bills = ref<Bill[]>(loadFromStorage(STORAGE_KEY, []))

  const getBillById = computed(() => (id: string) => 
    bills.value.find(b => b.id === id)
  )

  const getBillByBookingId = computed(() => (bookingId: string) => 
    bills.value.find(b => b.bookingId === bookingId)
  )

  const unpaidBills = computed(() => 
    bills.value.filter(b => b.status !== 'paid')
  )

  function createBill(bookingId: string): Bill | null {
    const bookingStore = useBookingStore()
    const campsiteStore = useCampsiteStore()
    const booking = bookingStore.getBookingById(bookingId)
    
    if (!booking) return null

    const campsite = campsiteStore.getCampsiteById(booking.campsiteId)
    if (!campsite) return null

    const priceInfo = bookingStore.calculateBookingPrice(
      booking.campsiteId,
      booking.checkInTime,
      booking.checkOutTime,
      booking.equipmentRentals
    )

    const totalDays = Math.ceil(
      dayjs(booking.checkOutTime).diff(dayjs(booking.checkInTime), 'hour', true) / 24
    )

    const accommodationAmount = calculateTotalAmount(priceInfo.segments)
    const equipmentAmount = calculateEquipmentTotal(
      booking.equipmentRentals,
      booking.checkInTime,
      booking.checkOutTime
    )

    const bill: Bill = {
      id: generateId(),
      bookingId: booking.id,
      billNo: generateBillNo(),
      issueTime: new Date().toISOString(),
      customerName: booking.customerName,
      campsiteName: campsite.name,
      checkInTime: booking.checkInTime,
      checkOutTime: booking.checkOutTime,
      totalDays,
      timeSegments: priceInfo.segments,
      accommodationAmount,
      equipmentAmount,
      discountAmount: 0,
      totalAmount: accommodationAmount + equipmentAmount,
      paidAmount: booking.paidAmount,
      unpaidAmount: accommodationAmount + equipmentAmount - booking.paidAmount,
      status: booking.paidAmount >= (accommodationAmount + equipmentAmount) ? 'paid' : 
              booking.paidAmount > 0 ? 'partial' : 'unpaid',
      notes: ''
    }

    bills.value.push(bill)
    saveToStorage(STORAGE_KEY, bills.value)

    bookingStore.updateBooking(bookingId, { billId: bill.id })

    return bill
  }

  function updateBill(id: string, updates: Partial<Bill>) {
    const index = bills.value.findIndex(b => b.id === id)
    if (index !== -1) {
      bills.value[index] = { ...bills.value[index], ...updates }
      updateBillStatus(id)
      saveToStorage(STORAGE_KEY, bills.value)
    }
  }

  function updateBillStatus(id: string) {
    const bill = bills.value.find(b => b.id === id)
    if (bill) {
      if (bill.paidAmount >= bill.totalAmount) {
        bill.status = 'paid'
      } else if (bill.paidAmount > 0) {
        bill.status = 'partial'
      } else {
        bill.status = 'unpaid'
      }
      bill.unpaidAmount = bill.totalAmount - bill.paidAmount
    }
  }

  function addPayment(billId: string, amount: number, paymentMethod: string) {
    const index = bills.value.findIndex(b => b.id === billId)
    if (index !== -1) {
      bills.value[index].paidAmount += amount
      bills.value[index].paymentMethod = paymentMethod
      bills.value[index].paymentTime = new Date().toISOString()
      updateBillStatus(billId)
      saveToStorage(STORAGE_KEY, bills.value)

      const bookingStore = useBookingStore()
      bookingStore.addPayment(bills.value[index].bookingId, amount)

      return bills.value[index]
    }
    return null
  }

  function applyDiscount(billId: string, discountAmount: number) {
    const index = bills.value.findIndex(b => b.id === billId)
    if (index !== -1) {
      bills.value[index].discountAmount += discountAmount
      bills.value[index].totalAmount -= discountAmount
      updateBillStatus(billId)
      saveToStorage(STORAGE_KEY, bills.value)
    }
  }

  function getBillsByDateRange(startDate: string, endDate: string) {
    const start = dayjs(startDate)
    const end = dayjs(endDate)
    return bills.value.filter(b => {
      const issueDate = dayjs(b.issueTime)
      return issueDate.isAfter(start) && issueDate.isBefore(end.endOf('day'))
    })
  }

  function getBillsByStatus(status: Bill['status']) {
    return bills.value.filter(b => b.status === status)
  }

  function calculateDailyRevenue(date: string) {
    const dayStart = dayjs(date).startOf('day')
    const dayEnd = dayjs(date).endOf('day')
    
    const dayBills = bills.value.filter(b => {
      const paidTime = b.paymentTime ? dayjs(b.paymentTime) : null
      return paidTime && paidTime.isAfter(dayStart) && paidTime.isBefore(dayEnd)
    })

    return dayBills.reduce((sum, b) => sum + b.paidAmount, 0)
  }

  return {
    bills,
    getBillById,
    getBillByBookingId,
    unpaidBills,
    createBill,
    updateBill,
    addPayment,
    applyDiscount,
    getBillsByDateRange,
    getBillsByStatus,
    calculateDailyRevenue
  }
})
