<!--
 <el-config-provider>：Element Plus 提供的全局配置组件，用于统一设置组件的全局属性（如主题、语言等）。
 虽然这里未显式传入参数，但为后续扩展全局配置（如国际化、主题变量）预留了入口。
 <router-view>：Vue Router 的路由出口组件，用于渲染当前路由匹配的页面组件（如 ChatView.vue）。
  通过 v-slot="{ Component }" 获取当前路由对应的组件实例。
  包裹在 <transition> 中，实现路由切换时的过渡动画。
  Vue 的过渡组件，为路由切换添加动画效果：
  name="fade"：指定过渡类名前缀（对应 main.scss 中定义的 fade-enter-active 等动画样式）。
  mode="out-in"：先执行当前组件的退出动画，再执行新组件的进入动画，避免切换时的重叠。

-->
<template>
  <el-config-provider >
    <div class="app-container">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </el-config-provider>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useSettingsStore } from './stores/settings'

const settingsStore = useSettingsStore()

// 监听主题变化
watch(() => [settingsStore.isDarkMode, settingsStore.themeMode], () => {
  if (settingsStore.themeMode === 'system') {
    const isDark = settingsStore.detectSystemTheme()
    settingsStore.applyTheme(isDark)
  } else {
    const isDark = settingsStore.themeMode === 'dark'
    settingsStore.applyTheme(isDark)
  }
}, { immediate: true })//{ immediate: true }：组件初始化时立即执行一次监听回调，确保主题正确生效。

// 在组件挂载时初始化主题
// 组件挂载后调用 settingsStore.initTheme()，完成：
// 应用初始主题（根据保存的设置或系统主题）。
// 注册系统主题变化的监听器（当系统主题切换时，自动同步应用主题）。
onMounted(() => {
  settingsStore.initTheme()
})
</script>
<style lang="scss">
.app-container {
  min-height: 100vh; //确保根容器至少占满整个视口高度，避免内容不足时页面高度过短。
  display: flex;
  flex-direction: column;
}


</style>

