module.exports = {
  root: true, // 标记为根配置，不继承父目录规则
  env: {
    browser: true, // 支持浏览器环境全局变量（如 window、document）
    es2021: true,  // 支持 ES2021 语法
    node: true     // 支持 Node 环境全局变量
  },
  extends: [
    "eslint:recommended", // 启用 ESLint 官方推荐规则
    "plugin:vue/vue3-essential", // Vue 3 基础语法规则（如模板语法检查）
    "prettier" // 关闭 ESLint 中与 Prettier 冲突的格式规则（必须放最后）
  ],
  parserOptions: {
    ecmaVersion: "latest", // 支持最新 ES 语法
    sourceType: "module"   // 支持 ES 模块（import/export）
  },
  plugins: ["vue"], // 启用 Vue 插件
  rules: {
    // 自定义规则（0=关闭，1=警告，2=错误）
    "no-console": process.env.NODE_ENV === "production" ? 2 : 1, // 生产环境禁止 console
    "vue/multi-word-component-names": 0, // 允许单字组件名（如你的 ChatInput.vue）
    "no-unused-vars": 1 // 未使用的变量仅警告（避免开发中频繁报错）
  }
};