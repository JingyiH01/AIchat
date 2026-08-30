//*聊天应用的核心状态管理模块，负责：
// 1 存储对话消息列表、加载状态、Token消耗统计
// 2 提供修改这些状态的方法（添加消息、更新内容、清空对话等）
// 3 通过持久化配置确保刷新页面后对话历史不丢失
// -
// 在组件中，可以通过const chatStore = useChatStore()获取实例，
// 然后chatStore.addMessage(...)等方法操作状态，或直接访问chatStore.messages读取状态 */



//defineStore，Pinia提供的核心函数，用于定义一个新的状态存储（Store）
//优势：
//    1 跨组件共享。任何组件（如聊天输入框、消息列表、设置面板）都能通过调用Store直接读写数据，无需手动传参。
//    2 状态统一管理。所有状态变更逻辑集中在Store中，避免多个组件随意需改数据导致的混乱。
//    3 适配Vue响应式。Store中的状态会自动融入Vue响应式系统，数据变化时，依赖该数据的组件会自动更新。
import { defineStore } from 'pinia'
//Vue3的响应式API，用于创建响应式变量。
import { ref } from 'vue'

//useChatStore，导出的Store函数，遵循Pinia命名规范（useXxxStore），组件中通过调用该函数获取Store实例
//第一个参数'chat'，Store的唯一标识符，用于在Pinia内部标识该Store，必须唯一
//第二个参数，配置对象，包含state、actions、persist等属性，定义Store的状态和行为。
export const useChatStore = defineStore('chat', {
    //state存储原始数据。state是一个函数，返回Store管理的状态对象，确保每次创建Store时都是全新的状态实例。
    //包含三个状态：
    //  messages：存储聊天消息的数组，每条消息的结构由addMessage方法定义，包含id、timestamp、role、content等字段
    //  isLoading：布尔值，表示是否正在加载数据（如发送消息、等待AI响应时为true）
    //  tokenCount：对象，记录与AI模型交互时的token使用情况，包含total、prompt（用户输入消耗的Token数）、completion（AI回复消耗的Token数）三个字段
    state: () => ({
        messages: [],
        isLoading: false,
        // 当前会话在 MySQL 中的 id（null 表示还没创建过会话）
        conversationId: null,
        tokenCount: {
            total: 0,
            prompt: 0,
            completion: 0
        }
    }),
    //定义修改状态的方法，确保状态变更可追踪，避免直接修改数据
    actions: {
      //功能：向messages数组添加一条新消息
      addMessage(message) {
          this.messages.push({
              id: Date.now(), //用时间戳作为唯一ID，避免重复
              timestamp: new Date().toISOString(), //消息创建时间（ISO格式），记录时间
              ...message //合并传入的消息内容，（如role、content等）
          })
      },

      //功能：更新最新一条消息的内容（主要用于AI流式响应的场景）
      //场景：当AI以流的形式返回内容时（如逐字生成回复），可以多次调用该方法更新最后一条消息（AI的回复），实现“打字机”的效果
      //响应式联动：由于Pinia的state是响应式的，lastMessage.content变化后，使用该状态的组件（如ChatMessage.vue）会自动重新渲染，界面上就能看到消息内容“逐步变长”
      updateLastMessage(content) {
          if (this.messages.length > 0) {
              const lastMessage = this.messages[this.messages.length - 1] //获取最后一条消息（通常是AI刚创建的“空占位消息”）
              lastMessage.content = content //将content（AI实时返回的部分回复）赋值给最后一条消息的content字段
          }
      },

      //功能：累加Token使用量
      //参数usage，是API返回的Token用量对象（包含prompt_tokens、completion_tokens、total_tokens字段）
      //调用时机：通常在每次与AI模型交互后调用，更新tokenCount状态，方便统计和展示给用户
      updateTokenCount(usage) {
          this.tokenCount.prompt += usage.prompt_tokens
          this.tokenCount.completion += usage.completion_tokens
          this.tokenCount.total += usage.total_tokens
      },

      //设置当前会话的 MySQL id
      setConversationId(id) {
          this.conversationId = id
      },

      //用数据库里的消息整体替换当前消息列表（刷新页面时恢复历史）
      restoreMessages(messages) {
          this.messages = messages
      },

      //功能：清空所有对话消息（如用户点击“清空对话”按钮时调用）
      clearMessages() {
          this.messages = []
      }
    },

    //作用：通过Pinia的持久化插件（如pinia-plugin-persistedstate），将Store状态保存到本地存储，避免页面刷新后数据丢失。
    
    persist: {
        enabled: true, //启用持久化
        //持久化策略数组
        strategies: [
            {
                key: 'ai-chat-history', //存储在本地的键名（localStorage中会以该键保存数据）
                storage: localStorage, //指定存储方式为localStorage（也可以使用sessionStorage，但会在会话结束后失效）
            },
        ],
    },
})