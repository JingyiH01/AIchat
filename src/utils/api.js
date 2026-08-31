// API 客户端：所有 AI 请求走后端 BFF 层（不再直连 SiliconFlow）
// 面试考点：浏览器不再接触 API Key，Key 只在服务端环境变量里
import { useSettingsStore } from '../stores/settings'
import { API_BASE_URL } from '../config'

// 认证头：带登录拿到的 JWT（存在 localStorage）

// 认证头：带登录拿到的 JWT（存在 localStorage）
const createHeaders = (stream = false) => {
    const token = localStorage.getItem('ai-chat-token') || ''
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(stream && { 'Accept': 'text/event-stream' })
    }
}

// 统一错误处理：后端返回 { code, msg }，非 2xx 抛异常
async function handleError(response) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.msg || `HTTP error! status: ${response.status}`)
}

export const chatApi = {
    async sendMessage(messages, stream = false) {
        const settingsStore = useSettingsStore()

        const payload = {
            model: settingsStore.model,
            messages,
            temperature: settingsStore.temperature,
            max_tokens: settingsStore.maxTokens,
            stream, // 是否流式（后端根据这个字段决定走 SSE 透传）
            top_p: settingsStore.topP,
            top_k: settingsStore.topK,
        }

        // 超时保护：非流式 30s、流式 120s 无响应则中止，避免按钮一直转圈
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), stream ? 120000 : 30000)
        try {
            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: createHeaders(stream),
                body: JSON.stringify(payload),
                signal: controller.signal
            })

            if (!response.ok) {
                await handleError(response)
            }

            if (stream) {
                return response // 流式：返回 Response 对象，由 messageHandler 解析 SSE
            }

            return await response.json()
        } finally {
            clearTimeout(timeout)
        }
    },

    // 异步任务接口（保留签名，供兼容；走后端代理）
    async sendAsyncMessage(messages) {
        const settingsStore = useSettingsStore()

        const payload = {
            model: settingsStore.model,
            messages,
            temperature: settingsStore.temperature,
            max_tokens: settingsStore.maxTokens,
            stream: false,
        }

        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: createHeaders(),
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            await handleError(response)
        }
        return await response.json()
    },

    async getAsyncResult(taskId) {
        // 后端目前没有独立异步任务队列，此接口保留占位
        throw new Error('异步任务接口未实现')
    }
}
