import dayjs from 'dayjs'
import type { Rate, TimeSegment, Campsite, EquipmentRental, Equipment } from '@/types'

export function splitTimeSegments(
  checkInTime: string,
  checkOutTime: string,
  rates: Rate[],
  priceBase: number
): TimeSegment[] {
  const segments: TimeSegment[] = []
  let currentTime = dayjs(checkInTime)
  const endTime = dayjs(checkOutTime)

  const activeRates = rates.filter(r => r.isActive && 
    dayjs(r.validFrom).isBefore(endTime) && 
    dayjs(r.validTo).isAfter(currentTime))

  while (currentTime.isBefore(endTime)) {
    const applicableRate = findApplicableRate(currentTime, activeRates)
    const nextRateChange = findNextRateChange(currentTime, endTime, activeRates)
    const segmentEnd = nextRateChange.isBefore(endTime) ? nextRateChange : endTime
    
    const duration = segmentEnd.diff(currentTime, 'hour', true)
    const days = Math.ceil(duration / 24)
    const unitPrice = priceBase * applicableRate.priceMultiplier
    const segmentAmount = unitPrice * days

    segments.push({
      startTime: currentTime.format('YYYY-MM-DD HH:mm:ss'),
      endTime: segmentEnd.format('YYYY-MM-DD HH:mm:ss'),
      duration: days,
      rateId: applicableRate.id,
      rateName: applicableRate.name,
      rateMultiplier: applicableRate.priceMultiplier,
      unitPrice,
      segmentAmount
    })

    currentTime = segmentEnd
  }

  return segments
}

function findApplicableRate(time: dayjs.Dayjs, rates: Rate[]): Rate {
  const dateStr = time.format('YYYY-MM-DD')
  const dayOfWeek = time.day()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  for (const rate of rates) {
    const rateStart = dayjs(rate.validFrom)
    const rateEnd = dayjs(rate.validTo)
    
    if (time.isAfter(rateStart) && time.isBefore(rateEnd)) {
      if (rate.type === 'holiday') {
        const rateDateStart = dayjs(rate.startTime)
        const rateDateEnd = dayjs(rate.endTime)
        if (time.isAfter(rateDateStart) && time.isBefore(rateDateEnd)) {
          return rate
        }
      } else if (rate.type === 'weekend' && isWeekend) {
        return rate
      } else if (rate.type === 'peak') {
        const seasonStart = dayjs(rate.startTime)
        const seasonEnd = dayjs(rate.endTime)
        const currentDate = dayjs(dateStr)
        if (currentDate.isAfter(seasonStart) && currentDate.isBefore(seasonEnd)) {
          return rate
        }
      }
    }
  }

  const offPeakRate = rates.find(r => r.type === 'off-peak')
  return offPeakRate || {
    id: 'default',
    name: '平日标准价',
    type: 'off-peak',
    startTime: '',
    endTime: '',
    priceMultiplier: 1,
    isActive: true,
    validFrom: '2000-01-01',
    validTo: '2099-12-31',
    description: ''
  }
}

function findNextRateChange(
  currentTime: dayjs.Dayjs,
  endTime: dayjs.Dayjs,
  rates: Rate[]
): dayjs.Dayjs {
  let nextChange = endTime

  for (const rate of rates) {
    const rateStart = dayjs(rate.startTime)
    const rateEnd = dayjs(rate.endTime)

    if (rateStart.isAfter(currentTime) && rateStart.isBefore(nextChange)) {
      nextChange = rateStart
    }
    if (rateEnd.isAfter(currentTime) && rateEnd.isBefore(nextChange)) {
      nextChange = rateEnd
    }
  }

  const nextDay = currentTime.add(1, 'day').startOf('day')
  if (nextDay.isAfter(currentTime) && nextDay.isBefore(nextChange)) {
    nextChange = nextDay
  }

  return nextChange
}

export function calculateTotalAmount(segments: TimeSegment[]): number {
  return segments.reduce((sum, seg) => sum + seg.segmentAmount, 0)
}

export function calculateEquipmentTotal(
  rentals: EquipmentRental[],
  checkInTime: string,
  checkOutTime: string
): number {
  const days = Math.ceil(dayjs(checkOutTime).diff(dayjs(checkInTime), 'hour', true) / 24)
  return rentals.reduce((sum, rental) => {
    const daysToUse = rental.days || days
    return sum + rental.unitPrice * rental.quantity * daysToUse
  }, 0)
}

export function calculateEquipmentRental(
  equipment: Equipment,
  quantity: number,
  checkInTime: string,
  checkOutTime: string
): EquipmentRental {
  const days = Math.ceil(dayjs(checkOutTime).diff(dayjs(checkInTime), 'hour', true) / 24)
  return {
    equipmentId: equipment.id,
    equipmentName: equipment.name,
    quantity,
    unitPrice: equipment.price,
    days,
    totalAmount: equipment.price * quantity * days
  }
}

export function generateBillNo(): string {
  const now = dayjs()
  const dateStr = now.format('YYYYMMDD')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `BILL${dateStr}${random}`
}
