// JWT 鉴权中间件：校验请求头里的 Bearer token
// 面试考点：JWT 无状态 —— 验证签名即可，不用查数据库
import jwt from 'jsonwebtoken'

export const authMiddleware = (req, res, next) => {
  // 前端约定把 token 放在 Authorization: Bearer <token> 头里
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ code: 401, msg: '未登录' })
  }

  try {
    // 用服务端密钥验证签名 + 过期时间，通过则把 payload 挂到 req.user
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    next()
  } catch (err) {
    // 签名无效或已过期
    return res.status(401).json({ code: 401, msg: '登录已过期，请重新登录' })
  }
}
