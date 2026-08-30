// 后端 Node.js 会话持久化接口
// 作用：把对话记录存到 MySQL，刷新页面后从数据库恢复历史
import axios from 'axios'
import { API_BASE_URL as BASE_URL } from '../config'

// axios 拦截器：每次请求自动带上 JWT，无需每个函数手动加
// 面试考点：拦截器（interceptor）统一处理请求/响应，适合做鉴权、日志、统一错误
const http = axios.create({ baseURL: BASE_URL })
http.interceptors.request.use((config) => {
    const token = localStorage.getItem('ai-chat-token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// 创建会话（带第一条用户消息）
export const createConversation = async (title, firstMessage) => {
  const res = await http.post(`/api/conversations`, { title, firstMessage })
  return res.data.data // { id }
}

// 追加一条消息到指定会话
export const addMessage = async (conversationId, role, content) => {
  const res = await http.post(`/api/conversations/${conversationId}/messages`, { role, content })
  return res.data.data
}

// 获取会话列表
export const getConversations = async () => {
  const res = await http.get(`/api/conversations`)
  return res.data.data // [{ id, title, created_at }]
}

// 获取某个会话的完整消息列表
export const getConversationDetail = async (conversationId) => {
  const res = await http.get(`/api/conversations/${conversationId}`)
  return res.data.data // { id, title, messages: [] }
}

// 删除某个会话（后端级联删除其所有消息）
export const deleteConversation = async (conversationId) => {
  const res = await http.delete(`/api/conversations/${conversationId}`)
  return res.data
}
