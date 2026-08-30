// 应用实例：配置中间件 + 路由
import express from 'express'
import cors from 'cors'
import chatRouter from './routes/chat.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

// ===== 全局中间件（洋葱外层）=====
app.use(cors())                                  // 允许前端跨域访问
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

app.use('/api/chat', chatRouter) // AI 对话代理

// ===== 404 兜底 =====
app.use((req, res) => {
  res.status(404).json({ code: 404, msg: `接口不存在: ${req.method} ${req.originalUrl}` })
})

// ===== 统一错误处理（必须放最后一个中间件）=====
// Express 5 会自动把 async 路由里抛出的异常送到这里，无需手动 try/catch
app.use(errorHandler)

export default app
