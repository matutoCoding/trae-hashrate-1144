<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">账单管理</h2>
      <div>
        <el-button @click="exportExcel">
          <el-icon><Download /></el-icon>
          导出Excel
        </el-button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">总账单数</div>
        <div class="stat-value">{{ billStore.bills.length }}</div>
      </div>
      <div class="stat-card success">
        <div class="stat-label">已收金额</div>
        <div class="stat-value">¥{{ totalPaid.toFixed(2) }}</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-label">待收金额</div>
        <div class="stat-value">¥{{ totalUnpaid.toFixed(2) }}</div>
      </div>
      <div class="stat-card info">
        <div class="stat-label">本月营收</div>
        <div class="stat-value">¥{{ monthRevenue.toFixed(2) }}</div>
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
        <el-form-item label="账单状态">
          <el-select v-model="filterForm.status" placeholder="全部" clearable style="width: 150px">
            <el-option label="未支付" value="unpaid" />
            <el-option label="部分支付" value="partial" />
            <el-option label="已支付" value="paid" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadBills">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card style="margin-top: 16px">
      <el-table :data="filteredBills" border stripe>
        <el-table-column prop="billNo" label="账单编号" width="180" />
        <el-table-column prop="customerName" label="客户姓名" width="100" />
        <el-table-column prop="campsiteName" label="营位" width="140" />
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
        <el-table-column prop="totalDays" label="天数" width="80" />
        <el-table-column label="住宿金额" width="120">
          <template #default="{ row }">¥{{ row.accommodationAmount.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="装备金额" width="120">
          <template #default="{ row }">¥{{ row.equipmentAmount.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="总金额" width="120">
          <template #default="{ row }">¥{{ row.totalAmount.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="已支付" width="120">
          <template #default="{ row }">¥{{ row.paidAmount.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button size="small" @click="viewDetail(row)">详情</el-button>
              <el-button
                v-if="row.status !== 'paid'"
                size="small"
                type="success"
                @click="showPaymentDialog(row)"
              >
                收款
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="detailDialogVisible"
      title="账单详情"
      width="800px"
    >
      <div v-if="currentBill">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="账单编号">{{ currentBill.billNo }}</el-descriptions-item>
          <el-descriptions-item label="开单时间">{{ formatDate(currentBill.issueTime) }}</el-descriptions-item>
          <el-descriptions-item label="客户姓名">{{ currentBill.customerName }}</el-descriptions-item>
          <el-descriptions-item label="营位">{{ currentBill.campsiteName }}</el-descriptions-item>
          <el-descriptions-item label="入住时间">{{ formatDate(currentBill.checkInTime) }}</el-descriptions-item>
          <el-descriptions-item label="退房时间">{{ formatDate(currentBill.checkOutTime) }}</el-descriptions-item>
          <el-descriptions-item label="住宿天数">{{ currentBill.totalDays }}天</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentBill.status)">
              {{ getStatusText(currentBill.status) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div class="form-section" style="margin-top: 24px;">
          <h3 class="section-title">时段费用明细</h3>
          <el-table :data="currentBill.timeSegments" border size="small">
            <el-table-column prop="rateName" label="费率类型" />
            <el-table-column label="时间段">
              <template #default="{ row }">
                {{ formatDate(row.startTime) }} - {{ formatDate(row.endTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="duration" label="天数" width="80">
              <template #default="{ row }">{{ row.duration }}天</template>
            </el-table-column>
            <el-table-column label="单价" width="120">
              <template #default="{ row }">¥{{ row.unitPrice.toFixed(2) }}/天</template>
            </el-table-column>
            <el-table-column label="倍率" width="100">
              <template #default="{ row }">{{ row.rateMultiplier }}x</template>
            </el-table-column>
            <el-table-column label="小计" width="120">
              <template #default="{ row }">¥{{ row.segmentAmount.toFixed(2) }}</template>
            </el-table-column>
          </el-table>
        </div>

        <div class="price-breakdown">
          <div class="breakdown-item">
            <span>住宿合计</span>
            <span>¥{{ currentBill.accommodationAmount.toFixed(2) }}</span>
          </div>
          <div class="breakdown-item" v-if="currentBill.equipmentAmount > 0">
            <span>装备租赁</span>
            <span>¥{{ currentBill.equipmentAmount.toFixed(2) }}</span>
          </div>
          <div class="breakdown-item" v-if="currentBill.discountAmount > 0">
            <span>优惠折扣</span>
            <span>-¥{{ currentBill.discountAmount.toFixed(2) }}</span>
          </div>
          <div class="breakdown-item total">
            <span>应收总额</span>
            <span>¥{{ currentBill.totalAmount.toFixed(2) }}</span>
          </div>
          <div class="breakdown-item">
            <span>已收金额</span>
            <span>¥{{ currentBill.paidAmount.toFixed(2) }}</span>
          </div>
          <div class="breakdown-item" style="color: #dc2626; font-weight: 600;">
            <span>待收金额</span>
            <span>¥{{ currentBill.unpaidAmount.toFixed(2) }}</span>
          </div>
        </div>

        <div v-if="currentBill.paymentMethod">
          <el-descriptions :column="2" border style="margin-top: 16px;">
            <el-descriptions-item label="支付方式">{{ currentBill.paymentMethod }}</el-descriptions-item>
            <el-descriptions-item label="支付时间">{{ formatDate(currentBill.paymentTime || '') }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      <template #footer>
        <el-button
          v-if="currentBill && currentBill.status !== 'paid'"
          type="primary"
          @click="showPaymentDialog(currentBill)"
        >
          立即收款
        </el-button>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="paymentDialogVisible"
      title="收款"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="paymentForm" :rules="paymentRules" ref="paymentFormRef" label-width="100px">
        <el-form-item label="账单编号">
          <el-input v-model="currentBill?.billNo" disabled />
        </el-form-item>
        <el-form-item label="应收金额">
          <el-input :value="`¥${currentBill?.unpaidAmount.toFixed(2)}`" disabled />
        </el-form-item>
        <el-form-item label="收款金额" prop="amount">
          <el-input-number
            v-model="paymentForm.amount"
            :min="0"
            :max="currentBill?.unpaidAmount || 0"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="支付方式" prop="paymentMethod">
          <el-select v-model="paymentForm.paymentMethod" placeholder="请选择支付方式" style="width: 100%">
            <el-option label="现金" value="现金" />
            <el-option label="微信支付" value="微信支付" />
            <el-option label="支付宝" value="支付宝" />
            <el-option label="银行卡" value="银行卡" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paymentDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmPayment">确认收款</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import type { Bill } from '@/types'
import { useBillStore } from '@/stores/bill'

const billStore = useBillStore()

const detailDialogVisible = ref(false)
const paymentDialogVisible = ref(false)
const currentBill = ref<Bill | null>(null)
const paymentFormRef = ref<FormInstance>()

const filterForm = reactive({
  dateRange: [] as string[],
  status: ''
})

const paymentForm = reactive({
  amount: 0,
  paymentMethod: ''
})

const paymentRules: FormRules = {
  amount: [{ required: true, message: '请输入收款金额', trigger: 'blur' }],
  paymentMethod: [{ required: true, message: '请选择支付方式', trigger: 'change' }]
}

const filteredBills = computed(() => {
  let result = [...billStore.bills]

  if (filterForm.status) {
    result = result.filter(b => b.status === filterForm.status)
  }

  if (filterForm.dateRange && filterForm.dateRange.length === 2) {
    const [start, end] = filterForm.dateRange
    result = result.filter(b => {
      const issueDate = dayjs(b.issueTime)
      return issueDate.isAfter(dayjs(start).subtract(1, 'day')) &&
             issueDate.isBefore(dayjs(end).add(1, 'day'))
    })
  }

  return result.sort((a, b) => new Date(b.issueTime).getTime() - new Date(a.issueTime).getTime())
})

const totalPaid = computed(() => 
  billStore.bills.reduce((sum, b) => sum + b.paidAmount, 0)
)

const totalUnpaid = computed(() => 
  billStore.bills.reduce((sum, b) => sum + b.unpaidAmount, 0)
)

const monthRevenue = computed(() => {
  const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD')
  const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD')
  const monthBills = billStore.getBillsByDateRange(startOfMonth, endOfMonth)
  return monthBills.reduce((sum, b) => sum + b.paidAmount, 0)
})

function getStatusType(status: Bill['status']): string {
  const map: Record<string, string> = {
    unpaid: 'danger',
    partial: 'warning',
    paid: 'success'
  }
  return map[status] || 'info'
}

function getStatusText(status: Bill['status']): string {
  const map: Record<string, string> = {
    unpaid: '未支付',
    partial: '部分支付',
    paid: '已支付'
  }
  return map[status] || status
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}

function viewDetail(bill: Bill) {
  currentBill.value = bill
  detailDialogVisible.value = true
}

function showPaymentDialog(bill: Bill) {
  currentBill.value = bill
  paymentForm.amount = bill.unpaidAmount
  paymentForm.paymentMethod = ''
  paymentDialogVisible.value = true
}

async function confirmPayment() {
  if (!paymentFormRef.value || !currentBill.value) return

  const valid = await paymentFormRef.value.validate().catch(() => false)
  if (!valid) return

  const updatedBill = billStore.addPayment(
    currentBill.value.id,
    paymentForm.amount,
    paymentForm.paymentMethod
  )

  if (updatedBill) {
    currentBill.value = updatedBill
    ElMessage.success('收款成功')
    paymentDialogVisible.value = false
  }
}

function loadBills() {
  // Trigger reactive update
}

function resetFilter() {
  filterForm.dateRange = []
  filterForm.status = ''
}

function exportExcel() {
  const exportData = filteredBills.value.map(bill => ({
    '账单编号': bill.billNo,
    '客户姓名': bill.customerName,
    '营位': bill.campsiteName,
    '入住时间': formatDate(bill.checkInTime),
    '退房时间': formatDate(bill.checkOutTime),
    '天数': bill.totalDays,
    '住宿金额': bill.accommodationAmount,
    '装备金额': bill.equipmentAmount,
    '总金额': bill.totalAmount,
    '已支付': bill.paidAmount,
    '待支付': bill.unpaidAmount,
    '状态': getStatusText(bill.status),
    '开单时间': formatDate(bill.issueTime)
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(exportData)
  XLSX.utils.book_append_sheet(wb, ws, '账单列表')
  XLSX.writeFile(wb, `账单导出_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`)
  ElMessage.success('导出成功')
}
</script>

<style lang="scss" scoped>
.filter-card {
  :deep(.el-form-item) {
    margin-bottom: 0;
  }
}
</style>
