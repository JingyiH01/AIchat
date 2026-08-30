# AI Chat - 现代化多模态 AI 全栈对话平台

> 基于 **Vue 3 + Node.js (Express) + MySQL** 的 AI 全栈对话应用，支持流式交互、多模态 VLM 图片识别、JWT 鉴权与会话持久化。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/Vue.js-3.x-4FC08D?logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)
![Node](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express)
![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql)
![ElementPlus](https://img.shields.io/badge/Element%20Plus-2.x-409EFF?logo=element-plus)

## 📖 项目简介

AI Chat 是一款对标主流智能助手（ChatGPT/Claude）的**前后端分离 AI 全栈应用**：

- **前端**：Vue 3 + Vite + Pinia，通过 **Fetch API + SSE** 实现低延迟流式交互，深度适配 **VLM 多模态**（图文混合对话）与原子化主题架构。
- **后端（BFF 层）**：Node.js + Express，统一持有第三方 API Key（前端不接触密钥），代理 AI 请求并**透传 SSE 流式响应**；手写**令牌桶限流** + **JWT 鉴权**。
- **持久化**：对话历史存入 **MySQL**（连接池 + 事务 + 参数化查询），刷新页面不丢记录。

## ✨ 核心特性 (Core Features)

### 🚀 全链路流式交互引擎
- **底层封装**：基于 `Fetch API` 与 `ReadableStream` 封装了通用的 SSE 处理模块。
- **增量解析**：利用 `TextDecoder` 实现二进制分块解码，并设计了**非完整 JSON 包的容错合并策略**，在弱网环境下也能保证“打字机”效果的流畅性。
- **状态联动**：流式数据实时同步至 `Pinia` 状态管理库，驱动 UI 精细化更新（Loading -> Streaming -> Done）。

### 🎨 高性能动态主题架构
- **原子化设计**：摒弃笨重的多套 CSS 文件方案，采用 **CSS Variables (运行时)** + **SCSS (编译时)** 结合的架构。
- **系统级联动**：集成 `window.matchMedia` API 监听系统颜色偏好，实现应用主题与操作系统的自动同步。
- **无闪烁切换**：通过操作 DOM 根节点属性，实现 0ms 延迟的主题切换体验。

### 🖼️ VLM 多模态深度适配
- **标准规范**：构建符合 OpenAI 接口规范的多模态消息体 (Text + Image URL)。
- **工程化处理**：
  - 前端实施 **10MB 级**图片预处理拦截与格式过滤。
  - 引入 **`URL.revokeObjectURL`** 机制严格管理图片预览资源的生命周期，有效防止浏览器内存泄漏。

### 📝 极致的富文本渲染
- **安全防护**：深度定制 `Markdown-it` 渲染管线，实施严格的 HTML 转义策略以防御 **XSS 攻击**。
- **视觉优化**：利用 **CSS 变量穿透** 技术，彻底解决了第三方库 (`Highlight.js`) 在深色模式下的样式冲突问题。
- **交互增强**：集成代码块语言自动检测、行号渲染及一键复制功能。

## ⚙️ 后端架构（BFF 层）

### 🔐 密钥安全与 BFF 代理
- 第三方 API Key **只存在于服务端环境变量**，前端全程不接触，消除浏览器 XSS 窃取密钥的攻击面。
- 前端请求统一走后端 `/api/chat` 代理，支持**模型白名单**校验，防止改请求体调用非授权付费模型。

### ⚡ SSE 流式透传
- 后端将上游（SiliconFlow）的 SSE 字节流**原样透传**给前端，前端解析方式与直连完全一致。
- 使用 `Readable.fromWeb` 将 Web 流转换为 Node 流，`pipeline` 自动处理**背压**与资源清理，客户端断连时销毁上游流防泄漏。

### 🔑 JWT 鉴权 + 令牌桶限流
- 固定密码登录签发 **JWT**（7 天过期，`timingSafeEqual` 常量时间比对防时序攻击），路由守卫 + 后端中间件双重保护。
- 手写**令牌桶限流**（每秒 5 令牌、突发 20），防止第三方滥用消耗 Key 额度。

### 🗄️ 会话持久化（MySQL）
- 会话/消息一对多表结构，**组合索引** `(conversation_id, created_at)` 优化"按会话查消息"查询。
- **连接池**复用连接，**事务**保证会话创建一致性，**参数化查询**防 SQL 注入，外键**级联删除**保证数据不残留。

## 🛠️ 技术栈

- **前端框架**: Vue 3 (Composition API) + Vite 5
- **状态管理**: Pinia + pinia-plugin-persistedstate
- **UI 组件**: Element Plus
- **样式**: SCSS + CSS Variables
- **后端框架**: Node.js + Express 5
- **数据库**: MySQL（mysql2 连接池）
- **鉴权**: JWT（jsonwebtoken）
- **工具库**: Markdown-it, Highlight.js, @vueuse/core

## 📦 快速开始

### 环境要求
- Node.js >= 18（推荐 22）
- MySQL >= 8
- 一个 SiliconFlow API Key（https://cloud.siliconflow.cn）

### 1. 准备数据库

```bash
# 启动 MySQL（macOS 用 Homebrew 安装后）
brew services start mysql
# 创建数据库并建表
mysql -u root -e "CREATE DATABASE IF NOT EXISTS ai_chat CHARACTER SET utf8mb4;"
mysql -u root ai_chat < server/src/db/schema.sql
```

### 2. 配置后端环境变量

```bash
cp server/.env.example server/.env
# 编辑 server/.env，填入：
#   SILICONFLOW_API_KEY=你的 Key
#   APP_PASSWORD=你的登录密码
#   JWT_SECRET=随机字符串
#   DB_PASSWORD=你的 MySQL 密码（root 无密码则留空）
```

### 3. 启动后端

```bash
cd server
npm install
npm run dev        # 后端运行在 http://localhost:3000
```

### 4. 启动前端

```bash
cd ..              # 回到项目根目录
npm install
npm run dev        # 前端运行在 http://localhost:5173
```

### 5. 使用

浏览器打开 http://localhost:5173 ，输入 `server/.env` 里配置的 `APP_PASSWORD` 登录，即可开始对话。

> 后端接口鉴权说明：`/api/auth/login` 为唯一开放接口，其余接口需携带 JWT（`Authorization: Bearer <token>`）。

## 📁 项目结构

```
├── src/                    # 前端 Vue3 应用
│   ├── views/ChatView.vue  # 聊天主界面
│   ├── components/         # 登录页/消息/输入/设置组件
│   ├── stores/             # Pinia 状态管理
│   ├── api/chat.js         # 后端会话接口客户端
│   └── utils/api.js        # AI 请求客户端（走后端 BFF）
└── server/                 # 后端 Node.js BFF 服务
    ├── src/
    │   ├── app.js          # Express 应用 + 中间件
    │   ├── routes/         # chat / conversation / auth 路由
    │   ├── services/       # AI 代理 / 会话数据访问
    │   ├── middleware/     # 鉴权 / 限流 / 错误处理
    │   ├── config/db.js    # MySQL 连接池
    │   └── db/schema.sql   # 建表语句
    └── .env                # 环境变量（不入库）