<template>
    <!-- 聊天容器 -->
    <div class="chat-container">
        <!-- 聊天头部，包含标题和设置按钮 -->
        <div class="chat-header">
            <h1>AI Chat</h1>
            <el-button circle :icon="Setting" @click="showSettings = true" />
        </div>

        <!-- 消息容器，显示对话消息 -->
        <!-- 
            ref="messagesContainer"：绑定 DOM 引用，用于后续滚动到底部等操作 
            chat-message 组件参数：
                :key="message.id"：列表渲染的唯一标识
                :message="message"：传递消息对象（包含内容、角色、时间等信息）
                :loading="message.loading"：控制该消息是否显示加载状态
            事件绑定：
                @update：监听消息更新事件（对应消息编辑功能）
                @delete：监听消息删除事件
                @regenerate：监听重新生成消息事件（针对 AI 回复）
        -->
        <div class="messages-container" ref="messagesContainer">
            <template v-if="messages.length">
                <chat-message v-for="message in messages" :key="message.id" :message="message"
                    :loading="message.loading" @update="handleMessageUpdate" @delete="handleMessageDelete" @regenerate="handleRegenerate" />
            </template>
            <div v-else class="empty-state">
                <el-empty description="开始对话吧" />
            </div>
        </div>

        <!-- 聊天输入框 -->
        <chat-input :loading="isLoading" @send="handleSend" @clear="handleClear" />

        <!-- 设置面板 -->
        <settings-panel v-model="showSettings" />
    </div>
</template>

<script setup>
// Vue 核心 API：导入 ref（响应式变量）、computed（计算属性）、watch（监听器）、nextTick（DOM 更新后执行）等。
// 图标与组件：导入 Setting 图标和三个核心组件（ChatMessage 消息项、ChatInput 输入框、SettingsPanel 设置面板）。
// 状态管理：导入 useChatStore（聊天状态，如消息列表、加载状态）和 useSettingsStore（应用设置，如模型参数、主题）。
// 工具与 API：导入 chatApi（接口请求工具）和 messageHandler（消息格式化 / 处理工具）。
import { ref, computed, watch, nextTick } from 'vue'
import { Setting } from '@element-plus/icons-vue'
import { useChatStore } from '../stores/chat'
import { chatApi } from '../utils/api'
import { messageHandler } from '../utils/messageHandler'
import ChatMessage from '../components/ChatMessage.vue'
import ChatInput from '../components/ChatInput.vue'
import SettingsPanel from '../components/SettingsPanel.vue'
import { useSettingsStore } from '../stores/settings'

// 初始化聊天存储
const chatStore = useChatStore()
// 计算属性，获取消息列表和加载状态
    // messages：实时获取 chatStore 中的消息列表（响应式同步）。
    // isLoading：实时获取当前是否处于加载状态（控制按钮禁用 / 加载动画）。
    // showSettings：控制设置面板的显示 / 隐藏（默认 false）。
    // messagesContainer：绑定消息容器的 DOM 引用（用于后续滚动操作）。
const messages = computed(() => chatStore.messages)
const isLoading = computed(() => chatStore.isLoading)
// 设置面板显示状态
const showSettings = ref(false)
// 消息容器引用，用于滚动到底部
const messagesContainer = ref(null)

// 监听消息变化，滚动到底部
// 功能：当消息列表（messages）发生变化时，自动将消息容器滚动到底部（最新消息可见）。
// 细节：
    // watch 监听 messages 的变化，{ deep: true } 确保深层变化（如消息内容修改）也能触发。
    // nextTick 确保 DOM 已更新后再执行滚动（避免滚动到旧位置）。
    // 通过 messagesContainer.value.scrollTop = scrollHeight 实现滚动到底部。
watch(messages, () => {
    // 涉及到页面渲染，需要使用 nextTick
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
    })
}, { deep: true })

/**
 * 发送消息处理函数
 * @param {string|Object} content 用户输入的消息内容，可能是字符串或VLM格式对象
 */
const handleSend = async (content) => {
    console.log('发送消息', content)

    // if (isLoading.value) return
    // 添加用户消息和助理的空消息
    // 参数：content 是用户输入的内容（可能是字符串文本，或 VLM 格式的图片 + 文本对象）。
    // 状态更新：
    // 调用 chatStore.addMessage 添加两条消息：用户消息（内容为 content）和一个空的 AI 回复（占位，等待后续更新）。
    // 设置 chatStore.isLoading = true，触发加载状态（输入框禁用、显示加载动画）。
    chatStore.addMessage(messageHandler.formatMessage('user', content))
    chatStore.addMessage(messageHandler.formatMessage('assistant', ''))
    chatStore.isLoading = true

    try {
        // 获取设置并发送消息
        const settingsStore = useSettingsStore()
        
        // 构建消息数组，处理VLM格式
        const messagesToSend = []
        
        // 处理历史消息
        for (let i = 0; i < messages.value.length - 1; i++) {
            const msg = messages.value[i]
            if (msg.role === 'user' && typeof msg.content === 'object' && msg.content.text !== undefined) {
                // 这是一个VLM格式的消息，需要重构为API格式
                const apiMessage = {
                    role: 'user',
                    content: []
                }
                
                // 添加图片
                if (msg.content.images && msg.content.images.length > 0) {
                    msg.content.images.forEach(imageUrl => {
                        apiMessage.content.push({
                            type: 'image_url',
                            image_url: {
                                url: imageUrl,
                                detail: settingsStore.imageDetail
                            }
                        })
                    })
                }
                
                // 添加文本
                if (msg.content.text) {
                    apiMessage.content.push({
                        type: 'text',
                        text: msg.content.text
                    })
                }
                
                messagesToSend.push(apiMessage)
            } else {
                // 传统格式消息
                messagesToSend.push({
                    role: msg.role,
                    content: msg.content
                })
            }
        }
        
        // 添加当前用户消息
        if (typeof content === 'object' && content.role === 'user') {
            messagesToSend.push(content)
        } else {
            messagesToSend.push({
                role: 'user',
                content: content
            })
        }
        
        console.log('发送给API的消息:', messagesToSend)
        
        const response = await chatApi.sendMessage(
            messagesToSend,
            settingsStore.streamResponse
        )

        // 处理流式响应或同步响应
        if (settingsStore.streamResponse) {
            // 流式处理，并更新消息和token计数
            await messageHandler.processStreamResponse(response, {
                updateMessage: (content) => chatStore.updateLastMessage(content),
                updateTokenCount: (usage) => chatStore.updateTokenCount(usage)
            });
        } else {
            // 同步处理，并更新消息和token计数
            const result = await messageHandler.processSyncResponse(response, (content) => {
                chatStore.updateLastMessage(content)
            });
            if (result.usage) {
                chatStore.updateTokenCount(result.usage)
            }
        }
    } catch (error) {
        chatStore.updateLastMessage('抱歉，发生了错误，请稍后重试。')
    } finally {
        chatStore.isLoading = false
    }
}

/**
 * 清除消息处理函数
 */
const handleClear = () => {
    chatStore.clearMessages()
}

// 处理消息更新
const handleMessageUpdate = async (updatedMessage) => {
    // 找到被编辑消息在消息列表中的索引
    //使用findIndex方法，这个方法会遍历messages数组中的每一个元素m，检查是否存在某
    // 个元素m的id属性与message.id相等。如果找到这样的元素，就返回该元素在数组中的
    // 索引位置；如果遍历完整个数组都没有找到，就返回 -1 。
    const index = chatStore.messages.findIndex(m => m.id === updatedMessage.id)
    if (index !== -1) {
        // 删除当前消息及其后的助手回复
        chatStore.messages.splice(index, 2)
        // 重新发送更新后的消息
        await handleSend(updatedMessage.content)
    }
}

// 处理消息删除
const handleMessageDelete = (message) => {
    const index = chatStore.messages.findIndex(m => m.id === message.id)
    if (index !== -1) {
        // 删除该消息及其后的助手回复
        chatStore.messages.splice(index, 2)
    }
}

// 处理重新生成
const handleRegenerate = async (message) => {
    console.log(message)
    console.log(chatStore.messages)

    const index = chatStore.messages.findIndex(m => m.id === message.id&&m.role==="assistant")
    console.log(index)
    if (index !== -1 && index > 0) {
        // 获取上一条用户消息
        const userMessage = chatStore.messages[index - 1]
        // 删除当前的AI回复,但是删了后再发送的时候，userMessage不会指向当前这个
        chatStore.messages.splice(index-1, 2)
        // 重新发送请求前应该检查 isLoading 状态
        if (isLoading.value) return
        
        chatStore.isLoading = true
        try {
            console.log(userMessage.content)
            // 重新发送请求
            await handleSend(userMessage.content)
        } catch (error) {
            console.error('重新生成失败:', error)
            // 恢复原来的消息
            chatStore.messages.splice(index, 0, message)
        } finally {
            chatStore.isLoading = false
        }
    }
}
</script>

<style lang="scss" scoped>
/* 定义聊天容器的样式，占据整个视口高度，使用flex布局以支持列方向的布局 */
.chat-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
}

/* 设置聊天头部的样式，包括对齐方式和背景色等 */
.chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background-color: var(--bg-color);
    border-bottom: 1px solid var(--border-color);
    transition: all 0.3s ease;

    // 深色模式下的头部增强效果
    [data-theme="dark"] & {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(8px);
    }

    /* 设置聊天头部标题的样式，无默认间距，自定义字体大小和颜色 */
    h1 {
        margin: 0;
        font-size: 1.5rem;
        color: var(--text-color-primary);
        font-weight: 600;
        transition: color 0.3s ease;
    }
    
    .el-button {
        transition: all 0.2s ease;
        
        &:hover {
            transform: rotate(90deg);
        }
    }
}

/* 定义消息容器的样式，占据剩余空间，支持滚动，自定义背景色 */
.messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    background-color: var(--bg-color-secondary);
    transition: background-color 0.3s ease;
    
    // 深色模式下的消息容器优化
    [data-theme="dark"] & {
        background: linear-gradient(180deg, var(--bg-color-secondary) 0%, rgba(26, 26, 26, 0.95) 100%);
    }
}

/* 设置空状态时的样式，占据全部高度，居中对齐内容 */
.empty-state {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>