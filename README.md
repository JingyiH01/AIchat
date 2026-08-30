# AI Chat - 现代化多模态 AI 对话平台

> 基于 Vue 3 生态构建的企业级 AI 对话应用，集成了流式响应、多模态交互与原子化主题架构。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/Vue.js-3.x-4FC08D?logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)
![ElementPlus](https://img.shields.io/badge/Element%20Plus-2.x-409EFF?logo=element-plus)

## 📖 项目简介

AI Chat 是一款对标主流智能助手（ChatGPT/Claude）的现代化对话平台。项目不依赖传统的 WebSocket，而是通过 **Fetch API + SSE (Server-Sent Events)** 实现了低延迟的流式交互。架构上采用了 **CSS 变量 + SCSS** 的混合模式，实现了毫秒级无闪烁的深色模式切换。

此外，项目深度适配了 **VLM (Vision Language Model)**，支持图文混合上下文对话，并在前端层面解决了大文件拦截与内存泄漏防护等工程化问题。

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

## 🛠️ 技术栈

- **框架**: Vue 3 (Composition API)
- **构建**: Vite 5
- **状态管理**: Pinia + pinia-plugin-persistedstate
- **UI 组件**: Element Plus
- **样式**: SCSS + CSS Variables
- **工具库**: Markdown-it, Highlight.js, @vueuse/core

## 📦 快速开始

### 环境要求
- Node.js >= 16
- npm >= 7

### 安装依赖

```bash
git clone [https://github.com/wjc7jx/AIchat.git](https://github.com/wjc7jx/AIchat.git)
cd AIchat
npm install