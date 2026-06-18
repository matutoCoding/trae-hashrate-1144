import dayjs from 'dayjs'
import type { Rate, TimeSegment, Campsite, EquipmentRental, Equipment } from '@/types'

export function splitTimeSegments(
  checkInTime: string,
  checkOutTime: string,
  rates: Rate[],
  priceBase: number
): TimeSegment[] {
  const segments: TimeSegment[] = []
  const totalStart = dayjs(checkInTime)
  const totalEnd = dayjs(checkOutTime)
  const totalHours = totalEnd.diff(totalStart, 'hour', true)
  
  if (totalHours <= 0) {
    return segments
  }

  const activeRates = rates.filter(r => r.isActive)

  let currentTime = totalStart.clone()

  while (currentTime.isBefore(totalEnd)) {
    const applicableRate = findApplicableRate(currentTime, activeRates)
    const nextRateChange = findNextRateChange(currentTime, totalEnd, activeRates)
    const segmentEnd = nextRateChange.isBefore(totalEnd) ? nextRateChange : totalEnd
    
    const segmentHours = segmentEnd.diff(currentTime, 'hour', true)
    const segmentDays = segmentHours / 24
    const unitPrice = priceBase * applicableRate.priceMultiplier
    const segmentAmount = unitPrice * segmentDays

    segments.push({
      startTime: currentTime.format('YYYY-MM-DD HH:mm:ss'),
      endTime: segmentEnd.format('YYYY-MM-DD HH:mm:ss'),
      duration: Number(segmentDays.toFixed(2)),
      rateId: applicableRate.id,
      rateName: applicableRate.name,
      rateMultiplier: applicableRate.priceMultiplier,
      unitPrice,
      segmentAmount: Number(segmentAmount.toFixed(2))
    })

    currentTime = segmentEnd.clone()
  }

  return segments
}

function findApplicableRate(time: dayjs.Dayjs, rates: Rate[]): Rate {
  const dayOfWeek = time.day()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  const inValidRange = (rate: Rate): boolean => {
    const ruleStart = dayjs(rate.validFrom).startOf('day')
    const ruleEnd = dayjs(rate.validTo).endOf('day')
    return time.isAfter(ruleStart) && time.isBefore(ruleEnd)
  }

  const inDateRange = (rate: Rate): boolean => {
    const seasonStart = dayjs(rate.startTime)
    const seasonEnd = dayjs(rate.endTime)
    return time.isAfter(seasonStart) && time.isBefore(seasonEnd)
  }

  const holidayRate = rates.find(r => {
    if (r.type !== 'holiday' || !r.isActive) return false
    return inValidRange(r) && inDateRange(r)
  })
  if (holidayRate) return holidayRate

  const peakRate = rates.find(r => {
    if (r.type !== 'peak' || !r.isActive) return false
    return inValidRange(r) && inDateRange(r)
  })
  if (peakRate && !isWeekend) return peakRate

  const weekendRate = rates.find(r => {
    if (r.type !== 'weekend' || !r.isActive) return false
    return inValidRange(r) && isWeekend
  })
  if (weekendRate) return weekendRate

  if (peakRate) return peakRate

  const offPeakRate = rates.find(r => r.type === 'off-peak' && r.isActive && inValidRange(r))
  return offPeakRate || {
    id: 'default',
    name: '平日标准价',
    type: 'off-peak',
    startTime: '2000-01-01 00:00:00',
    endTime: '2099-12-31 23:59:59',
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
  let nextChange = endTime.clone()

  const nextMidnight = currentTime.clone().add(1, 'day').startOf('day')
  if (nextMidnight.isAfter(currentTime) && nextMidnight.isBefore(nextChange)) {
    nextChange = nextMidnight
  }

  for (const rate of rates) {
    if (!rate.isActive) continue
    
    const importantDates = [
      dayjs(rate.startTime),
      dayjs(rate.endTime),
      dayjs(rate.validFrom).startOf('day'),
      dayjs(rate.validTo).endOf('day')
    ]

    for (const datePoint of importantDates) {
      if (datePoint.isAfter(currentTime) && datePoint.isBefore(nextChange)) {
        nextChange = datePoint
      }
    }
  }

  return nextChange
}

export function calculateTotalAmount(segments: TimeSegment[]): number {
  const total = segments.reduce((sum, seg) => sum + seg.segmentAmount, 0)
  return Number(total.toFixed(2))
}

export function calculateTotalDays(segments: TimeSegment[]): number {
  const total = segments.reduce((sum, seg) => sum + seg.duration, 0)
  return Number(total.toFixed(2))
}

export function calculateEquipmentTotal(
  rentals: EquipmentRental[],
  checkInTime: string,
  checkOutTime: string
): number {
  const totalHours = dayjs(checkOutTime).diff(dayjs(checkInTime), 'hour', true)
  const days = Math.max(1, totalHours / 24)
  return Number(rentals.reduce((sum, rental) => {
    const daysToUse = rental.days || days
    return sum + rental.unitPrice * rental.quantity * daysToUse
  }, 0).toFixed(2))
}

export function calculateEquipmentRental(
  equipment: Equipment,
  quantity: number,
  checkInTime: string,
  checkOutTime: string
): EquipmentRental {
  const totalHours = dayjs(checkOutTime).diff(dayjs(checkInTime), 'hour', true)
  const days = Math.max(1, Number((totalHours / 24).toFixed(2)))
  return {
    equipmentId: equipment.id,
    equipmentName: equipment.name,
    quantity,
    unitPrice: equipment.price,
    days,
    totalAmount: Number((equipment.price * quantity * days).toFixed(2))
  }
}

export function generateBillNo(): string {
  const now = dayjs()
  const dateStr = now.format('YYYYMMDD')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `BILL${dateStr}${random}`
}
