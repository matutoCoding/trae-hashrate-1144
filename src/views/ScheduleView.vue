<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">营位排期</h2>
      <el-button type="primary" @click="showBookingDialog">
        <el-icon><Plus /></el-icon>
        新建预订
      </el-button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">今日预订</div>
        <div class="stat-value">{{ todayBookings }}</div>
      </div>
      <div class="stat-card success">
        <div class="stat-label">已入住</div>
        <div class="stat-value">{{ checkedInCount }}</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-label">待确认</div>
        <div class="stat-value">{{ pendingCount }}</div>
      </div>
      <div class="stat-card info">
        <div class="stat-label">今日营收</div>
        <div class="stat-value">¥{{ todayRevenue.toFixed(2) }}</div>
      </div>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="营位类型">
          <el-select v-model="filterForm.type" placeholder="全部" clearable style="width: 150px">
            <el-option label="帐篷营位" value="tent" />
            <el-option label="房车营位" value="rv" />
            <el-option label="木屋营位" value="cabin" />
            <el-option label="团体营位" value="group" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部" clearable style="width: 150px">
            <el-option label="待确认" value="pending" />
            <el-option label="已确认" value="confirmed" />
            <el-option label="已入住" value="checked-in" />
            <el-option label="已退房" value="checked-out" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadBookings">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card style="margin-top: 16px">
      <el-table :data="filteredBookings" v-loading="loading" stripe>
        <el-table-column prop="id" label="预订编号" width="120" />
        <el-table-column label="营位" width="140">
          <template #default="{ row }">
            {{ getCampsiteName(row.campsiteId) }}
          </template>
        </el-table-column>
        <el-table-column prop="customerName" label="客户姓名" width="100" />
        <el-table-column prop="customerPhone" label="联系电话" width="130" />
        <el-table-column label="入住日期" width="180">
          <template #default="{ row }">
            {{ formatDate(row.checkInTime) }}
          </template>
        </el-table-column>
        <el-table-column label="退房日期" width="180">
          <template #default="{ row }">
            {{ formatDate(row.checkOutTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="peopleCount" label="人数" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="120">
          <template #default="{ row }">
            ¥{{ row.totalAmount.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button
                v-if="row.status === 'pending'"
                size="small"
                type="success"
                @click="confirmBooking(row.id)"
              >
                确认
              </el-button>
              <el-button
                v-if="row.status === 'confirmed'"
                size="small"
                type="primary"
                @click="checkIn(row.id)"
              >
                入住
              </el-button>
              <el-button
                v-if="row.status === 'checked-in'"
                size="small"
                type="warning"
                @click="checkOut(row.id)"
              >
                退房
              </el-button>
              <el-button size="small" @click="viewDetail(row)">详情</el-button>
              <el-button
                size="small"
                type="danger"
                :disabled="['checked-out', 'cancelled', 'expired'].includes(row.status)"
                @click="cancelBooking(row.id)"
              >
                取消
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="bookingDialogVisible"
      title="新建预订"
      width="900px"
      :close-on-click-modal="false"
    >
      <el-form :model="bookingForm" :rules="bookingRules" ref="bookingFormRef" label-width="100px">
        <div class="form-section">
          <h3 class="section-title">基本信息</h3>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="营位" prop="campsiteId">
                <el-select
                  v-model="bookingForm.campsiteId"
                  placeholder="请选择营位"
                  style="width: 100%"
                  @change="calculatePrice"
                >
                  <el-option
                    v-for="site in availableCampsites"
                    :key="site.id"
                    :label="`${site.name} (${getTypeText(site.type)}) - ¥${site.priceBase}/天`"
                    :value="site.id"
                    :disabled="!checkAvailability(site.id)"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="人数" prop="peopleCount">
                <el-input-number v-model="bookingForm.peopleCount" :min="1" :max="20" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="入住时间" prop="checkInTime">
                <el-date-picker
                  v-model="bookingForm.checkInTime"
                  type="datetime"
                  placeholder="选择入住时间"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 100%"
                  @change="calculatePrice"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="退房时间" prop="checkOutTime">
                <el-date-picker
                  v-model="bookingForm.checkOutTime"
                  type="datetime"
                  placeholder="选择退房时间"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 100%"
                  @change="calculatePrice"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div class="form-section">
          <h3 class="section-title">客户信息</h3>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="姓名" prop="customerName">
                <el-input v-model="bookingForm.customerName" placeholder="请输入姓名" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="电话" prop="customerPhone">
                <el-input v-model="bookingForm.customerPhone" placeholder="请输入电话" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="身份证号" prop="customerIdCard">
                <el-input v-model="bookingForm.customerIdCard" placeholder="请输入身份证号" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="预计到达" prop="expectedArrivalTime">
                <el-date-picker
                  v-model="bookingForm.expectedArrivalTime"
                  type="datetime"
                  placeholder="预计到达时间"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div class="form-section">
          <h3 class="section-title">装备租赁</h3>
          <el-table :data="bookingForm.equipmentRentals" border size="small">
            <el-table-column prop="equipmentName" label="装备名称" />
            <el-table-column prop="unitPrice" label="单价(元/天)" width="120">
              <template #default="{ row }">¥{{ row.unitPrice }}</template>
            </el-table-column>
            <el-table-column label="数量" width="120">
              <template #default="{ row, $index }">
                <el-input-number
                  v-model="row.quantity"
                  :min="1"
                  size="small"
                  @change="calculatePrice"
                />
              </template>
            </el-table-column>
            <el-table-column prop="days" label="天数" width="100" />
            <el-table-column label="小计" width="120">
              <template #default="{ row }">
                ¥{{ (row.unitPrice * row.quantity * row.days).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ $index }">
                <el-button type="danger" size="small" link @click="removeEquipment($index)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button type="primary" size="small" style="margin-top: 12px" @click="showEquipmentDialog">
            <el-icon><Plus /></el-icon>
            添加装备
          </el-button>
        </div>

        <div class="price-breakdown" v-if="priceInfo.segments.length > 0">
          <h4 style="margin-bottom: 12px; color: #374151;">费用明细</h4>
          <div v-for="(segment, index) in priceInfo.segments" :key="index" class="breakdown-item">
            <span>{{ segment.rateName }} ({{ formatDate(segment.startTime) }} - {{ formatDate(segment.endTime) }})</span>
            <span>¥{{ segment.segmentAmount.toFixed(2) }} ({{ segment.duration }}天 × ¥{{ segment.unitPrice.toFixed(2) }})</span>
          </div>
          <div class="breakdown-item" v-if="priceInfo.equipmentAmount > 0">
            <span>装备租赁</span>
            <span>¥{{ priceInfo.equipmentAmount.toFixed(2) }}</span>
          </div>
          <div class="breakdown-item" v-if="depositAmount > 0">
            <span>定金 (30%)</span>
            <span>¥{{ depositAmount.toFixed(2) }}</span>
          </div>
          <div class="breakdown-item total">
            <span>总计</span>
            <span>¥{{ priceInfo.totalAmount.toFixed(2) }}</span>
          </div>
        </div>

        <el-form-item label="备注">
          <el-input
            v-model="bookingForm.notes"
            type="textarea"
            :rows="2"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="bookingDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitBooking">确认预订</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="equipmentDialogVisible" title="选择装备" width="700px">
      <el-table :data="equipmentStore.availableEquipment" border @selection-change="handleEquipmentSelection">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="name" label="装备名称" />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column prop="price" label="租金(元/天)" width="120">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="80" />
        <el-table-column label="租赁数量" width="150">
          <template #default="{ row }">
            <el-input-number
              v-model="equipmentQuantities[row.id]"
              :min="1"
              :max="row.stock"
              size="small"
              :disabled="!selectedEquipmentIds.includes(row.id)"
            />
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="equipmentDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddEquipment">确认添加</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailDialogVisible" title="预订详情" width="700px">
      <el-descriptions :column="2" border v-if="currentBooking">
        <el-descriptions-item label="预订编号">{{ currentBooking.id }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(currentBooking.status)">
            {{ getStatusText(currentBooking.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="营位">{{ getCampsiteName(currentBooking.campsiteId) }}</el-descriptions-item>
        <el-descriptions-item label="人数">{{ currentBooking.peopleCount }}人</el-descriptions-item>
        <el-descriptions-item label="客户姓名">{{ currentBooking.customerName }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ currentBooking.customerPhone }}</el-descriptions-item>
        <el-descriptions-item label="入住时间">{{ formatDate(currentBooking.checkInTime) }}</el-descriptions-item>
        <el-descriptions-item label="退房时间">{{ formatDate(currentBooking.checkOutTime) }}</el-descriptions-item>
        <el-descriptions-item label="总金额">¥{{ currentBooking.totalAmount.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="已支付">¥{{ currentBooking.paidAmount.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="定金">¥{{ currentBooking.depositAmount.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="预订时间">{{ formatDate(currentBooking.bookingTime) }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ currentBooking.notes || '-' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button v-if="currentBooking && !currentBooking.billId" type="primary" @click="generateBill">
          生成账单
        </el-button>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import dayjs from 'dayjs'
import type { Booking, Campsite, EquipmentRental, TimeSegment } from '@/types'
import { useCampsiteStore } from '@/stores/campsite'
import { useBookingStore } from '@/stores/booking'
import { useEquipmentStore } from '@/stores/equipment'
import { useBillStore } from '@/stores/bill'
import { calculateEquipmentRental } from '@/utils/billing'

const campsiteStore = useCampsiteStore()
const bookingStore = useBookingStore()
const equipmentStore = useEquipmentStore()
const billStore = useBillStore()

const loading = ref(false)
const bookingDialogVisible = ref(false)
const equipmentDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const currentBooking = ref<Booking | null>(null)
const bookingFormRef = ref<FormInstance>()

const filterForm = reactive({
  dateRange: [] as string[],
  type: '',
  status: ''
})

const bookingForm = reactive({
  campsiteId: '',
  customerName: '',
  customerPhone: '',
  customerIdCard: '',
  checkInTime: '',
  checkOutTime: '',
  peopleCount: 1,
  expectedArrivalTime: '',
  equipmentRentals: [] as EquipmentRental[],
  notes: ''
})

const bookingRules: FormRules = {
  campsiteId: [{ required: true, message: '请选择营位', trigger: 'change' }],
  customerName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  customerPhone: [{ required: true, message: '请输入电话', trigger: 'blur' }],
  checkInTime: [{ required: true, message: '请选择入住时间', trigger: 'change' }],
  checkOutTime: [{ required: true, message: '请选择退房时间', trigger: 'change' }],
  expectedArrivalTime: [{ required: true, message: '请选择预计到达时间', trigger: 'change' }]
}

const priceInfo = ref<{ segments: TimeSegment[], totalAmount: number, equipmentAmount: number }>({
  segments: [],
  totalAmount: 0,
  equipmentAmount: 0
})

const depositAmount = computed(() => priceInfo.value.totalAmount * 0.3)

const selectedEquipmentIds = ref<string[]>([])
const equipmentQuantities = reactive<Record<string, number>>({})

const availableCampsites = computed(() => campsiteStore.availableCampsites)

const filteredBookings = computed(() => {
  let result = [...bookingStore.bookings]

  if (filterForm.type) {
    const campsiteIds = campsiteStore.campsites
      .filter(c => c.type === filterForm.type)
      .map(c => c.id)
    result = result.filter(b => campsiteIds.includes(b.campsiteId))
  }

  if (filterForm.status) {
    result = result.filter(b => b.status === filterForm.status)
  }

  if (filterForm.dateRange && filterForm.dateRange.length === 2) {
    const [start, end] = filterForm.dateRange
    result = result.filter(b => {
      const bookingStart = dayjs(b.checkInTime)
      const bookingEnd = dayjs(b.checkOutTime)
      return bookingStart.isAfter(dayjs(start).subtract(1, 'day')) && 
             bookingEnd.isBefore(dayjs(end).add(1, 'day'))
    })
  }

  return result.sort((a, b) => new Date(b.bookingTime).getTime() - new Date(a.bookingTime).getTime())
})

const todayBookings = computed(() => {
  const today = dayjs().format('YYYY-MM-DD')
  return bookingStore.bookings.filter(b => 
    dayjs(b.bookingTime).format('YYYY-MM-DD') === today
  ).length
})

const checkedInCount = computed(() => 
  bookingStore.bookings.filter(b => b.status === 'checked-in').length
)

const pendingCount = computed(() => 
  bookingStore.bookings.filter(b => b.status === 'pending').length
)

const todayRevenue = computed(() => {
  const today = dayjs().format('YYYY-MM-DD')
  return billStore.calculateDailyRevenue(today)
})

function getCampsiteName(id: string): string {
  const campsite = campsiteStore.getCampsiteById(id)
  return campsite?.name || '-'
}

function getTypeText(type: Campsite['type']): string {
  const map: Record<string, string> = {
    tent: '帐篷',
    rv: '房车',
    cabin: '木屋',
    group: '团体'
  }
  return map[type] || type
}

function getStatusType(status: Booking['status']): string {
  const map: Record<string, string> = {
    pending: 'warning',
    confirmed: 'primary',
    'checked-in': 'success',
    'checked-out': 'info',
    cancelled: 'danger',
    expired: 'danger'
  }
  return map[status] || 'info'
}

function getStatusText(status: Booking['status']): string {
  const map: Record<string, string> = {
    pending: '待确认',
    confirmed: '已确认',
    'checked-in': '已入住',
    'checked-out': '已退房',
    cancelled: '已取消',
    expired: '已过期'
  }
  return map[status] || status
}

function formatDate(dateStr: string): string {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}

function checkAvailability(campsiteId: string): boolean {
  if (!bookingForm.checkInTime || !bookingForm.checkOutTime) return true
  return bookingStore.checkAvailability(campsiteId, bookingForm.checkInTime, bookingForm.checkOutTime)
}

function calculatePrice() {
  if (!bookingForm.campsiteId || !bookingForm.checkInTime || !bookingForm.checkOutTime) return

  const days = bookingForm.checkInTime && bookingForm.checkOutTime
    ? Math.ceil(dayjs(bookingForm.checkOutTime).diff(dayjs(bookingForm.checkInTime), 'hour', true) / 24)
    : 1

  bookingForm.equipmentRentals.forEach(rental => {
    rental.days = days
    rental.totalAmount = rental.unitPrice * rental.quantity * days
  })

  priceInfo.value = bookingStore.calculateBookingPrice(
    bookingForm.campsiteId,
    bookingForm.checkInTime,
    bookingForm.checkOutTime,
    bookingForm.equipmentRentals
  )
}

function showBookingDialog() {
  Object.assign(bookingForm, {
    campsiteId: '',
    customerName: '',
    customerPhone: '',
    customerIdCard: '',
    checkInTime: '',
    checkOutTime: '',
    peopleCount: 1,
    expectedArrivalTime: '',
    equipmentRentals: [],
    notes: ''
  })
  priceInfo.value = { segments: [], totalAmount: 0, equipmentAmount: 0 }
  bookingDialogVisible.value = true
}

function showEquipmentDialog() {
  selectedEquipmentIds.value = []
  Object.keys(equipmentQuantities).forEach(key => {
    delete equipmentQuantities[key]
  })
  equipmentStore.availableEquipment.forEach(e => {
    equipmentQuantities[e.id] = 1
  })
  equipmentDialogVisible.value = true
}

function handleEquipmentSelection(selection: any[]) {
  selectedEquipmentIds.value = selection.map(e => e.id)
}

function confirmAddEquipment() {
  const days = bookingForm.checkInTime && bookingForm.checkOutTime
    ? Math.ceil(dayjs(bookingForm.checkOutTime).diff(dayjs(bookingForm.checkInTime), 'hour', true) / 24)
    : 1

  selectedEquipmentIds.value.forEach(id => {
    const equipment = equipmentStore.getEquipmentById(id)
    if (equipment) {
      const existing = bookingForm.equipmentRentals.find(r => r.equipmentId === id)
      const qty = equipmentQuantities[id] || 1
      
      if (existing) {
        existing.quantity = qty
        existing.days = days
        existing.totalAmount = existing.unitPrice * qty * days
      } else {
        const rental = calculateEquipmentRental(
          equipment,
          qty,
          bookingForm.checkInTime || dayjs().format('YYYY-MM-DD HH:mm:ss'),
          bookingForm.checkOutTime || dayjs().add(1, 'day').format('YYYY-MM-DD HH:mm:ss')
        )
        bookingForm.equipmentRentals.push(rental)
      }
    }
  })

  calculatePrice()
  equipmentDialogVisible.value = false
  ElMessage.success('装备添加成功')
}

function removeEquipment(index: number) {
  bookingForm.equipmentRentals.splice(index, 1)
  calculatePrice()
}

async function submitBooking() {
  if (!bookingFormRef.value) return

  const valid = await bookingFormRef.value.validate().catch(() => false)
  if (!valid) return

  if (!checkAvailability(bookingForm.campsiteId)) {
    ElMessage.error('该营位在所选时间段已被预订')
    return
  }

  if (dayjs(bookingForm.checkOutTime).isBefore(dayjs(bookingForm.checkInTime))) {
    ElMessage.error('退房时间不能早于入住时间')
    return
  }

  const booking = bookingStore.createBooking({
    campsiteId: bookingForm.campsiteId,
    customerName: bookingForm.customerName,
    customerPhone: bookingForm.customerPhone,
    customerIdCard: bookingForm.customerIdCard,
    checkInTime: bookingForm.checkInTime,
    checkOutTime: bookingForm.checkOutTime,
    peopleCount: bookingForm.peopleCount,
    expectedArrivalTime: bookingForm.expectedArrivalTime,
    equipmentRentals: bookingForm.equipmentRentals,
    notes: bookingForm.notes
  })

  ElMessage.success('预订创建成功')
  bookingDialogVisible.value = false
}

function confirmBooking(id: string) {
  ElMessageBox.confirm('确认该预订吗？', '确认', {
    type: 'warning'
  }).then(() => {
    bookingStore.confirmBooking(id)
    ElMessage.success('预订已确认')
  }).catch(() => {})
}

function checkIn(id: string) {
  ElMessageBox.confirm('确认该客户入住吗？', '确认入住', {
    type: 'warning'
  }).then(() => {
    bookingStore.checkInBooking(id)
    ElMessage.success('已办理入住')
  }).catch(() => {})
}

function checkOut(id: string) {
  ElMessageBox.confirm('确认该客户退房吗？', '确认退房', {
    type: 'warning'
  }).then(() => {
    bookingStore.checkOutBooking(id)
    const bill = billStore.createBill(id)
    if (bill) {
      ElMessage.success(`已办理退房，账单编号: ${bill.billNo}`)
    }
  }).catch(() => {})
}

function cancelBooking(id: string) {
  ElMessageBox.confirm('确定要取消该预订吗？', '取消预订', {
    type: 'warning'
  }).then(() => {
    bookingStore.cancelBooking(id)
    ElMessage.success('预订已取消')
  }).catch(() => {})
}

function viewDetail(booking: Booking) {
  currentBooking.value = booking
  detailDialogVisible.value = true
}

function generateBill() {
  if (!currentBooking.value) return
  const bill = billStore.createBill(currentBooking.value.id)
  if (bill) {
    currentBooking.value.billId = bill.id
    ElMessage.success(`账单生成成功: ${bill.billNo}`)
    detailDialogVisible.value = false
  }
}

function loadBookings() {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 500)
}

function resetFilter() {
  filterForm.dateRange = []
  filterForm.type = ''
  filterForm.status = ''
}

onMounted(() => {
  loadBookings()
})
</script>

<style lang="scss" scoped>
.filter-card {
  :deep(.el-form-item) {
    margin-bottom: 0;
  }
}
</style>
