-- AI Chat 数据库表结构
-- 设计说明：会话(conversations) 与 消息(messages) 是一对多关系，用外键关联

-- 会话表：一次完整的对话会话
CREATE TABLE IF NOT EXISTS conversations (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL DEFAULT '新对话',   -- 会话标题（取首条用户消息前 N 字）
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 消息表：会话中的单条消息（用户/助手）
CREATE TABLE IF NOT EXISTS messages (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,             -- 属于哪个会话
  role            ENUM('user','assistant') NOT NULL,     -- 消息角色
  content         TEXT NOT NULL,                         -- 消息内容（TEXT 支持长文本）
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- 外键：消息必须属于某个会话，会话删除时级联删除其所有消息
  CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id)
    REFERENCES conversations(id) ON DELETE CASCADE,
  -- 组合索引：查询某个会话的消息时，按 conversation_id 过滤 + created_at 排序
  -- 面试考点：为什么是 (conversation_id, created_at) 而不是单列索引？
  -- 答：这是"最左前缀"覆盖查询 —— WHERE conversation_id=? ORDER BY created_at
  INDEX idx_conv_time (conversation_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
