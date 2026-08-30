// AI 服务：服务端统一持 Key 调 SiliconFlow，前端全程接触不到密钥
const API_KEY = process.env.SILICONFLOW_API_KEY
const BASE_URL = process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1'

const MAX_RETRY = 2 // 最多重试次数
const RETRY_DELAY_MS = 500 // 基础退避时间

// 判断该状态码是否值得重试（临时性错误）
// 429=限流，5xx=服务端临时故障；4xx 业务错误（如 400 参数错误）不重试
const isRetryable = (status) => status === 429 || status >= 500

// 请求上游的公共逻辑（流式/非流式共用）
// 面试考点：第三方 API 偶发故障时自动重试（指数退避），比直接甩错误给用户健壮
async function requestUpstream(payload, attempt = 1) {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`, // Key 只出现在服务端
    },
    body: JSON.stringify(payload),
  })

  // 临时性错误（限流/5xx）且未达重试上限 → 退避后重试
  if (isRetryable(response.status) && attempt <= MAX_RETRY) {
    const delay = RETRY_DELAY_MS * 2 ** (attempt - 1) // 指数退避：500ms, 1000ms
    console.warn(`上游返回 ${response.status}，${delay}ms 后重试 (第 ${attempt} 次)`)
    await new Promise((r) => setTimeout(r, delay))
    return requestUpstream(payload, attempt + 1)
  }

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
