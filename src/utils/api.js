import { useSettingsStore } from '../stores/settings'

const API_BASE_URL = 'https://api.siliconflow.cn/v1'

const createHeaders = () => {
    const settingsStore = useSettingsStore()
    return {
        'Content-Type': 'application/json', // 声明请求体为 JSON 格式
        'Authorization': `Bearer ${settingsStore.apiKey}` //'Authorization': Bearer ${settingsStore.apiKey}`` 表示设置请求的授权头，Bearer是一种常见的认证方案，
                                                        // 后面跟着从settingsStore中获取的apiKey，这通常用于向服务器证明请求方的身份，apiKey可能是一个用于认证和授权的密钥。
    }
}

export const chatApi = {
    async sendMessage(messages, stream = false) {
        const settingsStore = useSettingsStore()
        
        const payload = {
            model: settingsStore.model,
            messages,// 对话历史消息数组（包含角色和内容）
            temperature: settingsStore.temperature,
            max_tokens: settingsStore.maxTokens,
            stream:settingsStore.streamResponse,// 是否启用流式响应（打字机效果）
            top_p: settingsStore.topP,
            top_k: settingsStore.topK,
        }

        // 移除不必要的参数，避免API错误
        // frequency_penalty, n, response_format, tools 这些参数可能不是所有模型都支持

        // const response = await fetch(${API_BASE_URL}/chat/completions, {... })：
        // fetch是 JavaScript 用于发起网络请求的 API。这里使用await关键字，意味着该操作是异步的，
        //  会等待请求完成后再继续执行后续代码。API_BASE_URL应该是一个预先定义的基础 URL，与/chat/completions拼接起来，
        //  形成完整的请求地址，表明请求的目标是获取聊天完成相关的内容。
        // method: 'POST'：指定请求的方法为 POST，通常用于向服务器提交数据。
        // headers: {... }：设置请求头。
        // ...createHeaders()：这里使用了展开运算符，将createHeaders()函数返回的对象合并到请求头中，createHeaders()函数可能用于创
        //  建一些通用的请求头。
        // ...(stream && { 'Accept': 'text/event-stream' })：这部分根据stream变量的值来决定是否
        //  添加Accept: text/event-stream这个请求头。如果stream为真值，会将这个表明接受服务器推送事件流数据格式的请求头添加到请求头中。
        // body: JSON.stringify(payload)：将payload对象转换为 JSON 字符串作为请求体发送。payload应该是一个包含了此次请求所需数据的
        //  对象，比如聊天的相关参数等。
        const response = await fetch(`${API_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                ...createHeaders(),
                ...(stream && { 'Accept': 'text/event-stream' })
            },
            body: JSON.stringify(payload)
        })

        // if (!response.ok)：检查 HTTP 响应的状态码是否表示成功（response.ok在状态码为 200 - 299 时为true，否则为false），
        //  如果响应不成功则进入if块。
        // const errorData = await response.json().catch(() => null)：尝试将响应内容解析为 JSON 格式数据，如果解析失败
        //  （例如响应内容不是有效的 JSON），则捕获错误并将errorData设为null。
        // throw new Error(errorData?.error?.message || HTTP error! status: ${response.status})：如果errorData存
        //  在且包含error对象，且error对象有message属性，则抛出带有该message的错误；否则，抛出包含 HTTP 状态码的错误信息，告知
        //  发生了 HTTP 错误及具体状态码。

        if (!response.ok) {
            // 定义一个常量errorData，它尝试等待response.json()操作的结果，response.json()的作用是将响应数据解析为 JSON 格式。
            //  如果在解析过程中发生错误，catch块会捕获该错误，此时errorData的值会被设为null。例如，假设response是一个从服务器获
            //  取到的响应，正常情况下response.json()会将响应数据解析为 JSON 对象并赋值给errorData，若响应数据格式并非有效的JSON，
            //  就会进入catch块，errorData变为null 。
            const errorData = await response.json().catch(() => null)
            throw new Error(errorData?.error?.message || `HTTP error! status: ${response.status}`)
        }

        if (stream) {
            return response
        }

        return await response.json()
    },

    async sendAsyncMessage(messages) {
        const settingsStore = useSettingsStore()
        
        const payload = {
            model: settingsStore.model,
            messages,
            temperature: settingsStore.temperature,
            max_tokens: settingsStore.maxTokens
        }

        const response = await fetch(`${API_BASE_URL}/async/chat/completions`, {
            method: 'POST',
            headers: createHeaders(),
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        return await response.json()
    },

    async getAsyncResult(taskId) {
        const response = await fetch(`${API_BASE_URL}/async-result/${taskId}`, {
            method: 'GET',
            headers: createHeaders()
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        return await response.json()
    }
} 