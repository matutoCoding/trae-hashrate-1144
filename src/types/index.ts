export interface Campsite {
  id: string
  name: string
  type: 'tent' | 'rv' | 'cabin' | 'group'
  capacity: number
  area: number
  facilities: string[]
  priceBase: number
  status: 'available' | 'maintenance' | 'closed'
  description: string
  createdAt: string
}

export interface Booking {
  id: string
  campsiteId: string
  customerName: string
  customerPhone: string
  customerIdCard: string
  checkInTime: string
  checkOutTime: string
  peopleCount: number
  status: 'pending' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled' | 'expired'
  depositAmount: number
  totalAmount: number
  paidAmount: number
  equipmentRentals: EquipmentRental[]
  bookingTime: string
  expectedArrivalTime: string
  notes: string
  billId?: string
}

export interface Waitlist {
  id: string
  campsiteId: string
  customerName: string
  customerPhone: string
  checkInTime: string
  checkOutTime: string
  peopleCount: number
  status: 'waiting' | 'notified' | 'confirmed' | 'cancelled' | 'expired'
  queuePosition: number
  bookingTime: string
  notifiedTime?: string
  expireTime?: string
  notes: string
}

export interface Rate {
  id: string
  name: string
  type: 'peak' | 'off-peak' | 'weekend' | 'holiday'
  startTime: string
  endTime: string
  priceMultiplier: number
  isActive: boolean
  validFrom: string
  validTo: string
  description: string
}

export interface TimeSegment {
  startTime: string
  endTime: string
  duration: number
  rateId: string
  rateName: string
  rateMultiplier: number
  priceBase: number
  unitPrice: number
  segmentAmount: number
}

export interface Payment {
  id: string
  billId: string
  amount: number
  paymentMethod: string
  paymentTime: string
  remark: string
}

export interface Bill {
  id: string
  bookingId: string
  billNo: string
  issueTime: string
  customerName: string
  campsiteName: string
  checkInTime: string
  checkOutTime: string
  totalDays: number
  timeSegments: TimeSegment[]
  accommodationAmount: number
  equipmentAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  unpaidAmount: number
  status: 'unpaid' | 'partial' | 'paid'
  paymentMethod?: string
  paymentTime?: string
  payments: Payment[]
  notes: string
}

export interface Equipment {
  id: string
  name: string
  category: string
  unit: string
  price: number
  stock: number
  stockOccupied: number
  status: 'available' | 'unavailable'
  description: string
}

export interface EquipmentRental {
  equipmentId: string
  equipmentName: string
  quantity: number
  unitPrice: number
  days: number
  totalAmount: number
}

export interface SystemSettings {
  autoReleaseMinutes: number
  waitlistNotifyExpireMinutes: number
  checkInTime: string
  checkOutTime: string
  defaultDepositRate: number
}

export type ModuleType = 'schedule' | 'waitlist' | 'billing' | 'settings'
