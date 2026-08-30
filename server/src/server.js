// 入口文件：加载环境变量 → 启动 HTTP 服务
import 'dotenv/config'
import app from './app.js'

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`🚀 AI Chat Server 启动: http://localhost:${PORT}`)
})
