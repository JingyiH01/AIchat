<template>
  <!-- 设置抽屉组件，用于展示和编辑应用设置 -->
  <el-drawer 
    style="background-color: var(--bg-color);"
    v-model="visible"
    title="设置"
    direction="rtl"
    size="400px"
  >
    <!-- 主容器与表单（settings-container 与 el-form） -->
    <div class="settings-container">
      <!-- 使用element-plus的表单组件来展示和编辑设置 -->
      <!-- 
        el-form：Element Plus 的表单组件，用于统一管理设置项：
        :model="settings"：绑定响应式数据对象 settings，实现表单数据的双向绑定。
        label-width="120px"：固定标签宽度，使所有设置项的标签对齐，视觉更规整。 
      -->
      <el-form :model="settings" label-width="120px">
        <!-- 主题模式选择 -->
         <!-- 
          交互：
            v-model="settings.themeMode"：绑定主题模式值（与 Pinia 存储同步）。
            @change="handleThemeModeChange"：选择变化时触发主题更新逻辑。
            class="w-full"：选择器占满父容器宽度，布局更紧凑。 
        -->
        <el-form-item label="主题模式">
          <el-select v-model="settings.themeMode" @change="handleThemeModeChange" class="w-full">
            <el-option label="跟随系统" value="system" />
            <el-option label="浅色模式" value="light" />
            <el-option label="深色模式" value="dark" />
          </el-select>
          <div class="form-item-tip">跟随系统会自动适应您的系统主题设置</div>
        </el-form-item>

        <!-- 深色模式切换（保留以兼容，但在系统模式下禁用） -->
        <!-- <el-form-item label="深色模式" v-if="settings.themeMode !== 'system'">
          <el-switch
            v-model="settings.isDarkMode"
            @change="handleDarkModeChange"
          />
        </el-form-item> -->

        <!-- 模型选择 -->
        <el-form-item label="模型">
          <el-select v-model="settings.model" class="w-full">
            <el-option
              v-for="model in modelOptions"
              :key="model.value"
              :label="model.label"
              :value="model.value"
            />
          </el-select>
        </el-form-item>

        <!-- Temperature设置 -->
        <el-form-item label="Temperature">
          <el-slider
            v-model="settings.temperature"
            :min="0"
            :max="1"
            :step="0.1"
            show-input
          />
        </el-form-item>

        <!-- 最大Token设置 -->
        <el-form-item label="最大Token">
          <el-input-number
            v-model="settings.maxTokens"
            :min="1"
            :max="4096"
            :step="1"
          />
        </el-form-item>

        <!-- API Key输入 -->
        <el-form-item label="API Key">
          <el-input
            v-model="settings.apiKey"
            type="password"
            show-password
            placeholder="请输入API Key"
          />
        </el-form-item>

        <!-- 流式响应切换 -->
        <el-form-item label="流式响应">
          <el-switch
            v-model="settings.streamResponse"
          />
          <div class="form-item-tip">开启后将实时显示AI回复</div>
        </el-form-item>

        <!-- Top P -->
         <!-- 控制 AI 生成文本时的词汇采样范围（值越高，采样范围越广）。 -->
        <el-form-item label="Top P">
          <el-slider
            v-model="settings.topP"
            :min="0"
            :max="1"
            :step="0.1"
            show-input
          />
        </el-form-item>

        <!-- Top K -->
         <!-- 控制 AI 生成文本时每次选择的候选词数量（值越高，候选词越多）。 -->
        <el-form-item label="Top K">
          <el-input-number
            v-model="settings.topK"
            :min="1"
            :max="100"
            :step="1"
          />
        </el-form-item>

        <!-- 图片细节控制（仅VLM模型显示） -->
         <!-- 高分辨率识别更精准但消耗更多 Token，低分辨率则相反，自动模式由模型决定。 -->
        <el-form-item label="图片细节" v-if="isVLMModel">
          <el-select v-model="settings.imageDetail" class="w-full">
            <el-option label="高分辨率 (high)" value="high" />
            <el-option label="低分辨率 (low)" value="low" />
            <el-option label="自动 (auto)" value="auto" />
          </el-select>
          <div class="form-item-tip">控制对图像的预处理方式，影响Token消耗</div>
        </el-form-item>
      </el-form>

      <!-- 保存设置按钮 -->
      <div class="settings-footer">
        <el-button type="primary" @click="handleSave">保存设置</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
// Vue 核心 API：导入 ref（响应式基础类型）、reactive（响应式对象）、computed（计算属性）用于构建响应式数据。
// 状态管理：导入 useSettingsStore（Pinia 存储实例）和 modelOptions（模型列表），用于获取和修改全局设置。
// UI 组件：导入 ElMessage 用于显示操作成功 / 失败的提示信息。
import { ref, reactive, computed } from 'vue'
import { useSettingsStore, modelOptions } from '../stores/settings'
import { ElMessage } from 'element-plus'


// 定义组件的props
const props = defineProps({
  modelValue: Boolean
})

// 定义组件的emits
const emit = defineEmits(['update:modelValue'])

// 使用设置存储
const settingsStore = useSettingsStore()

// 可见性计算属性，同步抽屉的可见性状态
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 设置对象，使用reactive进行响应式处理
const settings = reactive({
  themeMode: settingsStore.themeMode,
  isDarkMode: settingsStore.isDarkMode,
  model: settingsStore.model,
  temperature: settingsStore.temperature,
  maxTokens: settingsStore.maxTokens,
  apiKey: settingsStore.apiKey,
  streamResponse: settingsStore.streamResponse,
  topP: settingsStore.topP,
  topK: settingsStore.topK,
  imageDetail: settingsStore.imageDetail
})

// 计算属性：判断当前模型是否为VLM模型
const isVLMModel = computed(() => {
  const currentModel = modelOptions.find(option => option.value === settings.model)
  // 检查该模型是否包含 isVLM: true 属性（如 Qwen2.5-VL-7B），返回布尔值。
  return currentModel?.isVLM || false
})

// 处理主题模式变化
const handleThemeModeChange = (value) => {
  settingsStore.setThemeMode(value)
  settings.isDarkMode = settingsStore.isDarkMode
}

// 处理深色模式切换
const handleDarkModeChange = (value) => {
  if (settings.themeMode !== 'system') {
    settingsStore.setThemeMode(value ? 'dark' : 'light')
  }
}

// 保存设置
const handleSave = () => {
  settingsStore.updateSettings(settings)
  ElMessage.success('设置已保存')
  visible.value = false
}
</script>

<style lang="scss" scoped>

// 设置页面样式
.settings-container {
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;// 子元素垂直排列（从上到下）
}

// 保存按钮布局
.settings-footer {
  margin-top: auto;// 自动占据上方剩余空间，将按钮推至底部
  padding-top: 1rem;
  text-align: right;
}

// 全宽样式，用于表单项
.w-full {
  width: 100%;// 宽度占满父容器
}

// 表单项提示样式
.form-item-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;// 与上方表单项保持小间距
}
</style>