// 导入 Vue 核心函数，用于创建应用实例
import { createApp } from 'vue'
// 导入 Pinia 状态管理库的核心函数
import { createPinia } from 'pinia'
// 导入 Pinia 持久化插件（用于状态本地存储）
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
// 导入 Element Plus 组件库
import ElementPlus from 'element-plus'
// 导入 Element Plus 所有图标组件
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
// 导入 Element Plus 基础样式
import 'element-plus/dist/index.css'
// 导入项目全局样式（包含主题变量、自定义样式等）
import './assets/styles/main.scss'
// 导入路由配置
import router from './router'
// 导入根组件 App.vue
import App from './App.vue'

// 导入 highlight.js 的深色代码主题（用于代码语法高亮）
import 'highlight.js/styles/github-dark.css'

// 创建 Vue 应用实例，绑定根组件 App
const app = createApp(App)
// 创建 Pinia 实例
const pinia = createPinia()
// 为 Pinia 安装持久化插件（使状态在刷新后不丢失）
pinia.use(piniaPluginPersistedstate)

// 全局注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 安装 Pinia 状态管理
app.use(pinia)
// 安装路由系统
app.use(router)
// 安装 Element Plus 组件库
app.use(ElementPlus)

// 将应用挂载到 HTML 中的 #app 元素（对应 index.html 中的 <div id="app"></div>）
app.mount('#app')

// Element Plus 主题适配
import { useSettingsStore } from './stores/settings'

// 在应用挂载后初始化主题系统
//$nextTick 的作用：确保在应用挂载完成后（DOM 已渲染）再执行主题初始化，避免因 DOM 未就绪导致的样式设置失败。
///调用 settingsStore.initTheme() 读取本地存储的主题设置（或系统主题），并应用到页面（如设置 data-theme 属性、切换深色 / 浅色样式）。
app.config.globalProperties.$nextTick(() => {
  const settingsStore = useSettingsStore()
  settingsStore.initTheme()
})
