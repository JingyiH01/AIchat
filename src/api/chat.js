// 后端 Node.js 会话持久化接口
// 作用：把对话记录存到 MySQL，刷新页面后从数据库恢复历史
import axios from 'axios'

// 后端 Node.js 服务地址（和 server 里的 PORT 一致，默认 3000）
const BASE_URL = 'http://localhost:3000'

// 创建会话（带第一条用户消息）
export const createConversation = async (title, firstMessage) => {
  const res = await axios.post(`${BASE_URL}/api/conversations`, { title, firstMessage })
  return res.data.data // { id }
}

// 追加一条消息到指定会话
export const addMessage = async (conversationId, role, content) => {
  const res = await axios.post(`${BASE_URL}/api/conversations/${conversationId}/messages`, { role, content })
  return res.data.data
}

// 获取会话列表
export const getConversations = async () => {
  const res = await axios.get(`${BASE_URL}/api/conversations`)
  return res.data.data // [{ id, title, created_at }]
}

// 获取某个会话的完整消息列表
export const getConversationDetail = async (conversationId) => {
  const res = await axios.get(`${BASE_URL}/api/conversations/${conversationId}`)
  return res.data.data // { id, title, messages: [] }
}
