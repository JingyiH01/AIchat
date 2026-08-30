// 统一错误处理中间件
// 4 个参数缺一不可，Express 靠"参数个数"识别它是错误处理中间件
export const errorHandler = (err, req, res, next) => {
  console.error('💥 错误:', err.message)

  // 业务错误可以带 status 字段；没有的就是服务器内部错误
  const status = err.status || 500
  const msg = status === 500 ? '服务器内部错误' : err.message

  res.status(status).json({ code: status, msg })
}
