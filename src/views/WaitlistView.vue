<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">候补补位</h2>
      <el-button type="primary" @click="showAddDialog">
        <el-icon><Plus /></el-icon>
        新增候补
      </el-button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">等待中</div>
        <div class="stat-value">{{ waitlistStore.waitingList.length }}</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-label">待确认</div>
        <div class="stat-value">{{ waitlistStore.notifiedList.length }}</div>
      </div>
      <div class="stat-card success">
        <div class="stat-label">已确认</div>
        <div class="stat-value">{{ confirmedCount }}</div>
      </div>
      <div class="stat-card info">
        <div class="stat-label">今日通知</div>
        <div class="stat-value">{{ todayNotified }}</div>
      </div>
    </div>

    <el-card>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="等待中" name="waiting">
          <el-table :data="waitlistStore.waitingList" border stripe>
            <el-table-column prop="queuePosition" label="排队号" width="80" align="center">
              <template #default="{ row }">
                <el-tag type="primary" size="large">#{{ row.queuePosition }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="营位" width="140">
              <template #default="{ row }">
                {{ getCampsiteName(row.campsiteId) }}
              </template>
            </el-table-column>
            <el-table-column prop="customerName" label="客户姓名" width="100" />
            <el-table-column prop="customerPhone" label="联系电话" width="130" />
            <el-table-column label="入住日期" width="160">
              <template #default="{ row }">
                {{ formatDate(row.checkInTime) }}
              </template>
            </el-table-column>
            <el-table-column label="退房日期" width="160">
              <template #default="{ row }">
                {{ formatDate(row.checkOutTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="peopleCount" label="人数" width="80" />
            <el-table-column label="登记时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.bookingTime) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button
                    size="small"
                    type="success"
                    @click="convertToBooking(row.id)"
                  >
                    转预订
                  </el-button>
                  <el-button
                    size="small"
                    type="danger"
                    @click="cancelWaitlist(row.id)"
                  >
                    取消
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="待确认" name="notified">
          <el-table :data="waitlistStore.notifiedList" border stripe>
            <el-table-column prop="queuePosition" label="排队号" width="80" align="center">
              <template #default="{ row }">
                <el-tag type="warning" size="large">#{{ row.queuePosition }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="营位" width="140">
              <template #default="{ row }">
                {{ getCampsiteName(row.campsiteId) }}
              </template>
            </el-table-column>
            <el-table-column prop="customerName" label="客户姓名" width="100" />
            <el-table-column prop="customerPhone" label="联系电话" width="130" />
            <el-table-column label="通知时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.notifiedTime || '') }}
              </template>
            </el-table-column>
            <el-table-column label="过期时间" width="180">
              <template #default="{ row }">
                <el-tag :type="isExpired(row.expireTime || '') ? 'danger' : 'warning'">
                  {{ formatDate(row.expireTime || '') }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="剩余时间" width="120">
              <template #default="{ row }">
                <span :class="{ 'text-red-600': getRemainingMinutes(row.expireTime || '') < 10 }">
                  {{ getRemainingTime(row.expireTime || '') }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button
                    size="small"
                    type="success"
                    @click="confirmWaitlist(row.id)"
                  >
                    确认预订
                  </el-button>
                  <el-button
                    size="small"
                    type="danger"
                    @click="cancelWaitlist(row.id)"
                  >
                    取消
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="全部记录" name="all">
          <el-table :data="waitlistStore.waitlist" border stripe>
            <el-table-column prop="queuePosition" label="排队号" width="80" align="center">
              <template #default="{ row }">
                #{{ row.queuePosition }}
              </template>
            </el-table-column>
            <el-table-column label="营位" width="140">
              <template #default="{ row }">
                {{ getCampsiteName(row.campsiteId) }}
              </template>
            </el-table-column>
            <el-table-column prop="customerName" label="客户姓名" width="100" />
            <el-table-column prop="customerPhone" label="联系电话" width="130" />
            <el-table-column label="入住日期" width="160">
              <template #default="{ row }">
                {{ formatDate(row.checkInTime) }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="登记时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.bookingTime) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button
                    v-if="row.status === 'waiting'"
                    size="small"
                    type="danger"
                    @click="cancelWaitlist(row.id)"
                  >
                    取消
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      title="新增候补"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <div class="form-section">
          <h3 class="section-title">选择营位</h3>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="营位类型" prop="campsiteType">
                <el-select v-model="form.campsiteType" placeholder="请选择类型" style="width: 100%">
                  <el-option label="帐篷营位" value="tent" />
                  <el-option label="房车营位" value="rv" />
                  <el-option label="木屋营位" value="cabin" />
                  <el-option label="团体营位" value="group" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="营位" prop="campsiteId">
                <el-select v-model="form.campsiteId" placeholder="请选择营位" style="width: 100%">
                  <el-option
                    v-for="site in filteredCampsites"
                    :key="site.id"
                    :label="site.name"
                    :value="site.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="入住时间" prop="checkInTime">
                <el-date-picker
                  v-model="form.checkInTime"
                  type="datetime"
                  placeholder="选择入住时间"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="退房时间" prop="checkOutTime">
                <el-date-picker
                  v-model="form.checkOutTime"
                  type="datetime"
                  placeholder="选择退房时间"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="人数" prop="peopleCount">
            <el-input-number v-model="form.peopleCount" :min="1" :max="20" style="width: 200px" />
          </el-form-item>
        </div>

        <div class="form-section">
          <h3 class="section-title">客户信息</h3>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="姓名" prop="customerName">
                <el-input v-model="form.customerName" placeholder="请输入姓名" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="电话" prop="customerPhone">
                <el-input v-model="form.customerPhone" placeholder="请输入电话" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <el-form-item label="备注">
          <el-input
            v-model="form.notes"
            type="textarea"
            :rows="2"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">确认候补</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import dayjs from 'dayjs'
import type { Waitlist, Campsite } from '@/types'
import { useWaitlistStore } from '@/stores/waitlist'
import { useCampsiteStore } from '@/stores/campsite'

const waitlistStore = useWaitlistStore()
const campsiteStore = useCampsiteStore()

const activeTab = ref('waiting')
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  campsiteType: '',
  campsiteId: '',
  customerName: '',
  customerPhone: '',
  checkInTime: '',
  checkOutTime: '',
  peopleCount: 1,
  notes: ''
})

const rules: FormRules = {
  campsiteId: [{ required: true, message: '请选择营位', trigger: 'change' }],
  customerName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  customerPhone: [{ required: true, message: '请输入电话', trigger: 'blur' }],
  checkInTime: [{ required: true, message: '请选择入住时间', trigger: 'change' }],
  checkOutTime: [{ required: true, message: '请选择退房时间', trigger: 'change' }]
}

let timer: NodeJS.Timeout
const now = ref(dayjs())

const filteredCampsites = computed(() => {
  if (!form.campsiteType) {
    return campsiteStore.campsites.filter(c => c.status === 'available')
  }
  return campsiteStore.campsites.filter(c => c.type === form.campsiteType && c.status === 'available')
})

const confirmedCount = computed(() => 
  waitlistStore.waitlist.filter(w => w.status === 'confirmed').length
)

const todayNotified = computed(() => {
  const today = dayjs().format('YYYY-MM-DD')
  return waitlistStore.waitlist.filter(w => 
    w.notifiedTime && dayjs(w.notifiedTime).format('YYYY-MM-DD') === today
  ).length
})

function getCampsiteName(id: string): string {
  const campsite = campsiteStore.getCampsiteById(id)
  return campsite?.name || '-'
}

function getStatusType(status: Waitlist['status']): string {
  const map: Record<string, string> = {
    waiting: 'primary',
    notified: 'warning',
    confirmed: 'success',
    cancelled: 'info',
    expired: 'danger'
  }
  return map[status] || 'info'
}

function getStatusText(status: Waitlist['status']): string {
  const map: Record<string, string> = {
    waiting: '等待中',
    notified: '待确认',
    confirmed: '已确认',
    cancelled: '已取消',
    expired: '已过期'
  }
  return map[status] || status
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}

function isExpired(expireTime: string): boolean {
  if (!expireTime) return false
  return dayjs().isAfter(dayjs(expireTime))
}

function getRemainingMinutes(expireTime: string): number {
  if (!expireTime) return 0
  return dayjs(expireTime).diff(now.value, 'minute')
}

function getRemainingTime(expireTime: string): string {
  if (!expireTime) return '-'
  const minutes = getRemainingMinutes(expireTime)
  if (minutes <= 0) return '已过期'
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}小时${mins}分钟`
}

function showAddDialog() {
  Object.assign(form, {
    campsiteType: '',
    campsiteId: '',
    customerName: '',
    customerPhone: '',
    checkInTime: '',
    checkOutTime: '',
    peopleCount: 1,
    notes: ''
  })
  dialogVisible.value = true
}

async function submit() {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  if (dayjs(form.checkOutTime).isBefore(dayjs(form.checkInTime))) {
    ElMessage.error('退房时间不能早于入住时间')
    return
  }

  waitlistStore.addToWaitlist({
    campsiteId: form.campsiteId,
    customerName: form.customerName,
    customerPhone: form.customerPhone,
    checkInTime: form.checkInTime,
    checkOutTime: form.checkOutTime,
    peopleCount: form.peopleCount,
    notes: form.notes
  })

  ElMessage.success('候补登记成功')
  dialogVisible.value = false
}

function confirmWaitlist(id: string) {
  ElMessageBox.confirm('确认该候补转为预订吗？', '确认', {
    type: 'warning'
  }).then(() => {
    const booking = waitlistStore.convertWaitlistToBooking(id)
    if (booking) {
      ElMessage.success('已转为预订，预订编号: ' + booking.id)
    }
  }).catch(() => {})
}

function convertToBooking(id: string) {
  ElMessageBox.confirm('直接将该候补转为预订吗？', '转预订', {
    type: 'warning'
  }).then(() => {
    const booking = waitlistStore.convertWaitlistToBooking(id)
    if (booking) {
      ElMessage.success('已转为预订，预订编号: ' + booking.id)
    }
  }).catch(() => {})
}

function cancelWaitlist(id: string) {
  ElMessageBox.confirm('确定要取消该候补吗？', '取消', {
    type: 'warning'
  }).then(() => {
    waitlistStore.cancelWaitlist(id)
    ElMessage.success('已取消')
  }).catch(() => {})
}

onMounted(() => {
  timer = setInterval(() => {
    now.value = dayjs()
  }, 60000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped>
.text-red-600 {
  color: #dc2626;
  font-weight: 600;
}
</style>
