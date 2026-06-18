<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">装备租赁</h2>
      <el-button type="primary" @click="showAddDialog">
        <el-icon><Plus /></el-icon>
        新增装备
      </el-button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">装备种类</div>
        <div class="stat-value">{{ equipmentStore.equipment.length }}</div>
      </div>
      <div class="stat-card success">
        <div class="stat-label">可用装备</div>
        <div class="stat-value">{{ equipmentStore.availableEquipment.length }}</div>
      </div>
      <div class="stat-card info">
        <div class="stat-label">总库存量</div>
        <div class="stat-value">{{ totalStock }}</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-label">库存预警</div>
        <div class="stat-value">{{ lowStockCount }}</div>
      </div>
    </div>

    <el-card>
      <el-table :data="equipmentStore.equipment" border stripe>
        <el-table-column prop="name" label="装备名称" width="150" />
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag>{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column label="租金" width="120">
          <template #default="{ row }">¥{{ row.price }}/{{ row.unit }}/天</template>
        </el-table-column>
        <el-table-column label="可用库存" width="120">
          <template #default="{ row }">
            <el-tag :type="equipmentStore.getAvailableStock(row.id) <= 5 ? 'danger' : equipmentStore.getAvailableStock(row.id) <= 10 ? 'warning' : 'success'">
              {{ equipmentStore.getAvailableStock(row.id) }} / {{ row.stock }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="已占用" width="100">
          <template #default="{ row }">
            <el-tag type="info" v-if="row.stockOccupied > 0">{{ row.stockOccupied }}</el-tag>
            <span v-else style="color: #9ca3af;">-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'available' ? 'success' : 'danger'">
              {{ row.status === 'available' ? '可用' : '不可用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button size="small" @click="editEquipment(row)">编辑</el-button>
              <el-button
                size="small"
                type="primary"
                @click="adjustStock(row)"
              >
                调整库存
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="deleteEquipment(row.id)"
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
      :title="isEdit ? '编辑装备' : '新增装备'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="装备名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入装备名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类" prop="category">
              <el-select v-model="form.category" placeholder="请选择或输入分类" allow-create style="width: 100%">
                <el-option
                  v-for="cat in equipmentStore.getCategories()"
                  :key="cat"
                  :label="cat"
                  :value="cat"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="单位" prop="unit">
              <el-input v-model="form.unit" placeholder="如：个、顶、套" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="租金(元/天)" prop="price">
              <el-input-number
                v-model="form.price"
                :min="0"
                :precision="2"
                :step="10"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="库存" prop="stock">
              <el-input-number
                v-model="form.stock"
                :min="0"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
                <el-option label="可用" value="available" />
                <el-option label="不可用" value="unavailable" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入装备描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="stockDialogVisible"
      title="调整库存"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-descriptions :column="2" border v-if="currentEquipment" style="margin-bottom: 16px;">
        <el-descriptions-item label="装备名称">{{ currentEquipment.name }}</el-descriptions-item>
        <el-descriptions-item label="总库存">{{ currentEquipment.stock }}</el-descriptions-item>
        <el-descriptions-item label="已占用">{{ currentEquipment.stockOccupied || 0 }}</el-descriptions-item>
        <el-descriptions-item label="可用库存">{{ equipmentStore.getAvailableStock(currentEquipment.id) }}</el-descriptions-item>
      </el-descriptions>
      <el-form :model="stockForm" :rules="stockRules" ref="stockFormRef" label-width="100px">
        <el-form-item label="调整数量" prop="change">
          <el-input-number
            v-model="stockForm.change"
            :min="-currentEquipment?.stock || 0"
            style="width: 100%"
          />
          <span style="margin-left: 12px; color: #6b7280;">
            调整后库存: {{ (currentEquipment?.stock || 0) + stockForm.change }}
          </span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="stockForm.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入调整原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stockDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmStockAdjust">确认调整</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import type { Equipment } from '@/types'
import { useEquipmentStore } from '@/stores/equipment'

const equipmentStore = useEquipmentStore()

const dialogVisible = ref(false)
const stockDialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref('')
const currentEquipment = ref<Equipment | null>(null)
const formRef = ref<FormInstance>()
const stockFormRef = ref<FormInstance>()

const form = reactive({
  name: '',
  category: '',
  unit: '个',
  price: 0,
  stock: 0,
  stockOccupied: 0,
  status: 'available' as Equipment['status'],
  description: ''
})

const stockForm = reactive({
  change: 0,
  remark: ''
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入装备名称', trigger: 'blur' }],
  category: [{ required: true, message: '请输入分类', trigger: 'blur' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
  price: [{ required: true, message: '请输入租金', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入库存', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const stockRules: FormRules = {
  change: [{ required: true, message: '请输入调整数量', trigger: 'blur' }]
}

const totalStock = computed(() => 
  equipmentStore.equipment.reduce((sum, e) => sum + e.stock, 0)
)

const lowStockCount = computed(() => 
  equipmentStore.equipment.filter(e => e.stock <= 5).length
)

function showAddDialog() {
  isEdit.value = false
  editId.value = ''
  Object.assign(form, {
    name: '',
    category: '',
    unit: '个',
    price: 0,
    stock: 0,
    status: 'available',
    description: ''
  })
  dialogVisible.value = true
}

function editEquipment(equipment: Equipment) {
  isEdit.value = true
  editId.value = equipment.id
  Object.assign(form, {
    name: equipment.name,
    category: equipment.category,
    unit: equipment.unit,
    price: equipment.price,
    stock: equipment.stock,
    stockOccupied: equipment.stockOccupied || 0,
    status: equipment.status,
    description: equipment.description
  })
  dialogVisible.value = true
}

function deleteEquipment(id: string) {
  ElMessageBox.confirm('确定要删除该装备吗？', '删除', {
    type: 'warning'
  }).then(() => {
    equipmentStore.deleteEquipment(id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

async function submit() {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  if (isEdit.value) {
    equipmentStore.updateEquipment(editId.value, form)
    ElMessage.success('更新成功')
  } else {
    equipmentStore.addEquipment(form)
    ElMessage.success('添加成功')
  }

  dialogVisible.value = false
}

function adjustStock(equipment: Equipment) {
  currentEquipment.value = equipment
  stockForm.change = 0
  stockForm.remark = ''
  stockDialogVisible.value = true
}

async function confirmStockAdjust() {
  if (!stockFormRef.value || !currentEquipment.value) return

  const valid = await stockFormRef.value.validate().catch(() => false)
  if (!valid) return

  equipmentStore.updateStock(currentEquipment.value.id, stockForm.change)
  ElMessage.success('库存调整成功')
  stockDialogVisible.value = false
}
</script>
