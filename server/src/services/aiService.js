// AI 服务：服务端统一持 Key 调 SiliconFlow，前端全程接触不到密钥
const API_KEY = process.env.SILICONFLOW_API_KEY
const BASE_URL = process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1'

// 请求上游的公共逻辑（流式/非流式共用）
async function requestUpstream(payload) {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`, // Key 只出现在服务端
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    const err = new Error(error?.error?.message || `上游 API 错误: ${response.status}`)
    err.status = response.status // 把上游错误码透传给前端
    throw err // Express 5 自动捕获 → 交给 errorHandler
  }

  return response
}

// 非流式对话：完整拿到 AI 回复 JSON 后一次性返回
export async function chatCompletion(payload) {
  const response = await requestUpstream(payload)
  return response.json()
}

// 流式对话：返回上游的 Response，body 是可读流，由路由层透传给前端
export async function chatCompletionStream(payload) {
  const response = await requestUpstream(payload)
  return response // 保留 SSE 字节流，前端解析方式与直连 SiliconFlow 完全一致
}
