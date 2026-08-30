// 会话 RESTful 路由：提供会话和消息的增删查接口
import { Router } from 'express'
import * as convService from '../services/conversationService.js'

const router = Router()

// GET /api/conversations  会话列表
router.get('/', async (req, res) => {
  const list = await convService.listConversations()
  res.json({ code: 0, data: list })
})

// POST /api/conversations  创建会话（带第一条消息）
router.post('/', async (req, res) => {
  const { title = '新对话', firstMessage } = req.body
  if (!firstMessage || !firstMessage.role || !firstMessage.content) {
    return res.status(400).json({ code: 400, msg: 'firstMessage 格式错误' })
  }
  const id = await convService.createConversation(title, firstMessage)
  res.json({ code: 0, data: { id } })
})

// GET /api/conversations/:id  会话详情（含消息列表）
router.get('/:id', async (req, res) => {
  const detail = await convService.getConversationDetail(req.params.id)
  if (!detail) {
    return res.status(404).json({ code: 404, msg: '会话不存在' })
  }
  res.json({ code: 0, data: detail })
})

// POST /api/conversations/:id/messages  追加消息
router.post('/:id/messages', async (req, res) => {
  const { role, content } = req.body
  if (!role || !content) {
    return res.status(400).json({ code: 400, msg: 'role 和 content 不能为空' })
  }
  const msgId = await convService.addMessage(req.params.id, role, content)
  res.json({ code: 0, data: { id: msgId } })
})

// DELETE /api/conversations/:id  删除会话
router.delete('/:id', async (req, res) => {
  const ok = await convService.deleteConversation(req.params.id)
  if (!ok) {
    return res.status(404).json({ code: 404, msg: '会话不存在' })
  }
  res.json({ code: 0, msg: '已删除' })
})

export default router
