<template>
  <!-- 聊天输入容器 -->
  <div class="chat-input-container">
    <!-- 输入框和按钮的组合 -->
    <div class="input-wrapper">
      <!-- 添加文件上传区域 -->
      <div class="upload-area" v-if="showUpload">
        <!-- 上传提示（仅VLM模型显示） -->
        <div class="upload-tip" v-if="isVLMModel">
          <el-alert
            title="图片上传提示"
            type="info"
            show-icon
            :closable="false"
          >
            <template #default>
              <p>当前模型支持图像识别，建议最多上传2张图片</p>
              <p>支持格式：JPEG、PNG、GIF、WebP</p>
              <p>图片大小：建议小于10MB</p>
              <p>细节模式：{{ settingsStore.imageDetail === 'high' ? '高分辨率（消耗更多Token）' : settingsStore.imageDetail === 'low' ? '低分辨率（消耗较少Token）' : '自动选择' }}</p>
            </template>
          </el-alert>
        </div>
        <!-- 在 el-upload 组件中，:accept 属性用于限制文件选择器可选择的文件类型，
        其值是一个或多个 MIME 类型字符串或文件扩展名，多个值之间用逗号分隔。 -->
        <!-- 上传组件 -->
        <el-upload
          class="upload-component"
          :action="null" 
          :auto-upload="false"
          :on-change="handleFileChange"
          :show-file-list="false"
          :accept="isVLMModel ? 'image/*' : '*'"
          multiple
        >
        <!-- trigger	触发文件选择框的内容 -->
          <template #trigger>
            <el-button type="primary" :icon="Plus">
              {{ isVLMModel ? '添加图片' : '添加文件' }}
            </el-button>
          </template>
        </el-upload>
        
        <!-- 预览区域 -->
        <div class="preview-list" v-if="selectedFiles.length">
          <div v-for="(file, index) in selectedFiles" :key="index" class="preview-item">
            <!-- 图片预览 -->
            <img v-if="isImage(file)" :src="getPreviewUrl(index)" class="preview-image"/>
            <!-- 文件名预览 -->
            <div v-else class="file-preview">
              <el-icon><Document /></el-icon>
              <span>{{ file.name }}</span>
            </div>
            <!-- 删除按钮 -->
            <el-button 
              class="delete-btn" 
              type="danger" 
              :icon="Delete" 
              circle
              @click="removeFile(index)"
            />
          </div>
        </div>
      </div>

      <!-- 输入框 -->
      <el-input
        v-model="messageText"
        type="textarea"
        :rows="2"
        :autosize="{ minRows: 2, maxRows: 5 }"
        :placeholder="placeholder"
        resize="none"
        @keydown.enter.exact.prevent="handleSend"
        @keydown.enter.shift.exact="newline"
        @input="adjustHeight"
        ref="inputRef"
      />
      
      <!-- 按钮组 -->
      <div class="button-group">
        <!-- 添加切换上传区域的按钮 -->
        <el-tooltip content="上传文件" placement="top">
          <el-button
            circle
            :icon="Upload"
            @click="toggleUpload"
          />
        </el-tooltip>
        
        <el-tooltip content="清空对话" placement="top">
          <el-button
            circle
            type="danger"
            :icon="Delete"
            @click="handleClear"
          />
        </el-tooltip>
        
        <el-button
          type="primary"
          :loading="loading"
          @click="handleSend"
        >
          <template #icon>
            <el-icon><Position /></el-icon>
          </template>
          发送
        </el-button>
      </div>
    </div>
    <!-- Token计数器 -->
    <div class="token-counter">
      已使用 Token: {{ tokenCount.total }} (提示: {{ tokenCount.prompt }}, 回复: {{ tokenCount.completion }})
    </div>
  </div>
</template>

<script setup>
// computed：用于创建计算属性，根据依赖自动更新
// onMounted：Vue 的生命周期钩子，在组件挂载后执行（虽然在当前代码中未使用）
// 从 Element Plus 图标库导入所需图标：
// Delete：删除图标，用于删除文件 / 消息
// Position：发送图标，用于发送消息按钮
// Upload：上传图标，用于切换上传区域
// Plus：加号图标，用于添加图片 / 文件按钮
// Document：文档图标，用于显示非图片文件的预览
// useChatStore：聊天状态仓库，管理消息列表、加载状态和 Token 计数等
// useSettingsStore：设置状态仓库，管理模型选择、主题模式、API 密钥等配置
// ElMessageBox：用于显示确认对话框（如清空对话确认）
// ElMessage：用于显示轻量级提示消息（如操作成功 / 失败提示）
// 这些是 VLM（视觉语言模型）功能所需的图片处理工具函数：
// buildVLMMessage：构建符合 API 规范的 VLM 消息格式
// isValidImageFormat：验证图片格式是否支持（JPEG、PNG 等）
// checkImageSize：检查图片大小是否符合限制（默认 10MB）
// getImagePreviewUrl：生成图片预览的临时 URL
// revokeImagePreviewUrl：释放预览 URL 占用的内存
import { ref, computed, onMounted } from 'vue'
import { Delete, Position, Upload, Plus, Document } from '@element-plus/icons-vue'
import { useChatStore } from '../stores/chat'
import { useSettingsStore } from '../stores/settings'
import { ElMessageBox, ElMessage } from 'element-plus'
import { 
  buildVLMMessage, 
  isValidImageFormat, 
  checkImageSize, 
  getImagePreviewUrl, 
  revokeImagePreviewUrl 
} from '../utils/imageUtils'

// 定义组件的属性
const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
})

// 定义组件的事件
const emit = defineEmits(['send', 'clear'])

// 使用聊天存储和设置存储
// 这两行通过 Pinia 的 useChatStore 和 useSettingsStore 函数获取了全局状态存储实例。
// chatStore：管理聊天相关的状态（如消息列表、加载状态、Token 计数等，对应 src/stores/chat.js）。
// settingsStore：管理应用设置（如模型选择、主题、API 密钥等，对应 src/stores/settings.js）。
// 作用：组件通过这两个存储实例读取或修改全局状态，实现跨组件数据共享（如获取当前模型类型、Token 使用量等）。
const chatStore = useChatStore()
const settingsStore = useSettingsStore()
// 消息文本的响应式引用
// ref('') 是 Vue 3 的响应式 API，用于创建一个响应式字符串变量，初始值为空。
// messageText 绑定到输入框的 v-model，实时同步用户输入的文本内容。
// 作用：跟踪用户在输入框中输入的消息文本，支持双向数据绑定。
const messageText = ref('')

// 输入框的占位符
const placeholder = `输入消息，按Enter发送
Shift + Enter 换行`

// 计算属性，用于获取聊天存储中的Token计数
// tokenCount 的值来源于 chatStore.tokenCount，该存储属性记录了已使用的 Token 总量、提示词 Token 量和回复 Token 量（定义在 src/stores/chat.js 中）。
// 作用：在组件中实时显示 Token 使用情况（对应模板中的 .token-counter 区域）。
const tokenCount = computed(() => chatStore.tokenCount)

// 计算属性：判断当前模型是否支持图片
// 检查 settingsStore.model（当前选中的模型名称）是否包含以下关键词
const isVLMModel = computed(() => {
  return settingsStore.model.includes('VL') || 
         settingsStore.model.includes('vision') || 
         settingsStore.model.includes('Qwen2.5-VL')
})

// showUpload：布尔值响应式变量，控制上传区域的显示 / 隐藏（默认隐藏，通过 “上传文件” 按钮切换）。
// selectedFiles：响应式数组，存储用户选择的文件（File 对象）。
// previewUrls：响应式数组，存储图片文件的预览 URL（通过 URL.createObjectURL 生成，用于在界面中预览图片）。
const showUpload = ref(false)
const selectedFiles = ref([])
const previewUrls = ref([])

// 切换上传区域显示
// 关联 UI：点击「上传文件」按钮时触发，对应模板中的 @click="toggleUpload"。
const toggleUpload = () => {
  showUpload.value = !showUpload.value
}

// 处理文件选择
// 格式过滤：若当前为 VLM 模型（支持图片的模型），通过 isValidImageFormat 过滤非图片文件（仅允许 JPEG/PNG/GIF/WebP）。
// 大小验证：通过 checkImageSize 确保图片不超过 10MB。
// 状态更新：将合法文件存入 selectedFiles，并为图片生成预览 URL 存入 previewUrls（使用 getImagePreviewUrl 创建临时 URL）。
const handleFileChange = (file) => {
  // 如果是VLM模型，只允许图片文件
  if (isVLMModel.value && !isValidImageFormat(file.raw)) {
    ElMessage.error('当前模型只支持图片文件')
    return
  }
  
  // 检查图片大小
  if (isValidImageFormat(file.raw) && !checkImageSize(file.raw)) {
    ElMessage.error('图片文件过大，请选择小于10MB的图片')
    return
  }
  
  selectedFiles.value.push(file.raw)
  
  // 为图片创建预览URL
  // 在前端开发中，getImagePreviewUrl 通常是一个用于生成图片预览地址的工具函数，核心作用是让用户在上传图片文件
  // （如通过 <input type="file"> 选择本地图片）后，无需先上传到服务器，就能在浏览器中实时预览图片。

  if (isImage(file.raw)) {
    previewUrls.value.push(getImagePreviewUrl(file.raw))
  } else {
    previewUrls.value.push(null)
  }
}

// 移除文件
// 通过 revokeImagePreviewUrl 释放图片预览的临时 URL（URL.createObjectURL 生成的 URL 需手动释放）。
const removeFile = (index) => {
  // 释放预览URL内存
  if (previewUrls.value[index]) {
    revokeImagePreviewUrl(previewUrls.value[index])
  }
  
  selectedFiles.value.splice(index, 1)
  previewUrls.value.splice(index, 1)
}

// 判断是否为图片文件
// 检查文件的 type 属性是否以 image/ 开头（如 image/jpeg、image/png）。
const isImage = (file) => {
  return file.type.startsWith('image/')
}

// 获取预览URL（使用缓存的URL）
// 若 previewUrls 中已缓存该图片的 URL 则直接返回，否则通过 getImagePreviewUrl 重新生成（避免重复创建）。
const getPreviewUrl = (index) => {
  return previewUrls.value[index] || getImagePreviewUrl(selectedFiles.value[index])
}

// 修改发送处理函数
// async：给函数 “打标签”，告诉 JS 引擎：“这个函数是异步的，内部可能有 await，你需要特殊处理它的执行顺序”，
//  并且 **async 函数的返回值会自动包装成 Promise**（即使你 return 一个普通值，比如 return 123，最终也会变成 Promise.resolve(123)）。
// await：在 async 函数内部 “干活”，专门处理 Promise—— 遇到 await 时，函数会 “暂停”，先去执行其他同步代码，
//  等 await 后面的 Promise 有结果了（成功 resolve 或失败 reject），再回到这个函数继续执行。
const handleSend = async () => {
  // 校验：内容为空或正在加载时不发送
  if ((!messageText.value.trim() && selectedFiles.value.length === 0) || props.loading) return
  
  try {
    let messageContent
    
    // 如果是VLM模型且有图片文件，使用VLM消息格式
    if (isVLMModel.value && selectedFiles.value.some(file => isImage(file))) {
      // 限制图片数量：图片转 token 开销大（一张 768px 图约 2300 token），多张会撑爆上下文
      // 面试考点：VLM 图片按像素换算 token，需控制图片数量和大小
      const MAX_IMAGES = 2
      const imageFiles = selectedFiles.value.filter(file => isImage(file)).slice(0, MAX_IMAGES)
      if (selectedFiles.value.filter(file => isImage(file)).length > MAX_IMAGES) {
        ElMessage.warning(`最多支持 ${MAX_IMAGES} 张图片，已忽略多余的`)
      }
      const textFiles = selectedFiles.value.filter(file => !isImage(file))
      
      // 处理文本文件内容
      let textContent = messageText.value
      if (textFiles.length > 0) {
        const fileContents = await Promise.all(
          textFiles.map(file => readFileContent(file))
        )
        textContent = textContent + '\n' + fileContents.join('\n')
      }
      
      // 构建VLM消息
      messageContent = await buildVLMMessage(
        textContent, 
        imageFiles, 
        settingsStore.imageDetail
      )
    } else {
      // 传统文本模式
      const fileContents = await Promise.all(
        selectedFiles.value.map(async (file) => {
          if (isImage(file)) {
            return await convertImageToBase64(file)
          } else {
            return await readFileContent(file)
          }
        })
      )

      let content = messageText.value
      if (fileContents.length > 0) {
        content = content + '\n' + fileContents.join('\n')
      }
      
      messageContent = content
    }

    emit('send', messageContent)
    
    // 清理状态
    messageText.value = ''
    // 释放所有预览URL
    previewUrls.value.forEach(url => {
      if (url) revokeImagePreviewUrl(url)
    })
    selectedFiles.value = []
    previewUrls.value = []
    showUpload.value = false
  } catch (error) {
    console.error('发送失败:', error)
    ElMessage.error(error.message || '发送失败，请重试')
  }
}

// 将图片转换为base64（兼容旧版本）
const convertImageToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      resolve(`![${file.name}](${e.target.result})`)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 读取文件内容
const readFileContent = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      resolve(`\`\`\`\n${e.target.result}\n\`\`\``)
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

// 处理换行的函数
const newline = (e) => {
  // 在消息文本中添加换行符
  messageText.value += '\n'
}

// 处理清空对话的函数
const handleClear = async () => {
  try {
    // 显示确认弹窗，询问用户是否清空对话
    await ElMessageBox.confirm(
      '确定要清空所有对话记录吗？', // 弹窗内容
      '警告', // 弹窗标题
      {
        confirmButtonText: '确定', // 确认按钮文本
        cancelButtonText: '取消', // 取消按钮文本
        type: 'warning', // 弹窗类型（警告样式）
      }
    )
    // 用户点击"确定"后，触发父组件的clear事件
    emit('clear')
  } catch {
    // 用户点击"取消"或关闭弹窗时，不执行任何操作
  }
}

const inputRef = ref(null)

// 调整输入框高度的方法
const adjustHeight = () => {
  if (inputRef.value) {
    // 获取输入框的DOM元素,因为是 ref，需要通过$el获取DOM元素
    const textarea = inputRef.value.$el.querySelector('textarea')
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }
}

</script>

<style lang="scss" scoped>
// 聊天输入容器的样式
.chat-input-container {
  padding: 1rem;
  background-color: var(--bg-color);
  border-top: 1px solid var(--border-color);
  transition: all 0.3s ease;
  
  // 深色模式下增强边框效果
  // 编译后的 CSS 为：[data-theme="dark"] .chat-input-container { ... }
  // 含义：当页面根元素（或某个祖先元素）设置了 data-theme="dark" 时，.chat-input-container 会应用该阴影样式。
  // 作用：用于根据全局主题（深色 / 浅色）调整组件样式，是主题适配的常用写法。
  [data-theme="dark"] & {
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  }
}

// 输入框和按钮组合的样式
.input-wrapper {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
  
  .el-input {
    flex: 1;
    
    :deep(.el-textarea__inner) {
      transition: all 0.3s;
      line-height: 1.5;
      padding: 8px 12px;
      overflow-y: auto;
    }
  }
}

// 按钮组的样式
.button-group {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
  
  .el-button {
    transition: all 0.2s ease;
    
    &:hover {
      transform: translateY(-1px);
    }
    
    // 深色模式下的按钮增强效果
    [data-theme="dark"] & {
      &:hover {
        box-shadow: 0 4px 8px rgba(92, 174, 253, 0.3);
      }
      
      &.el-button--primary {
        background: linear-gradient(135deg, var(--primary-color), #409eff);
        border-color: var(--primary-color);
      }
    }
  }
}

// Token计数器的样式
.token-counter {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
  text-align: right;
}

.upload-area {
  margin-bottom: 1rem;
  padding: 1rem;
  border: 2px dashed var(--border-color);
  border-radius: var(--border-radius);
  
  .upload-tip {// 上传提示信息
    margin-bottom: 1rem;
    
    :deep(.el-alert__content) {
      p {
        margin: 0.25rem 0;
        font-size: 0.9rem;
      }
    }
  }
  
  .preview-list {
    display: flex;
    flex-wrap: wrap;// 超出换行
    gap: 1rem;
    margin-top: 1rem;
    
    .preview-item {
      position: relative;
      width: 100px;
      height: 100px;
      
      .preview-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: var(--border-radius);
      }
      
      .file-preview {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background-color: var(--bg-color-secondary);
        border-radius: var(--border-radius);
        
        .el-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        
        span {
          font-size: 0.8rem;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 90%;
        }
      }
      
      .delete-btn {
        position: absolute;
        top: -0.5rem;
        right: -0.5rem;
        padding: 0.25rem;
        transform: scale(0.8);
      }
    }
  }
}
</style>