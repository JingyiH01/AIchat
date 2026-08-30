<template>
  <div class="login-container">
    <el-card class="login-card">
      <h2 class="login-title">AI Chat</h2>
      <p class="login-subtitle">请输入访问密码</p>

      <el-form @submit.prevent="handleLogin">
        <el-input
          v-model="password"
          type="password"
          placeholder="请输入密码"
          show-password
          size="large"
          @keyup.enter="handleLogin"
        />
        <el-button
          type="primary"
          size="large"
          class="login-btn"
          :loading="loading"
          @click="handleLogin"
        >
          登录
        </el-button>
      </el-form>

      <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" />
    </el-card>
  </div>
</template>

<script setup>
// 登录页：输入固定密码 → 后端签发 JWT → 存 localStorage → 跳转聊天页
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!password.value) {
    error.value = '请输入密码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await axios.post('http://localhost:3000/api/auth/login', {
      password: password.value,
    })
    // 把 token 存 localStorage，后续所有请求带上
    localStorage.setItem('ai-chat-token', res.data.data.token)
    router.push('/') // 登录成功跳回聊天页
  } catch (e) {
    error.value = e.response?.data?.msg || '登录失败，请检查后端服务是否启动'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-color-secondary);
}
.login-card {
  width: 360px;
  padding: 8px 12px;
}
.login-title {
  text-align: center;
  margin-bottom: 4px;
}
.login-subtitle {
  text-align: center;
  color: var(--text-color-secondary, #909399);
  margin-bottom: 20px;
}
.login-btn {
  width: 100%;
  margin-top: 16px;
}
</style>
