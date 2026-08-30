/**
 * 基于Pinia定义的settings状态存储模块，用于管理AI聊天应用的全局配置（如主题、模型参数、API密钥等）
 */




// 引入 Pinia 的 defineStore 方法，用于定义一个新的 store
//defineStore，Pinia用于创建状态存储的核心函数
import { defineStore } from 'pinia'

// 定义一个名为 'settings' 的 store
//useSettingsStore，导出的Store访问函数，遵循Pinia命名规范（useXxxStore），组件中通过调用该函数获取配置状态
//第一个参数'settings',Store的唯一ID，用于Pinia内部标识，确保全局唯一
export const useSettingsStore = defineStore('settings', {
    // 定义 store 的状态
    state: () => ({
        // 主题模式：'light', 'dark', 'system'
        themeMode: 'system',
        // 是否启用深色模式（辅助themeMode判断），默认为 false
        isDarkMode: false,
        // 温度参数，模型生成文本的随机性，值越高越随机，默认值为 0.7
        temperature: 0.7,
        // 模型生成的最大Token数量，控制回复的长度，默认值为 1000
        maxTokens: 1000,
        // 使用的模型名称，默认为 'deepseek-ai/DeepSeek-V4-Flash'（免费可用）
        model: 'deepseek-ai/DeepSeek-V4-Flash',
        // API 密钥，默认为空字符串
        apiKey: '',
        // 是否启用流式响应，默认为 true
        streamResponse: true,
        // Top P 参数，模型采样的累积概率阈值，控制词汇选择范围
        topP: 0.7,
        // Top K 参数，模型每次采样时考虑的候选词数量
        topK: 50,
        // VLM模型处理图片细节控制参数：'low', 'high', 'auto'
        imageDetail: 'high',
    }),

    // 定义 store 的动作
    // actions包含一系列用于修改状态的函数，封装了配置变更的逻辑
    actions: {
        // 检测系统主题
        detectSystemTheme() {
          //检查当前环境是否为浏览器环境（window对象是否存在）
          if (typeof window !== 'undefined') {
              //window.matchMedia，检测当前页面是否匹配某个媒体查询条件。这里的查询条件是(prefers-color-scheme: dark)
              // 该查询用于判断用户的系统或浏览器是否设置为深色模式。
              //.matches，返回一个布尔值，表示当前页面是否匹配该媒体查询条件
              const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
              return isDarkMode //返回检测结果，true表示深色模式，false表示浅色模式
          }
          return false //如果不在浏览器环境中，默认返回false（浅色模式）
        },

        // 应用主题设置到页面
        applyTheme(isDark) {
          //this.isDarkMode是store中定义的响应式状态（state中的isDarkMode），记录当前是否为深色模式
          this.isDarkMode = isDark
          //document.documentElement指向HTML文档的根元素<html>
          //setAttribute，为根元素添加data-theme属性，属性值根据isDark动态设置为'dark'（深色模式）或'light'（浅色模式）
          // 这一步是主题样式切换的关键，原因是项目中通过CSS变量（自定义属性）和data-theme选择器定义了两种主题的样式规则
          // 在variables.scss中，通过:root（默认浅色）和[data-theme="dark"]（深色模式）分别定义了不同的颜色变量
          // 当data-theme属性变化时，浏览器会根据新的属性值应用对应的CSS规则，从而实现主题切换效果
          // 在element-theme.scss中，针对Element Plus组件，通过[data-theme="dark"]选择器单独定义了深色模式下的组件样式，确保组件在深色主题下也能正确显示
          document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
        },

        // 设置主题模式
        // 方法功能：setThemeMode(mode)方法的主要作用是：根据传入的主题模式参数mode，更新store中的主题模式状态，
        // 并根据模式自动计算是否启用深色模式，最终调用applyTheme方法应用主题样式到页面
        setThemeMode(mode) {
          // 更新store中的主题模式状态
          this.themeMode = mode
          //根据主题模式计算是否启用深色模式，并应用主题
          if (mode === 'system') {
              //若模式为“跟随系统”，则检测系统主题并应用
              const isDark = this.detectSystemTheme()
              this.applyTheme(isDark)
          } else {
              //若模式为'light'或'dark'，直接根据模式判断是否为深色
              const isDark = mode === 'dark'
              this.applyTheme(isDark)
          }
        },

        // 切换深色模式（保留原有方法以兼容现有代码），兼容手动模式和系统模式的场景
        // 核心作用：在当前主题模式下切换深色和浅色
        toggleDarkMode() {
            if (this.themeMode === 'system') {
                // 如果当前是系统模式，切换到手动模式并反转深色状态
                this.setThemeMode(this.isDarkMode ? 'light' : 'dark')
            } else {
                // 若当前是手动模式（light/dark），直接反转深色状态
                this.setThemeMode(this.isDarkMode ? 'light' : 'dark')
            }
        },

        // 初始化应用主题并监听系统主题变化，确保主题状态在应用加载时正确生效，并在系统主题改变时自动响应（仅在跟随系统模式下）
        //方法功能：
        // initTheme()是主题系统的初始化入口，负责两件核心的事情：
        // 1.应用初始主题（根据当前themeMode状态，决定使用系统主题还是手动设置的主题）
        // 2.监听操作系统主题变化，在跟随系统模式下自动同步主题
        initTheme() {
            // 应用当前主题
            if (this.themeMode === 'system') {
              //若主题模式为跟随系统，检测系统主题并应用
                const isDark = this.detectSystemTheme()
                this.applyTheme(isDark)
            } else {
              //若为手动模式（light/dark），直接根据themeMode应用主题
                const isDark = this.themeMode === 'dark'
                this.applyTheme(isDark)
            }

            // 监听系统主题变化（仅在浏览器环境中）
            if (typeof window !== 'undefined') {
              //创建媒体查询对象，监听系统深色模式偏好
              //使用window.matchMedia('(prefers-color-scheme: dark)')创建媒体查询对象，用于监听系统主题偏好的变化
              const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
              //定义系统主题变化时的处理函数
              const handleChange = (e) => {
                //仅在跟随系统模式下，才同步系统主题变化
                if (this.themeMode === 'system') {
                    this.applyTheme(e.matches) //e.matches为true表示深色模式，false表示浅色
                }
              }
                
                // 使用新的 addEventListener 方法
                //当系统主题变化时（如用户手动切换系统深色/浅色模式），触发handleChange函数
                if (mediaQuery.addEventListener) {
                  mediaQuery.addEventListener('change', handleChange)
                } else {
                    // 兼容旧版浏览器
                    mediaQuery.addListener(handleChange)
                }
            }
        },

        // 更新设置。方法功能：将传入的设置对象批量合并到当前store的状态中，实现多参数的一次性更新，避免逐个设置属性的繁琐操作。
        // settings：传入的是一个包含部分或全部设置项的对象（例如：{ themeMode: 'dark', temperature: 0.8 }），
        //           其属性与store中state定义的设置项对应。
        updateSettings(settings) {
          // 使用 Object.assign 方法将传入的设置对象合并到当前 store 的状态中
          // Pinia中，this.$state指向当前store的状态对象，包含所有在state中定义的属性
          // Object.assign(target, source)，用于将source对象的可枚举属性复制到target对象中，并返回target
          Object.assign(this.$state, settings)
        },
    },

    // 配置持久化选项。作用是将store中的状态数据持久化存储到浏览器的localStorage中，避免页面刷新或关闭后数据丢失
    //persist配置是Pinia结合pinia-plugin-persistedstate插件实现的状态持久化方案，主要解决：
    // 页面刷新后，store中的状态（如用户设置、聊天记录）不会丢失
    // 关闭浏览器后重新打开，仍能恢复之前的状态配置
    persist: {
      // 启用持久化功能。当启用后，Pinia会在状态更新时自动将数据同步到指定的存储介质（如localStorage），并在应用初始化时从
      // 存储介质中恢复数据。
      enabled: true,
      // strategies数组。用于配置持久化的具体策略（可配置多个策略，此处仅配置了一个）。每个策略对象定义了如何存储当前store的状态。
      strategies: [
        {
          // 存储键名
          // 在浏览器的localStorage中，会以该键名存储当前store的状态数据（值为JSON字符串）
          key: 'ai-chat-settings',
          // 存储方式，这里使用的是 localStorage。
          // 还有：sessionStorage，会话级存储，关闭标签页后数据丢失；或自定义存储对象
          storage: localStorage,
        },
      ],
    },
})

// 导出模型选项供其他组件使用
// modelOptions是一个包含多个模型配置对象的数组，主要作用是：
//  为前端界面（如设置面板的模型选择下拉框）提供可展示的模型列表
//  区分普通文本模型和支持图像识别的VLM模型
//  存储模型的显示名称（lable）和实际调用API时使用的标识（value）
export const modelOptions = [
    // 文本模型（免费）
    { label: 'DeepSeek-V4-Flash (免费)', value: 'deepseek-ai/DeepSeek-V4-Flash' },
    { label: 'Qwen2.5-7B (免费)', value: 'Qwen/Qwen2.5-7B-Instruct' },
    // 文本模型（需充值）
    { label: 'DeepSeek-V3.2', value: 'deepseek-ai/DeepSeek-V3.2' },
    { label: 'Qwen3.5-35B-A3B', value: 'Qwen/Qwen3.5-35B-A3B' },
    // VLM 图片模型
    { label: 'Qwen3-VL-32B (支持图像)', value: 'Qwen/Qwen3-VL-32B-Instruct', isVLM: true },
    { label: 'GLM-4.5V (支持图像)', value: 'zai-org/GLM-4.5V', isVLM: true },
    { label: 'Qwen3-Omni (图像+音频)', value: 'Qwen/Qwen3-Omni-30B-A3B-Instruct', isVLM: true },
]