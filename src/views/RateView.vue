<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">费率管理</h2>
      <el-button type="primary" @click="showAddDialog">
        <el-icon><Plus /></el-icon>
        新增费率
      </el-button>
    </div>

    <el-alert
      title="费率说明"
      type="info"
      :closable="false"
      style="margin-bottom: 20px;"
    >
      <p>系统支持多档费率设置，优先级：节假日 > 周末 > 旺季 > 平日。</p>
      <p>跨费率时段的预订将自动拆分计算，各时段费用合计后生成最终账单。</p>
    </el-alert>

    <el-card>
      <el-table :data="rateStore.rates" border stripe>
        <el-table-column prop="name" label="费率名称" width="150" />
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">{{ getTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="适用时段">
          <template #default="{ row }">
            {{ formatDate(row.startTime) }} - {{ formatDate(row.endTime) }}
          </template>
        </el-table-column>
        <el-table-column label="有效期" width="300">
          <template #default="{ row }">
            {{ row.validFrom }} 至 {{ row.validTo }}
          </template>
        </el-table-column>
        <el-table-column label="价格倍率" width="120">
          <template #default="{ row }">
            <span :class="{ 'text-red-600 font-bold': row.priceMultiplier > 1 }">
              {{ row.priceMultiplier }}x
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.isActive"
              @change="toggleStatus(row.id)"
              active-text="启用"
              inactive-text="禁用"
            />
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button size="small" @click="editRate(row)">编辑</el-button>
              <el-button
                size="small"
                type="danger"
                @click="deleteRate(row.id)"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑费率' : '新增费率'"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="费率名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入费率名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="费率类型" prop="type">
              <el-select v-model="form.type" placeholder="请选择类型" style="width: 100%" @change="onTypeChange">
                <el-option label="平日标准价" value="off-peak" />
                <el-option label="周末价" value="weekend" />
                <el-option label="旺季价" value="peak" />
                <el-option label="节假日" value="holiday" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <div v-if="form.type === 'peak'" class="form-section">
          <h3 class="section-title">旺季时段</h3>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="开始日期" prop="startTime">
                <el-date-picker
                  v-model="form.startTime"
                  type="date"
                  placeholder="选择开始日期"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="结束日期" prop="endTime">
                <el-date-picker
                  v-model="form.endTime"
                  type="date"
                  placeholder="选择结束日期"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div v-else-if="form.type === 'holiday'" class="form-section">
          <h3 class="section-title">节假日时段</h3>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="开始时间" prop="startTime">
                <el-date-picker
                  v-model="form.startTime"
                  type="datetime"
                  placeholder="选择开始时间"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="结束时间" prop="endTime">
                <el-date-picker
                  v-model="form.endTime"
                  type="datetime"
                  placeholder="选择结束时间"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div v-else class="form-section">
          <h3 class="section-title">默认时段</h3>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="开始时间">
                <el-input v-model="form.startTime" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="结束时间">
                <el-input v-model="form.endTime" disabled />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="生效日期" prop="validFrom">
              <el-date-picker
                v-model="form.validFrom"
                type="date"
                placeholder="选择生效日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="失效日期" prop="validTo">
              <el-date-picker
                v-model="form.validTo"
                type="date"
                placeholder="选择失效日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="价格倍率" prop="priceMultiplier">
          <el-input-number
            v-model="form.priceMultiplier"
            :min="0.1"
            :max="10"
            :step="0.1"
            :precision="1"
            style="width: 200px"
          >
            <template #append>倍</template>
          </el-input-number>
          <span style="margin-left: 12px; color: #6b7280;">
            实际价格 = 基础价格 × 倍率
          </span>
        </el-form-item>

        <el-form-item label="状态" prop="isActive">
          <el-switch v-model="form.isActive" active-text="启用" inactive-text="禁用" />
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入费率描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import dayjs from 'dayjs'
import type { Rate } from '@/types'
import { useRateStore } from '@/stores/rate'

const rateStore = useRateStore()

const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref('')
const formRef = ref<FormInstance>()

const form = reactive({
  name: '',
  type: 'off-peak' as Rate['type'],
  startTime: '2024-01-01 00:00:00',
  endTime: '2099-12-31 23:59:59',
  priceMultiplier: 1,
  isActive: true,
  validFrom: dayjs().format('YYYY-MM-DD'),
  validTo: dayjs().add(1, 'year').format('YYYY-MM-DD'),
  description: ''
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入费率名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择费率类型', trigger: 'change' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  priceMultiplier: [{ required: true, message: '请输入价格倍率', trigger: 'blur' }],
  validFrom: [{ required: true, message: '请选择生效日期', trigger: 'change' }],
  validTo: [{ required: true, message: '请选择失效日期', trigger: 'change' }]
}

function getTypeText(type: Rate['type']): string {
  const map: Record<string, string> = {
    'off-peak': '平日',
    'weekend': '周末',
    'peak': '旺季',
    'holiday': '节假日'
  }
  return map[type] || type
}

function getTypeTagType(type: Rate['type']): string {
  const map: Record<string, string> = {
    'off-peak': 'info',
    'weekend': 'warning',
    'peak': 'danger',
    'holiday': 'success'
  }
  return map[type] || 'info'
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return dayjs(dateStr).format('YYYY-MM-DD')
}

function onTypeChange(type: Rate['type']) {
  if (type === 'off-peak' || type === 'weekend') {
    form.startTime = '2024-01-01 00:00:00'
    form.endTime = '2099-12-31 23:59:59'
  } else {
    form.startTime = ''
    form.endTime = ''
  }
}

function toggleStatus(id: string) {
  rateStore.toggleRateStatus(id)
  ElMessage.success('状态已更新')
}

function showAddDialog() {
  isEdit.value = false
  editId.value = ''
  Object.assign(form, {
    name: '',
    type: 'off-peak',
    startTime: '2024-01-01 00:00:00',
    endTime: '2099-12-31 23:59:59',
    priceMultiplier: 1,
    isActive: true,
    validFrom: dayjs().format('YYYY-MM-DD'),
    validTo: dayjs().add(1, 'year').format('YYYY-MM-DD'),
    description: ''
  })
  dialogVisible.value = true
}

function editRate(rate: Rate) {
  isEdit.value = true
  editId.value = rate.id
  Object.assign(form, {
    name: rate.name,
    type: rate.type,
    startTime: rate.startTime,
    endTime: rate.endTime,
    priceMultiplier: rate.priceMultiplier,
    isActive: rate.isActive,
    validFrom: rate.validFrom,
    validTo: rate.validTo,
    description: rate.description
  })
  dialogVisible.value = true
}

function deleteRate(id: string) {
  ElMessageBox.confirm('确定要删除该费率吗？', '删除', {
    type: 'warning'
  }).then(() => {
    rateStore.deleteRate(id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

async function submit() {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  if (dayjs(form.endTime).isBefore(dayjs(form.startTime))) {
    ElMessage.error('结束时间不能早于开始时间')
    return
  }

  if (dayjs(form.validTo).isBefore(dayjs(form.validFrom))) {
    ElMessage.error('失效日期不能早于生效日期')
    return
  }

  if (isEdit.value) {
    rateStore.updateRate(editId.value, form)
    ElMessage.success('更新成功')
  } else {
    rateStore.addRate(form)
    ElMessage.success('添加成功')
  }

  dialogVisible.value = false
}
</script>

<style scoped>
.text-red-600 {
  color: #dc2626;
}

.font-bold {
  font-weight: 600;
}
</style>
