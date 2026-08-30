// 登录路由：固定密码比对 → 签发 JWT
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'

const router = Router()

// 常量时间比较：防时序攻击
// 面试考点：普通 === 比较字符串，前缀一旦匹配就提前返回，攻击者可通过测量
// 响应时间逐字符猜出密码；timingSafeEqual 无论正确与否耗时都相同
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

// POST /api/auth/login  登录，成功返回 JWT
router.post('/login', (req, res) => {
  const { password } = req.body
  if (!password) {
    return res.status(400).json({ code: 400, msg: '请输入密码' })
  }

  if (!safeEqual(password, process.env.APP_PASSWORD)) {
    return res.status(401).json({ code: 401, msg: '密码错误' })
  }

  // 签发 JWT：payload 里放身份信息，7 天过期
  const token = jwt.sign(
    { role: 'admin' },                  // payload（可加用户 ID 等）
    process.env.JWT_SECRET,             // 签名密钥（服务端保密）
    { expiresIn: '7d' },                // 过期时间
  )

  res.json({ code: 0, data: { token, expiresIn: '7d' } })
})

export default router
