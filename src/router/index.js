// createRouter：Vue Router 的核心函数，用于创建路由实例，接收路由配置对象作为参数。
// createWebHistory：创建 HTML5 历史模式（history 模式）的路由，特点是 URL 中不包含 # 符号（与 hash 模式区分），需要后端配合配置以支持刷新页面时的路由匹配。
// ChatView：导入项目的主要页面组件（聊天界面），作为路由的目标渲染组件。
// 从 Vue Router 导入创建路由实例和历史模式的函数
import { createRouter, createWebHistory } from 'vue-router'
// 导入聊天页面组件（路由要渲染的目标组件）
import ChatView from '../views/ChatView.vue'

const router = createRouter({
  //history：设置为 createWebHistory() 表示使用 HTML5 历史模式，URL 格式如 https://example.com/，
  // 相比 hash 模式（https://example.com/#/）更美观，适合生产环境，但需要后端配置支持（如 Nginx 转发
  // 所有请求到 index.html）。
  history: createWebHistory(), // 配置路由历史模式
  // routes：路由规则数组，每个对象定义一条路由：
  // path: '/'：匹配网站的根路径（用户访问 https://example.com 时触发）。
  // name: 'chat'：路由的唯一标识，可在 $router.push({ name: 'chat' }) 等编程式导航中使用，比直接写路径更易维护。
  // component: ChatView：指定该路由对应的页面组件，当路径匹配时，ChatView 会被渲染到 App.vue 中的 <router-view> 位置。
  routes: [ // 定义路由规则数组
    {
      path: '/', // 路由路径（根路径）
      name: 'chat', // 路由名称（可选，用于编程式导航）
      component: ChatView // 该路径对应的渲染组件
    }
  ]
})

export default router
