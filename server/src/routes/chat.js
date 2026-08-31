import { Router } from 'express'
import { Readable } from 'node:stream' // 用于把 Web 流转换为 Node 流
import { pipeline } from 'node:stream/promises' // 自动管理背压与资源清理
import { chatCompletion, chatCompletionStream } from '../services/aiService.js'

const router = Router()

// 模型白名单：只允许前端选择这些模型，防止改请求体调别的付费模型
// 全部经过真实 API 探测确认可用（2026-08-30）
const ALLOWED_MODELS = new Set([
  'deepseek-ai/DeepSeek-V4-Flash',        // ✅ 免费（默认）
  'Qwen/Qwen2.5-7B-Instruct',             // ✅ 免费
  'deepseek-ai/DeepSeek-V3.2',            // ✅ 文本旗舰
  'Qwen/Qwen3.5-35B-A3B',                 // ✅ 文本
  'Qwen/Qwen3-VL-32B-Instruct',           // ✅ VLM 图片识别
  'zai-org/GLM-4.5V',                     // ✅ VLM 图片识别
  'Qwen/Qwen3-Omni-30B-A3B-Instruct',     // ✅ VLM 图像+音频
])

// 支持图片输入的模型（VLM）
const VLM_MODELS = new Set([
  'Qwen/Qwen3-VL-32B-Instruct',
  'zai-org/GLM-4.5V',
  'Qwen/Qwen3-Omni-30B-A3B-Instruct',
])

// 清洗消息：非 VLM 模型收到带图片的消息时，剥掉图片只留文本
// 解决：切换模型后历史里残留的图片消息，导致文本模型 400
// 面试考点：服务端对输入做健壮性兜底，防止前端状态残留导致上游报错
function sanitizeMessages(messages, model) {
  const isVLM = VLM_MODELS.has(model)
  const cleaned = messages.map((msg) => {
    // 消息内容是数组（OpenAI 多模态格式：[{type:'image_url'}, {type:'text'}]）
    if (Array.isArray(msg.content)) {
      // 非 VLM 模型：只保留 text 项
      if (!isVLM) {
        const textParts = msg.content
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
        return { ...msg, content: textParts.join('\n') }
      }
      return msg // VLM 模型保留完整多模态内容
    }
    return msg // 普通字符串消息原样返回
  })

  // 合并连续的 user 消息（OpenAI 规范要求 user 之间必须隔 assistant）
  // 防御：历史数据脏（之前 bug 残留连续 user）也不会导致上游 400
  const result = []
  for (const msg of cleaned) {
    const last = result[result.length - 1]
    if (msg.role === 'user' && last && last.role === 'user') {
      // 两条连续 user 合并成一条，内容用换行连接
      last.content = [last.content, msg.content].filter(Boolean).join('\n')
    } else {
      result.push({ ...msg })
    }
  }
  return result
}

// POST /api/chat  前端把对话发过来，后端代理给 SiliconFlow
router.post('/', async (req, res) => {
  const { messages, model, stream = false, ...params } = req.body

  // ---- 请求体校验（面试考点：为什么要在服务端校验）----
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ code: 400, msg: 'messages 不能为空' })
  }
  if (!model || !ALLOWED_MODELS.has(model)) {
    return res.status(400).json({ code: 400, msg: `不支持的模型: ${model}` })
  }

  // 清洗消息：非 VLM 模型剥掉图片，防止历史残留图片消息导致 400
  const cleanMessages = sanitizeMessages(messages, model)
  console.log('🔍 消息角色序列:', cleanMessages.map(m => m.role).join(' → '), '| model:', model) // 临时调试

  // 注入 system prompt：锚定模型身份，防止被历史对话里旧模型的角色自述带偏
  // 面试考点：system prompt 是最高优先级指令，用来固定模型人设、行为边界
  const systemPrompt = {
    role: 'system',
    content: `你是 ${model} 模型，请以该身份诚实、准确地回答用户问题。不要模仿或延续对话历史中其他 AI 助手的角色自述。`,
  }
  const payload = { messages: [systemPrompt, ...cleanMessages], model, ...params }

  // ---- 流式分支：SSE 透传 ----
  if (stream) {
    // 注意：stream 已被解构出 body，转发给上游时必须手动加回 stream:true
    // 否则上游收到的是非流式请求，返回整段 JSON 而不是 SSE 分块
    const upstream = await chatCompletionStream({ ...payload, stream: true })

    // 设置 SSE 响应头（一旦发出就不能再回 JSON，后续错误只能结束流）
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    // 核心：把 Web 流转成 Node 流，用 pipeline 透传给前端
    // pipeline 自动做：背压控制（前端慢就暂停上游读）+ 结束/出错自动清理
    const source = Readable.fromWeb(upstream.body)
    pipeline(source, res).catch((err) => {
      // 管道中断（通常是客户端断连），响应头已发，只能销毁连接
      console.error('🔌 流式管道中断:', err.message)
      if (!res.destroyed) res.destroy()
    })

    // 断连兜底：客户端关闭且未正常结束时，主动销毁上游流防止挂起
    res.on('close', () => {
      if (!res.writableEnded) source.destroy()
    })

    return
  }

  // ---- 非流式分支 ----
  const data = await chatCompletion(payload)
  res.json(data)
})

export default router
