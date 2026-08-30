// 应用实例：配置中间件 + 路由
import express from 'express'
import cors from 'cors'
import chatRouter from './routes/chat.js'
import conversationRouter from './routes/conversation.js'
import authRouter from './routes/auth.js'
import { rateLimiter } from './middleware/rateLimit.js'
import { authMiddleware } from './middleware/auth.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

// CORS 白名单：只允许前端访问，防止任何网站都能调我们的接口
// 本地默认 localhost:5173；部署时用环境变量 ALLOWED_ORIGINS 覆盖（逗号分隔）
// 面试考点：为什么不能用 cors() 裸允许所有域名？
const FRONTEND_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map(s => s.trim())
app.use(cors({
  origin: FRONTEND_ORIGINS,
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ===== 全局中间件（洋葱外层）=====
app.use(express.json({ limit: '10mb' }))         // 解析 JSON 请求体（限制 10MB，防超大 body）

// 请求日志中间件 —— 用洋葱模型"回程"计时
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    // res 'finish' 事件触发 = 响应已发完，此刻走到"回程"最外层
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`)
  })
  next()
})

// ===== 路由 =====
app.get('/api/health', (req, res) => {
  res.json({ code: 0, msg: 'ok', data: { time: Date.now() } })
})

// 鉴权分级：登录接口开放；其余接口全部需要 JWT
app.use('/api/auth', authRouter) // 登录（唯一开放接口）
app.use('/api/chat', authMiddleware, rateLimiter, chatRouter) // AI 对话代理（先鉴权再限流）
app.use('/api/conversations', authMiddleware, conversationRouter) // 会话持久化

// ===== 404 兜底 =====
app.use((req, res) => {
  res.status(404).json({ code: 404, msg: `接口不存在: ${req.method} ${req.originalUrl}` })
})

// ===== 统一错误处理（必须放最后一个中间件）=====
// Express 5 会自动把 async 路由里抛出的异常送到这里，无需手动 try/catch
app.use(errorHandler)

export default app
