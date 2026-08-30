// createRouter：Vue Router 的核心函数，用于创建路由实例，接收路由配置对象作为参数。
// createWebHistory：创建 HTML5 历史模式（history 模式）的路由，特点是 URL 中不包含 # 符号（与 hash 模式区分），需要后端配合配置以支持刷新页面时的路由匹配。
// 从 Vue Router 导入创建路由实例和历史模式的函数
import { createRouter, createWebHistory } from 'vue-router'
// 导入聊天页面组件（路由要渲染的目标组件）
import ChatView from '../views/ChatView.vue'
import LoginView from '../components/LoginView.vue'

const router = createRouter({
  // history：createWebHistory() 使用 HTML5 历史模式，URL 格式如 https://example.com/，
  // 相比 hash 模式更美观，适合生产环境，但需要后端配置支持（如 Nginx 转发所有请求到 index.html）。
  history: createWebHistory(),
  // routes：路由规则数组
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/',
      name: 'chat',
      component: ChatView,
      meta: { requiresAuth: true }, // 标记：访问此路由需要登录
    },
  ],
})

// 路由守卫：未登录（无 token）访问受保护路由时，重定向到登录页
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('ai-chat-token')
  if (to.meta.requiresAuth && !token) {
    next({ path: '/login' }) // 未登录 → 去登录
  } else if (to.path === '/login' && token) {
    next({ path: '/' }) // 已登录访问登录页 → 直接进聊天
  } else {
    next()
  }
})

export default router
