// 令牌桶限流中间件（手写实现，可讲清算法）
// 面试考点：令牌桶 vs 漏桶 vs 固定窗口
const CONFIG = {
  maxTokens: 20,   // 桶容量：允许的最大突发请求数
  refillPerSec: 5, // 补充速率：每秒往桶里放几个令牌（匀速）
}

// 存储每个 IP 的桶状态（内存版，单机够用；多机部署需换 Redis）
const buckets = new Map() // key: ip, value: { tokens, lastRefill }

export const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress
  const now = Date.now()

  let bucket = buckets.get(ip)
  if (!bucket) {
    bucket = { tokens: CONFIG.maxTokens, lastRefill: now }
    buckets.set(ip, bucket)
  }

  // 1. 先按流逝时间补充令牌：补充量 = 流逝毫秒 × 每毫秒速率
  const elapsedMs = now - bucket.lastRefill
  bucket.tokens = Math.min(
    CONFIG.maxTokens, // 不能超过桶容量
    bucket.tokens + elapsedMs * (CONFIG.refillPerSec / 1000)
  )
  bucket.lastRefill = now

  // 2. 取令牌：够就放行并扣掉一个，不够就 429
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    next()
  } else {
    res.status(429).json({ code: 429, msg: '请求过于频繁，请稍后再试' })
  }
}
