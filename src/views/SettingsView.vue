<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">系统设置</h2>
      <el-button @click="resetSettings">
        <el-icon><Refresh /></el-icon>
        恢复默认
      </el-button>
    </div>

    <el-card style="max-width: 800px; margin: 0 auto;">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="180px">
        <div class="form-section">
          <h3 class="section-title">预订设置</h3>
          <el-form-item label="超时自动释放时间">
            <el-input-number
              v-model="form.autoReleaseMinutes"
              :min="5"
              :max="120"
              :step="5"
              style="width: 200px"
            />
            <span style="margin-left: 12px; color: #6b7280;">
              分钟（预订后超时未到自动释放营位）
            </span>
          </el-form-item>
          <el-form-item label="候补确认有效期">
            <el-input-number
              v-model="form.waitlistNotifyExpireMinutes"
              :min="10"
              :max="240"
              :step="10"
              style="width: 200px"
            />
            <span style="margin-left: 12px; color: #6b7280;">
              分钟（候补通知后需在此时间内确认）
            </span>
          </el-form-item>
        </div>

        <div class="form-section">
          <h3 class="section-title">时间设置</h3>
          <el-form-item label="标准入住时间">
            <el-time-picker
              v-model="checkInTime"
              format="HH:mm"
              value-format="HH:mm"
              placeholder="选择入住时间"
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="标准退房时间">
            <el-time-picker
              v-model="checkOutTime"
              format="HH:mm"
              value-format="HH:mm"
              placeholder="选择退房时间"
              style="width: 200px"
            />
          </el-form-item>
        </div>

        <div class="form-section">
          <h3 class="section-title">财务设置</h3>
          <el-form-item label="默认定金比例">
            <el-input-number
              v-model="form.defaultDepositRate"
              :min="0"
              :max="1"
              :step="0.1"
              :precision="2"
              style="width: 200px"
            />
            <span style="margin-left: 12px; color: #6b7280;">
              ({{ (form.defaultDepositRate * 100).toFixed(0) }}%)
            </span>
          </el-form-item>
        </div>

        <div class="form-section">
          <h3 class="section-title">系统信息</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="系统名称">露营地营位预订系统</el-descriptions-item>
            <el-descriptions-item label="版本号">v1.0.0</el-descriptions-item>
            <el-descriptions-item label="开发者">Trae AI</el-descriptions-item>
            <el-descriptions-item label="数据存储">本地存储 (localStorage)</el-descriptions-item>
          </el-descriptions>
        </div>

        <el-form-item>
          <el-button type="primary" @click="saveSettings">
            <el-icon><Check /></el-icon>
            保存设置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()
const formRef = ref<FormInstance>()

const form = reactive({
  autoReleaseMinutes: settingsStore.settings.autoReleaseMinutes,
  waitlistNotifyExpireMinutes: settingsStore.settings.waitlistNotifyExpireMinutes,
  defaultDepositRate: settingsStore.settings.defaultDepositRate
})

const checkInTime = ref(settingsStore.settings.checkInTime)
const checkOutTime = ref(settingsStore.settings.checkOutTime)

const rules: FormRules = {
  autoReleaseMinutes: [{ required: true, message: '请输入自动释放时间', trigger: 'blur' }],
  waitlistNotifyExpireMinutes: [{ required: true, message: '请输入候补确认有效期', trigger: 'blur' }],
  defaultDepositRate: [{ required: true, message: '请输入定金比例', trigger: 'blur' }]
}

watch(checkInTime, (val) => {
  if (val) {
    settingsStore.updateSettings({ checkInTime: val })
  }
})

watch(checkOutTime, (val) => {
  if (val) {
    settingsStore.updateSettings({ checkOutTime: val })
  }
})

function saveSettings() {
  settingsStore.updateSettings({
    autoReleaseMinutes: form.autoReleaseMinutes,
    waitlistNotifyExpireMinutes: form.waitlistNotifyExpireMinutes,
    defaultDepositRate: form.defaultDepositRate
  })
  ElMessage.success('设置保存成功')
}

function resetSettings() {
  ElMessageBox.confirm('确定要恢复默认设置吗？', '恢复默认', {
    type: 'warning'
  }).then(() => {
    settingsStore.resetSettings()
    form.autoReleaseMinutes = settingsStore.settings.autoReleaseMinutes
    form.waitlistNotifyExpireMinutes = settingsStore.settings.waitlistNotifyExpireMinutes
    form.defaultDepositRate = settingsStore.settings.defaultDepositRate
    checkInTime.value = settingsStore.settings.checkInTime
    checkOutTime.value = settingsStore.settings.checkOutTime
    ElMessage.success('已恢复默认设置')
  }).catch(() => {})
}
</script>
