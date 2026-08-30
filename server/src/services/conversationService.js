// 会话数据访问层：所有数据库操作封装在这里
// 面试考点：为什么用参数化查询？—— 防 SQL 注入
import { pool } from '../config/db.js'

// 创建会话 + 插入第一条消息（事务保证一致性）
export async function createConversation(title, firstMessage) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction() // 开启事务：要么都成功，要么都回滚

    const [convResult] = await conn.execute(
      'INSERT INTO conversations (title) VALUES (?)',
      [title],
    )
    const conversationId = convResult.insertId

    await conn.execute(
      'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
      [conversationId, firstMessage.role, firstMessage.content],
    )

    await conn.commit() // 提交事务
    return conversationId
  } catch (err) {
    await conn.rollback() // 出错回滚，不留半条数据
    throw err
  } finally {
    conn.release() // 释放连接回池
  }
}

// 向已有会话追加消息
export async function addMessage(conversationId, role, content) {
  const [result] = await pool.execute(
    'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
    [conversationId, role, content],
  )
  return result.insertId
}

// 会话列表（倒序，最新在前）
export async function listConversations() {
  const [rows] = await pool.execute(
    'SELECT id, title, created_at FROM conversations ORDER BY created_at DESC',
  )
  return rows
}

// 查询某个会话及其所有消息
export async function getConversationDetail(conversationId) {
  const [convRows] = await pool.execute(
    'SELECT id, title, created_at FROM conversations WHERE id = ?',
    [conversationId],
  )
  if (convRows.length === 0) return null

  const [msgRows] = await pool.execute(
    'SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [conversationId],
  )
  return { ...convRows[0], messages: msgRows }
}

// 删除会话（外键级联删除其所有消息）
export async function deleteConversation(conversationId) {
  const [result] = await pool.execute(
    'DELETE FROM conversations WHERE id = ?',
    [conversationId],
  )
  return result.affectedRows > 0
}

// 更新会话标题
export async function updateConversationTitle(conversationId, title) {
  const [result] = await pool.execute(
    'UPDATE conversations SET title = ? WHERE id = ?',
    [title, conversationId],
  )
  return result.affectedRows > 0
}
