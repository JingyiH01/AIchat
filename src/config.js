// 前端全局配置
// API 地址：本地默认 localhost:3000；部署时在构建环境设置 VITE_API_BASE_URL 覆盖
// 面试考点：环境变量区分开发/生产环境
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
