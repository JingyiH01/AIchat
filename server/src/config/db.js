// 数据库连接池配置
// 面试考点：为什么用连接池而不是每次 new Connection？
import mysql from 'mysql2/promise'

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ai_chat',
  waitForConnections: true,   // 连接池满时排队等待，而不是直接报错
  connectionLimit: 10,        // 最大连接数
  queueLimit: 0,              // 排队上限，0 = 无限制
})

// 测试数据库连接是否可用（启动时调用）
export async function testConnection() {
  const conn = await pool.getConnection() // 从池里拿一个连接
  try {
    await conn.ping() // 探测连接是否存活
    console.log('✅ MySQL 连接成功')
  } finally {
    conn.release() // 用完必须释放回池，否则会泄漏连接
  }
}
