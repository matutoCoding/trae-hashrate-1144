<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">营位管理</h2>
      <el-button type="primary" @click="showAddDialog">
        <el-icon><Plus /></el-icon>
        新增营位
      </el-button>
    </div>

    <el-card>
      <el-table :data="campsiteStore.campsites" border stripe>
        <el-table-column prop="name" label="营位名称" width="150" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">{{ getTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="capacity" label="容纳人数" width="100" />
        <el-table-column prop="area" label="面积(㎡)" width="100" />
        <el-table-column label="设施">
          <template #default="{ row }">
            <el-tag
              v-for="facility in row.facilities"
              :key="facility"
              size="small"
              style="margin-right: 4px; margin-bottom: 4px;"
            >
              {{ facility }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="基础价格" width="120">
          <template #default="{ row }">¥{{ row.priceBase }}/天</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button size="small" @click="editCampsite(row)">编辑</el-button>
              <el-button
                size="small"
                type="danger"
                @click="deleteCampsite(row.id)"
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
      :title="isEdit ? '编辑营位' : '新增营位'"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="营位名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入营位名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="营位类型" prop="type">
              <el-select v-model="form.type" placeholder="请选择类型" style="width: 100%">
                <el-option label="帐篷营位" value="tent" />
                <el-option label="房车营位" value="rv" />
                <el-option label="木屋营位" value="cabin" />
                <el-option label="团体营位" value="group" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="容纳人数" prop="capacity">
              <el-input-number v-model="form.capacity" :min="1" :max="50" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="面积(㎡)" prop="area">
              <el-input-number v-model="form.area" :min="1" :max="500" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="基础价格" prop="priceBase">
              <el-input-number
                v-model="form.priceBase"
                :min="0"
                :precision="2"
                :step="10"
                style="width: 100%"
              >
                <template #append>元/天</template>
              </el-input-number>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
                <el-option label="可用" value="available" />
                <el-option label="维护中" value="maintenance" />
                <el-option label="关闭" value="closed" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="配套设施" prop="facilities">
          <el-checkbox-group v-model="form.facilities">
            <el-checkbox label="电源" />
            <el-checkbox label="水源" />
            <el-checkbox label="桌椅" />
            <el-checkbox label="WiFi" />
            <el-checkbox label="空调" />
            <el-checkbox label="卫浴" />
            <el-checkbox label="厨房" />
            <el-checkbox label="排污" />
            <el-checkbox label="烧烤区" />
            <el-checkbox label="篝火区" />
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入营位描述"
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
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import dayjs from 'dayjs'
import type { Campsite } from '@/types'
import { useCampsiteStore } from '@/stores/campsite'

const campsiteStore = useCampsiteStore()

const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref('')
const formRef = ref<FormInstance>()

const form = reactive({
  name: '',
  type: 'tent' as Campsite['type'],
  capacity: 2,
  area: 20,
  facilities: [] as string[],
  priceBase: 100,
  status: 'available' as Campsite['status'],
  description: ''
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入营位名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择营位类型', trigger: 'change' }],
  capacity: [{ required: true, message: '请输入容纳人数', trigger: 'blur' }],
  area: [{ required: true, message: '请输入面积', trigger: 'blur' }],
  priceBase: [{ required: true, message: '请输入基础价格', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
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

function getTypeTagType(type: Campsite['type']): string {
  const map: Record<string, string> = {
    tent: 'success',
    rv: 'primary',
    cabin: 'warning',
    group: 'danger'
  }
  return map[type] || 'info'
}

function getStatusType(status: Campsite['status']): string {
  const map: Record<string, string> = {
    available: 'success',
    maintenance: 'warning',
    closed: 'danger'
  }
  return map[status] || 'info'
}

function getStatusText(status: Campsite['status']): string {
  const map: Record<string, string> = {
    available: '可用',
    maintenance: '维护中',
    closed: '关闭'
  }
  return map[status] || status
}

function formatDate(dateStr: string): string {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}

function showAddDialog() {
  isEdit.value = false
  editId.value = ''
  Object.assign(form, {
    name: '',
    type: 'tent',
    capacity: 2,
    area: 20,
    facilities: [],
    priceBase: 100,
    status: 'available',
    description: ''
  })
  dialogVisible.value = true
}

function editCampsite(campsite: Campsite) {
  isEdit.value = true
  editId.value = campsite.id
  Object.assign(form, {
    name: campsite.name,
    type: campsite.type,
    capacity: campsite.capacity,
    area: campsite.area,
    facilities: [...campsite.facilities],
    priceBase: campsite.priceBase,
    status: campsite.status,
    description: campsite.description
  })
  dialogVisible.value = true
}

function deleteCampsite(id: string) {
  ElMessageBox.confirm('确定要删除该营位吗？', '删除', {
    type: 'warning'
  }).then(() => {
    campsiteStore.deleteCampsite(id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

async function submit() {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  if (isEdit.value) {
    campsiteStore.updateCampsite(editId.value, form)
    ElMessage.success('更新成功')
  } else {
    campsiteStore.addCampsite(form)
    ElMessage.success('添加成功')
  }

  dialogVisible.value = false
}
</script>
