<template>
  <!-- 消息容器，根据消息角色和加载状态动态调整样式 -->
  <div 
    class="message-container"
    :class="[
      message.role === 'assistant' ? 'message-assistant' : 'message-user',
      { 'loading': loading }
    ]"
  >
    <!-- 消息头像，根据消息角色显示不同图标 -->
    <div class="message-avatar">
      <el-avatar 
        :icon="message.role === 'assistant' ? 'ChatRound' : 'User'"
        :class="message.role"
      />
    </div>

    <!-- 消息内容，根据加载状态显示不同内容 -->
    <div class="message-content">
      <!-- 显示模式 -->
      <div class="message-text" v-if="!loading && !isEditing">
        <!-- VLM 格式消息：包含图片和文本 -->
        <div v-if="isVLMMessage" class="vlm-message">
          <!-- 显示图片 -->
          <div class="message-images" v-if="messageImages.length > 0">
            <img 
              v-for="(imageUrl, index) in messageImages" 
              :key="index"
              :src="imageUrl" 
              class="message-image"
              @click="previewImage(imageUrl)"
            />
          </div>
          <!-- 显示文本 -->
            <!-- 
              v-html="renderedContent"将renderedContent的内容以 HTML 形式插入，适用于展示富文本或 markdown 渲染后的内容 
              ref="markdownBody"提供一个引用标识，可在组件代码中通过this.$refs.markdownBody访问该元素
            -->
          <div class="markdown-body" v-if="messageText" v-html="renderedContent" ref="markdownBody" @click="handleCodeBlockClick"></div>
        </div>
        <!-- 传统格式消息 -->
        <div v-else class="markdown-body" v-html="renderedContent" ref="markdownBody" @click="handleCodeBlockClick"></div>
      </div>

      <!-- 编辑模式 -->
      <div class="message-edit" v-if="isEditing">
        <!-- 文本编辑框 -->
        <!-- 
          v-model="editContent"	                  双向绑定编辑框内容到 editContent 变量（存储当前编辑中的文本）。
          type="textarea"	                        指定为多行文本框，支持换行输入。
          :rows="2"	                              默认显示 2 行高度。
          :autosize="{ minRows: 2, maxRows: 6 }"	自动调整高度：
                                                  - 最小 2 行，避免编辑框过小；
                                                  - 最大 6 行，防止内容过长导致编辑区过高。
          ref="editInputRef"	                    定义引用标识，用于在脚本中获取输入框 DOM 元素（如聚焦操作）。
          @keydown.enter.exact.prevent="handleEditKeydown"	按键事件：
                                                            - 仅当按下 Enter 键（不配合其他键）时触发；
                                                            - prevent 阻止默认换行行为；
                                                            - 调用 handleEditKeydown 方法（保存编辑）。
          @keydown.esc="cancelEdit"	              按键事件：按下 Esc 键时，调用 cancelEdit 方法（取消编辑）。
                                                          Vue 内置的按键修饰符，专门匹配键盘上的 Esc（退出）键，无需手动判断按键编码，简化逻辑。
        -->
        <el-input
          v-model="editContent"
          type="textarea"
          :rows="2"
          :autosize="{ minRows: 2, maxRows: 6 }"
          ref="editInputRef"
          @keydown.enter.exact.prevent="handleEditKeydown"
          @keydown.esc="cancelEdit"
        />
        <!-- 按钮操作 -->
        <!-- 
          type="primary"：主色调按钮，突出重要操作。
        -->
        <div class="edit-actions">
          <el-button size="small" @click="cancelEdit">取消</el-button>
          <el-button type="primary" size="small" @click="saveEdit">保存</el-button>
        </div>
      </div>

      <!-- 加载模式 -->
        <!-- 
        el-icon 是 Element Plus 提供的图标容器组件，用于统一管理图标样式。
        <Loading />：Element Plus 内置的 “加载” 图标组件，视觉上是一个旋转的圆圈，直观表示 “正在处理中”。
        -->
      <div class="message-loading" v-if="loading">
        <!-- 动态三点加载动画：提示"模型正在生成/推理"而非空白等待 -->
        <span class="loading-dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </span>
        <span class="loading-text">{{ loadingText }}</span>
      </div>

      <!-- 消息底部区域：时间和操作按钮 -->
      <div class="message-footer">
        <!-- 时间戳 -->
         <!-- 
          message.timestamp 是消息的时间戳（从 props 传入，格式为 ISO 字符串，如 2024-05-20T12:30:45.123Z）。
          formatTime 是组件内定义的工具函数，将时间戳转换为本地可读时间（如 14:30:45），通过 new Date(timestamp).toLocaleTimeString() 实现。
         -->
        <span class="message-time">{{ formatTime(message.timestamp) }}</span>
        <!-- 用户消息的操作按钮 -->
          <!-- 
            使用 Edit Delete 图标（Element Plus 提供）。
            点击触发 handleDelete 方法，弹出确认对话框，确认后删除当前消息（通过 emit('delete', props.message) 通知父组件）。
            按钮使用 type="text"（文本按钮，无背景色）和 size="small"（小尺寸），符合聊天界面轻量化设计。
          -->
        <div class="message-actions" v-if="!loading && message.role === 'user' && !isEditing">
          <el-button-group>
            <el-button type="text" size="small" @click="startEdit">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button type="text" size="small" @click="handleDelete">
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-button-group>
        </div>
        <!-- AI助手消息的操作按钮 -->
         <!-- 
          仅当消息是 AI 助手发送的（message.role === 'assistant'）且不处于加载状态（!loading）时显示。
          使用 RefreshRight 图标（刷新 / 重新生成含义）。
          点击触发 handleRegenerate 方法，通过 emit('regenerate', props.message) 通知父组件重新请求 AI 生成回复。
          :disabled="isLoading"：当全局处于加载状态（isLoading 从 Pinia 状态获取）时，按钮禁用，避免重复请求。
          使用 CopyDocument 图标（复制文档含义）。
          点击触发 handleCopyAll 方法，将 AI 回复的全部内容复制到剪贴板（通过 navigator.clipboard.writeText 实现），并显示复制成功的提示消息。
         -->
        <div class="message-actions" v-if="!loading && message.role === 'assistant'">
          <el-button-group>
            <el-button 
              type="text" 
              size="small" 
              @click="handleRegenerate" 
              :title="'重新生成'"
              :disabled="isLoading"
            >
              <el-icon><RefreshRight /></el-icon>
            </el-button>
            <el-button 
              type="text" 
              size="small" 
              @click="handleCopyAll" 
              :title="'复制全部'"
            >
              <el-icon><CopyDocument /></el-icon>
            </el-button>
          </el-button-group>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 从Vue框架中导入响应式相关的API
//   ref：用于创建响应式的基本类型数据（如字符串、数字等）和 DOM 引用
//   computed：用于创建计算属性，根据依赖自动更新
//   nextTick：用于在 DOM 更新完成后执行回调函数，确保操作基于最新的 DOM 状态
//     当你修改 Vue 组件的数据后，DOM 并不会立即更新，而是会进入一个队列等待批量处理。
// 从项目工具目录导入renderMarkdown函数。该函数用于将 Markdown 格式的文本转换为 HTML，实现消息内容的富文本展示
// 导入Element Plus的消息提示组件
//   ElMessage：用于显示轻量级的消息提示（如成功、错误提示）
//   ElMessageBox：用于显示模态对话框（如确认删除操作的弹窗）  
// 导入Element Plus的图标组件
// 导入Pinia状态管理的聊天存储
//   导入聊天相关的状态管理 store。用于获取和操作全局的聊天状态（如消息列表、加载状态等）
import { computed, ref, nextTick } from 'vue'
import { useSettingsStore, isReasoningModel } from '../stores/settings'
import { renderMarkdown } from '../utils/markdown'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete, RefreshRight, CopyDocument } from '@element-plus/icons-vue'
import { useChatStore } from '../stores/chat'

// 定义组件属性
// 声明组件接收的外部传入参数，用于父组件向子组件传递数据。
// props 就像子组件的 “输入参数”—— 父组件通过给子组件标签添加属性的方式传值，子组件则通过定义 props 来接收并使用这些值，且子组件通常不能直接修改 props 的值（需通过父组件更新，保证数据流向清晰）。
//  以网页中 ChatMessage.vue 组件为例：
//    子组件 ChatMessage 通过 defineProps 定义接收 message 这个 prop，指定其类型为 Object 且必传；
//    父组件（如 ChatView）在使用 <ChatMessage> 标签时，通过 :message="某条消息数据" 的方式，将具体的聊天消息传给子组件；
//    子组件再用 props.message 获取数据，渲染出 “用户 / AI 头像”“消息内容” 等界面元素。
// message实际用途：存储当前消息的详细信息（如角色、内容、时间戳等，可参考模板中 message.role、message.content 等用法）。
// loading实际用途：控制消息是否显示 “正在思考...” 的加载状态（模板中通过 :class="{ 'loading': loading }" 动态应用样式）。
const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// 加载提示文案：根据当前模型是否推理模型，显示不同提示
// 推理模型（如 DeepSeek-V4-Flash）会先"思考"，提示"正在推理"并说明原因；普通模型提示"正在生成"
const settingsStore = useSettingsStore()
const loadingText = computed(() => {
    return isReasoningModel(settingsStore.model)
        ? '正在推理中 · 此模型会先思考再作答'
        : '正在生成'
})

// 定义自定义事件（defineEmits）
// 子组件无法直接修改父组件的数据，但可以通过 emit 触发父组件定义的 “事件”，并可选地传递参数，由父组件决定如何处理这些参数（比如更新自身数据、调用方法等）。
// 先通过 defineEmits 声明要触发的事件名（明确类型，增强代码可读性），再通过 emit(事件名, 参数) 触发事件并传递数据。
//     // 1. 声明要触发的事件（这里是 "send" 事件，用于传递输入的消息）
//     const emits = defineEmits(['send']); 
//     const inputContent = ref('');

//     const sendMessage = () => {
//       if (inputContent.value.trim()) {
//         // 2. 触发 "send" 事件，并传递输入内容作为参数
//         emits('send', inputContent.value); 
//         inputContent.value = ''; // 子组件内部清空输入
//       }
//     };
// 'update'：当消息内容被编辑并保存时触发，用于通知父组件更新消息数据（对应 saveEdit 方法中 emit('update', ...)）。
// 'delete'：当消息被删除时触发，用于通知父组件移除该消息（对应 handleDelete 方法中 emit('delete', ...)）。
// 'regenerate'：当 AI 助手消息需要重新生成时触发，用于通知父组件重新请求生成该消息（对应 handleRegenerate 方法中 emit('regenerate', ...)）。
const emit = defineEmits(['update', 'delete', 'regenerate'])



// 1. 获取 Markdown 渲染后的 DOM 元素引用
// ref(null) 初始化一个空的响应式引用，用于后续获取渲染后的 Markdown 内容 DOM 元素
// 可通过该引用操作渲染后的 HTML 元素（如滚动、样式修改等）
const markdownBody = ref(null)

// 2. 标识消息是否处于编辑状态
// 布尔类型的响应式变量，默认值为 false（非编辑状态）
// 当用户点击"编辑"按钮时设为 true，进入编辑模式；取消编辑时设为 false
const isEditing = ref(false)

// 3. 编辑模式下的输入内容
// 字符串类型的响应式变量，用于存储编辑过程中的文本内容
// 进入编辑模式时会从原消息内容初始化，编辑过程中实时更新，保存时用于覆盖原内容
const editContent = ref('')

// 4. 编辑框的 DOM 引用
// 用于获取编辑模式下的文本输入框 DOM 元素
// 主要用于操作输入框（如自动聚焦、获取输入框尺寸等）
const editInputRef = ref(null)

// 5. 从状态管理中获取全局加载状态
// 引入聊天状态管理实例
const chatStore = useChatStore()
// 创建计算属性，实时获取全局的加载状态（由 chatStore 中的 isLoading 字段控制）
// 用于控制"重新生成"等按钮的禁用状态（加载中不可点击）
const isLoading = computed(() => chatStore.isLoading)


// 开始编辑
// 触发消息的编辑模式，将消息内容加载到编辑框中，并自动聚焦输入框，方便用户快速修改内容。
//   isVLMMessage.value：通过计算属性判断当前消息是否为 VLM 格式（包含图片的多模态消息）。
//   messageText.value：如果是 VLM 消息，仅提取其文本部分（忽略图片内容，因为图片不支持编辑）。
//   props.message.content：如果是普通文本消息，直接使用原始内容。
//   最终将需要编辑的内容赋值给 editContent.value（编辑框的双向绑定变量）。
//     父组件通过在子组件标签上绑定属性，将数据传给子组件；子组件通过 props 声明接收，即可在内部使用这些数据。
//   isEditing.value = true：将 isEditing 状态设为 true，触发组件从「显示模式」切换到「编辑模式」（对应模板中 v-if="isEditing" 的逻辑）。
//   await nextTick()：等待 Vue 完成当前 DOM 更新周期。因为 isEditing 状态变化后，编辑框（el-input）需要时间渲染到 DOM 中，直接调用聚焦可能失效。
//   editInputRef.value?.input?.focus()：
//     editInputRef 是编辑框（el-input）的引用。
//     通过 ?. 安全访问，避免未渲染时的错误。
//     调用 focus() 方法，自动将光标定位到输入框，提升用户体验。
const startEdit = async () => {
  // 对于VLM格式的消息，只编辑文本部分
  editContent.value = isVLMMessage.value ? messageText.value : props.message.content
  isEditing.value = true
  // 等待 DOM 更新后聚焦输入框
  await nextTick()
  editInputRef.value?.input?.focus()
}


// 取消编辑
// isEditing 是一个响应式变量（通过 ref 定义），用于控制是否显示编辑界面。
// 将其值设为 false，会隐藏编辑输入框，恢复显示原始消息内容。
// editContent 是一个响应式变量（通过 ref 定义），用于存储用户在编辑框中输入的临时内容。
// 将其清空是为了避免下次编辑时残留之前的编辑内容，确保每次编辑都是全新的状态。
const cancelEdit = () => {
  isEditing.value = false
  editContent.value = ''
}

// 保存编辑
const saveEdit = () => {
  if (!editContent.value.trim()) {
    ElMessage.warning('消息内容不能为空')
    return //终止函数执行（return），避免保存空消息。
  }
  
  // 对于VLM格式的消息，更新文本部分
  //当 isVLMMessage.value 为 true 时（表示当前消息是包含图片的 VLM 格式），通过对象扩展运算符（...）复制原消息内容（保留图片等信息），仅更新 text 字段为编辑后的文本。
  let updatedContent
  if (isVLMMessage.value) {
    updatedContent = {
      ...props.message.content,
      text: editContent.value.trim()
    }
  } else {
    updatedContent = editContent.value.trim()
  }
  
// 通过 emit('update', ...) 触发一个名为 update 的事件，将更新后的消息对象传递给父组件（通常是 ChatView.vue）。
// 新消息对象通过扩展运算符复制原消息的所有属性（如 id、role、timestamp 等），仅替换 content 为处理后的 updatedContent。
// 最后将 isEditing.value 设为 false，退出编辑模式，恢复消息的正常显示状态。
  emit('update', {
    ...props.message,
    content: updatedContent
  })
  isEditing.value = false
}

// 删除消息
// Element Plus 的 ElMessageBox.confirm 方法显示确认对话框
// 配置参数指定了提示文本、标题、按钮文字和警告类型（会显示黄色警告图标）
// 使用 await 等待用户操作（确认或取消）
// 当用户点击 "确定" 按钮时，ElMessageBox.confirm 会触发成功回调
// 此时调用 emit('delete', props.message) 向父组件发送 delete 事件，并传递当前消息对象作为参数
// 父组件（通常是 ChatView.vue）会监听该事件并执行实际的消息删除逻辑（如从消息列表中移除）
// 当用户点击 "取消" 按钮或关闭对话框时，ElMessageBox.confirm 会抛出错误
// catch 块捕获该错误但不执行任何操作，实现取消删除的功能

// async/await 确保了 “等待用户操作” 这个步骤完成后，再决定是否执行后续的删除逻辑，避免了不等用户确认就直接删除的错误。
const handleDelete = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这条消息吗？', //对话框内容
      '警告',                //对话框标题
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',    //对话框类型 警告样式
      }
    )
    //用户确认后，触发delete事件通知父组件删除消息
    emit('delete', props.message)
  } catch {
    // 用户取消删除操作
  }
}

// 格式化时间函数
// 将消息的 timestamp（ISO 时间字符串）转换为本地时间字符串（如 14:30:25），用于消息底部的时间显示。
const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString()
}

// 计算属性：判断是否为VLM格式消息
// 这是一个计算属性（computed），用于判断当前消息是否为 VLM 消息
// 判断依据有两个：
// 消息内容（content）的类型必须是对象（object）
// 这个对象中必须包含 images 字段（通常用于存储图片信息）
// 在 Vue 中，computed 属性会根据依赖自动缓存和更新
const isVLMMessage = computed(() => {
  return typeof props.message.content === 'object' && props.message.content.images
})

// 计算属性：获取消息中的图片
// 这个计算属性用于提取消息中的图片列表
// 如果是 VLM 消息（isVLMMessage.value 为 true），则返回消息内容中的 images 字段
// 使用 || [] 做容错处理，确保即使没有图片也返回一个空数组
// 如果不是 VLM 消息，则直接返回空数组
const messageImages = computed(() => {
  if (isVLMMessage.value) {
    return props.message.content.images || []
  }
  return []
})

// 计算属性：获取消息文本
// 这个计算属性用于统一提取消息的文本内容
// 对于 VLM 消息，文本内容存储在 content.text 字段中
// 使用 || '' 做容错处理，确保即使没有文本也返回空字符串
// 对于普通消息，直接返回 content 字段（通常是字符串类型）
const messageText = computed(() => {
  if (isVLMMessage.value) {
    return props.message.content.text || ''
  }
  return props.message.content
})

// 计算属性：渲染 Markdown 内容
// 如果是 VLM 消息（isVLMMessage.value 为 true），则通过 messageText.value 提取消息中的文本部分（VLM 消息的文本内容单独存储在 content.text 中）。
// 如果是普通文本消息（isVLMMessage.value 为 false），则直接使用 props.message.content 作为文本内容（普通消息的 content 本身就是字符串）。
// 调用 renderMarkdown 函数（从 ../utils/markdown 导入），将提取到的文本内容转换为 HTML。
// renderMarkdown 基于 markdown-it 实现，支持 Markdown 语法解析和代码高亮（见 markdown.js 中的配置）。
const renderedContent = computed(() => {
  // 1. 确定要渲染的文本内容
  const textContent = isVLMMessage.value ? messageText.value : props.message.content
  // 2. 调用工具函数渲染 Markdown
  return renderMarkdown(textContent)
})

// 图片预览功能
// window.open(url, target) 是浏览器原生 API，用于打开一个新窗口。
// 第一个参数 ''：表示新窗口初始加载的 URL 为空（后续通过 document.write 动态写入内容，无需预先加载某个页面）。
// 第二个参数 '_blank'：表示新窗口在 “新标签页” 中打开（浏览器默认行为，若改为具体窗口名则会复用该窗口）。
// 通过 newWindow.document.write 向新窗口的文档中直接写入 HTML 字符串，构建预览页面的完整结构。
// object-fit:contain	确保图片按 “原比例缩放”，且完整显示在容器内（不会拉伸变形，也不会裁剪图片）。例如：横图会水平铺满、垂直留黑边；竖图会垂直铺满、水平留黑边。
// min-height:100vh	让 body 最小高度等于 “视口高度”（100vh = 浏览器窗口可见高度），确保即使图片很小，背景也能铺满整个窗口。
// 用 Flex 布局将图片 “水平居中”（justify-content:center）和 “垂直居中”（align-items:center），确保图片始终在窗口正中央。
const previewImage = (imageUrl) => {
  // 创建一个新的窗口来预览图片
  const newWindow = window.open('', '_blank')
  newWindow.document.write(`
    <html>
      <head><title>图片预览</title></head>
      <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;">
        <img src="${imageUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" />
      </body>
    </html>
  `)
}

// 复制文本到剪贴板的通用方法
// navigator.clipboard.writeText(text) 是浏览器提供的 API，用于将指定文本 text 写入系统剪贴板，实现复制功能。
// 它返回一个 Promise 对象，操作成功时 Promise 会 resolve，失败（如无权限）则 reject。使用时通常配合 async/await 或 .then() 处理异步操作，相比传统的 document.execCommand('copy') 更现代、更简洁。
// ElMessage：Element 组件库提供的全局消息提示工具，用于在页面弹出轻量级反馈提示（如成功、错误、警告等）；
// .success()：ElMessage 的静态方法之一，指定提示类型为 “成功”，会自带绿色图标和成功样式，
const copyToClipboard = async (text) => {
  try {
    // 使用浏览器原生 API 将文本写入剪贴板
    await navigator.clipboard.writeText(text)
    // 复制成功时显示成功提示
    ElMessage.success('代码已复制到剪贴板')
  } catch (err) {
    // 复制失败时打印错误日志并显示失败提示
    console.error('复制失败:', err)
    ElMessage.error('复制失败')
  }
}

// 处理代码块点击事件
// 用户点击页面中的代码块（<pre><code>...</code></pre> 结构）
const handleCodeBlockClick = (event) => {
  const preElement = event.target.closest('pre')
  if (preElement) {
    const codeElement = preElement.querySelector('code')
    if (codeElement) {
      copyToClipboard(codeElement.textContent)
    }
  }
}

// 处理编辑时的按键事件
// 当用户按下 Enter 键时触发该函数（通过模板中的 @keydown.enter.exact.prevent 绑定）
// 如果同时按住了 Shift 键（e.shiftKey 为 true），则直接返回不做处理，允许用户在文本框中换行
// 如果没有按 Shift 键，则调用 saveEdit() 函数保存编辑内容并发送更新
const handleEditKeydown = (e) => {
  if (e.shiftKey) return // 如果按住 Shift，允许换行
  saveEdit() // 直接保存并发送
}

// 处理重新生成
// 在控制台打印日志 "重新生成" 用于调试
// 通过 emit 向父组件（通常是 ChatView.vue）触发 regenerate 事件
// 传递当前消息对象 props.message 作为参数，使父组件知道需要重新生成哪条 AI 回复
//  'regenerate' 是自定义事件的名称，父组件可以通过监听这个事件来执行相应处理（比如重新生成 AI 回复）。
const handleRegenerate = () => {
  console.log('重新生成')
  emit('regenerate', props.message)
}

// 复制全部内容
const handleCopyAll = async () => {
  try {
    await navigator.clipboard.writeText(props.message.content)
    ElMessage.success('内容已复制到剪贴板')
  } catch (err) {
    console.error('复制失败:', err)
    ElMessage.error('复制失败')
  }
}
</script>

<!-- 
  scoped：样式只作用于当前 ChatMessage.vue 组件，不会污染其他组件（Vue 会自动给元素加唯一属性，比如 data-v-xxx，避免样式冲突）。 
  代码中 var(--primary-color) 是 CSS 原生变量（不是 SCSS 变量），这些变量在项目全局的 SCSS 文件（如 variables.scss）中定义，比如 --primary-color: #42b983（主题色），方便统一控制样式。
-->
<style lang="scss" scoped>
.message-container {
  display: flex;
  margin: 0.5rem 0;
  padding: 0.3rem;
  gap: 0.8rem;
  transition: all 0.3s ease;
  
  // 用户消息样式
  &.message-user {
    flex-direction: row-reverse;
    //翻转实现用户布局在右侧
    .message-content {
      align-items: flex-end;
    }
    
    // 深色模式下用户消息的特殊样式
    [data-theme="dark"] & {
      .message-text {
        background-color: var(--primary-color);
        color: #ffffff;
        box-shadow: var(--box-shadow), 0 0 8px rgba(92, 174, 253, 0.3);
      }
    }
  }

  // 助手消息深色模式优化
  &.message-assistant {
    [data-theme="dark"] & {
      .message-text {
        background-color: #2d2d2d;
        box-shadow: var(--box-shadow), 0 0 4px rgba(255, 255, 255, 0.1);
      }
    }
  }

  .markdown-body {
    // 关键：Markdown 内容用 normal 换行，让 Markdown 结构（p、换行）控制间距，
    // 不被外层 .message-text 的 white-space:pre-wrap 把 \n 也渲染成换行（导致双重空白行）
    white-space: normal;
    line-height: 1.6; // 正文行高，阅读舒适

    :deep() {
      // Markdown 内容样式
      h1, h2, h3, h4, h5, h6 {
        margin: 0.4rem 0;
        font-weight: 600;
        line-height: 1.25;
      }

      p {
        margin: 0.3rem 0; // 段落间距适度，不再双重空白
      }

      code {
        font-family: var(--code-font-family);
        padding: 0.2em 0.4em;
        margin: 0;
        font-size: 85%;
        background-color: var(--code-bg);
        border-radius: 3px;
        color: var(--code-text);
      }

      pre {
        position: relative;
        padding: 2rem 1rem 1rem;
        overflow: auto;
        font-size: 85%;
        line-height: 1.45;
        background-color: var(--code-block-bg);
        border-radius: var(--border-radius);
        margin: 0.3rem 0;
        border: 1px solid var(--border-color);
        
        // 代码头部样式
        .code-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 0.3rem 1rem;
          background-color: var(--code-header-bg);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: var(--code-font-family);
          
          .code-lang {
            font-size: 0.8rem;
            color: var(--text-color-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        }

        &::after {
          content: "点击复制";
          position: absolute;
          top: 0.3rem;
          right: 1rem;
          padding: 0.2rem 0.5rem;
          font-size: 0.75rem;
          color: var(--text-color-secondary);
          opacity: 0;
          transition: opacity 0.3s;
          font-family: system-ui, -apple-system, sans-serif;
        }

        &:hover::after {
          opacity: 0.8;
        }

        code {
          padding: 0;
          background-color: transparent;
          color: inherit;
          display: block;
          font-family: var(--code-font-family);
        }
      }

      blockquote {
        margin: 0.15rem 0;
        padding: 0 0.75rem;
        color: var(--text-color-secondary);
        border-left: 0.25rem solid var(--border-color);
      }

      ul, ol {
        margin: 0.15rem 0;
        padding-left: 1.5rem;
      }

      table {
        border-collapse: collapse;
        width: 100%;
        margin: 0.15rem 0;

        th, td {
          padding: 0.5rem;
          border: 1px solid var(--border-color);
        }

        th {
          background-color: var(--bg-color-secondary);
        }
      }

      img {
        max-width: 100%;
        max-height: 300px;
        object-fit: contain;
        margin: 0.3rem 0;
        border-radius: var(--border-radius);
        cursor: pointer;
        
        &:hover {
          opacity: 0.9;
        }
      }

      a {
        color: var(--primary-color);
        text-decoration: none;// 取消下划线

        &:hover {
          text-decoration: underline;// hover 时下划线（提示可点击）
        }
      }

      > *:last-child {
        margin-bottom: 0;
      }
    }
  }
}

//头像样式
.message-avatar {
  flex-shrink: 0;// 禁止头像缩小（即使内容很多，头像也保持原尺寸）
  
  .el-avatar {
    background-color: var(--primary-color);
    
    &.assistant {
      background-color: var(--success-color);
    }
  }
}

//消息内容区
.message-content {
  display: flex;
  flex-direction: column; // 垂直布局：文本在上，底部时间/按钮在下
  gap: 0.25rem; // 文本和底部区域的间距
  max-width: 80%;// 内容最大宽度 80%（避免消息太宽，手机上也美观）
}

//消息文本框
.message-text {
  background-color: var(--bg-color);
  padding: 0.8rem;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  // 用 pre-wrap 保留用户输入的换行；但 AI 的 Markdown 内容由 .markdown-body 控制间距
  // 避免 Markdown 的 \n 和 <p> 双重产生空白行
  white-space: pre-wrap;
  transition: all 0.3s ease;
  
  // 深色模式下增强阴影效果
  [data-theme="dark"] & {
    border: 1px solid var(--border-color);
  }
}

// VLM 消息样式
.vlm-message {
  .message-images {
    display: flex;
    flex-wrap: wrap;// 图片太多时换行（不会横向溢出）
    gap: 0.5rem;
    margin-bottom: 1rem;// 图片和文本的间距
    
    .message-image {// 单个图片
      max-width: 200px;
      max-height: 200px;
      object-fit: cover;// 图片裁剪（填满容器，可能裁掉部分，但不会拉伸）
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: transform 0.2s ease;
      
      &:hover {
        transform: scale(1.05);// hover 时放大 5%（反馈）
      }
    }
  }
}

//AI正在思考时的样式
.message-loading {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--text-color-secondary);
  font-size: 0.9rem;

  // 动态三点呼吸动画：让用户感知"模型在工作"而非卡住
  .loading-dots {
    display: inline-flex;
    gap: 4px;

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--text-color-secondary, #909399);
      animation: dot-breathe 1.2s ease-in-out infinite;

      // 三个点依次延迟，形成波浪
      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }
  }

  .loading-text {
    opacity: 0.8;
  }
}

@keyframes dot-breathe {
  0%, 100% { transform: scale(0.6); opacity: 0.4; }
  50%      { transform: scale(1.2); opacity: 1; }
}

.message-meta {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}

.message-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.5rem;
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}

.message-time {
  margin-right: 0.5rem; // 时间和按钮的间距
}

.message-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0.6;
  transition: opacity 0.2s ease;
  
  &:hover {
    opacity: 1;
  }
  
  .el-button {
    padding: 2px 4px;
    height: 20px;
    transition: all 0.2s ease;
    
    .el-icon {
      font-size: 14px;
    }
    
    &:hover {
      color: var(--primary-color);
      background-color: var(--hover-bg-color);
      transform: scale(1.05);
    }
    
    // 深色模式下的按钮样式
    [data-theme="dark"] & {
      &:hover {
        background-color: var(--active-bg-color);
        box-shadow: 0 2px 4px rgba(92, 174, 253, 0.2);
      }
    }
  }
}

.message-edit {
  background-color: var(--bg-color);
  padding: 0.75rem;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);

  .el-input {
    margin-bottom: 0.5rem;
    
    :deep(.el-textarea__inner) {
      background-color: var(--bg-color-secondary);
      border-color: var(--border-color);
      resize: none; // 禁用手动调整大小
      
      &:focus {
        border-color: var(--primary-color);
      }
    }
  }

  .edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
}
</style>

