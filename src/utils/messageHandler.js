export const messageHandler = {
    formatMessage(role, content) {
        // 检查是否是VLM格式的消息（包含图片）
        let hasImage = false
        let displayContent = content
        
        // 如果content是对象（VLM格式）
        if (typeof content === 'object' && content.content) {
            // 检查是否包含图片
            hasImage = content.content.some(item => item.type === 'image_url')
            
            // 提取文本内容用于显示
            const textItems = content.content.filter(item => item.type === 'text')
            displayContent = textItems.map(item => item.text).join('\n')
            
            // 为了在界面显示图片，我们需要重构显示逻辑
            const imageItems = content.content.filter(item => item.type === 'image_url')
            if (imageItems.length > 0) {
                displayContent = {
                    text: displayContent,
                    images: imageItems.map(item => item.image_url.url)
                }
            }
        } else if (typeof content === 'string') {
            // 检查传统的markdown图片格式
            hasImage = content.includes('![') && content.includes('](data:image/')
            displayContent = content
        }
        
        return {
            id: Date.now(),
            role,
            content: displayContent,
            hasImage,
            loading: false,
        };
    },

    /**
     * 处理流式响应
     * @param {Response} response - 响应对象
     * @param {Object} options - 处理选项，这里传入处理消息和token使用量的回调函数。（使用对象提高可读性和可维护性）
        * @param {Function} options.updateMessage - 更新消息内容的回调
        * @param {Function} options.updateTokenCount - 更新token使用量的回调
     */
    async processStreamResponse(response, { updateMessage, updateTokenCount }) {
        try {
            let fullResponse = '';// 用于拼接完整的响应内容
            const reader = response.body.getReader();//获取流式响应的读取器，支持逐块读取数据（而非等待整个响应完成）。
            const decoder = new TextDecoder();//将二进制数据（Uint8Array）解码为 UTF-8 字符串，因为网络传输的流式数据是二进制格式。
            // 1.读取流数据
            while (true) {
                const { done, value } = await reader.read();//异步读取流中的下一个数据块，返回一个包含 done（是否读取完毕）和 value（当前数据块，二进制格式）的对象。
                if (done) {
                    console.log('流式响应完成');
                    break;
                }
                //2.解码数据块
                const chunk = decoder.decode(value);  //这里每一个chunk是一个可能包含多个数组，将二进制数据解码为字符串，value 是二进制数据（Uint8Array），通过 decoder.decode() 转换为可读的字符串
                //3.处理解码后的数据，先拆分为行（数组），再转换为json字符串，再转换为js对象，提取出对象中content内容，更新message、更新token使用量
                
                // 3.1 拆分为行
                const lines = chunk.split('\n').filter(line => line.trim() !== '');
                for (const line of lines) {
                    if (line.includes('data: ')) {
                // 3.2 转换为json字符串
                        const jsonStr = line.replace('data: ', '');// 过滤出有效数据行（符合 SSE 格式）
                        // 检查是否结束
                        if (jsonStr === '[DONE]') {
                            console.log('流式响应完成，读取完毕');
                            continue;
                        }
                // 3.3 转换为js对象
                        try {
                            const jsData = JSON.parse(jsonStr);// 将 JSON 字符串转为 JavaScript 对象
                            const delta = jsData.choices[0].delta;
                            // 推理模型（如 DeepSeek-V4-Flash）会先输出 reasoning_content（思考过程）
                            // 在答案出现前，显示"正在思考…"占位，避免界面空白等待
                            if (delta.content) {
                //3.4 提取出对象中content内容，更新message
                                fullResponse += delta.content;
                                updateMessage(fullResponse);// 调用回调更新界面显示
                            } else if (delta.reasoning_content && !fullResponse) {
                                updateMessage('正在思考…');
                            }

                            // 3.5更新token使用量
                            if (jsData.usage) {
                                updateTokenCount(jsData.usage);
                            }
                        } catch (e) {
                            console.error('解析JSON失败:', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('流处理错误:', error);
            throw error;
        }
    },
    // SSE 格式兼容：流式响应通常遵循 Server-Sent Events (SSE) 格式，每行以 data: 开头，因此需要用 replace 移除前缀。
    // 增量内容处理：AI 流式响应会分多次返回内容（如 “你”“好”“，”“世”“界”），fullResponse 用于累加这些增量，最终形成完整句子。
    // 实时更新：通过 updateMessage 回调（从外部传入）实时更新界面，实现 “打字机” 效果。
    // Token 统计：部分流式响应会携带 usage 字段（包含已使用的 Token 数量），通过 updateTokenCount 回调更新统计。

    //，用于处理 AI 模型返回的同步响应（即非流式响应，一次性返回完整结果）。
    async processSyncResponse(response, onUpdate) {
        try {
            //首先检查响应对象的有效性：必须存在 response 本身，且包含 choices 字段（AI 模型的生成结果通常放在 choices 数组中）。
            if (!response || !response.choices) {
                throw new Error('无效的响应格式');
            }

            const content = response.choices[0]?.message?.content || '';
            onUpdate(content);

            // 处理token使用量
            // 从响应中提取 usage 字段（包含 Token 消耗统计，如 prompt_tokens、completion_tokens 等），若不存在则返回 null。
            // 返回一个对象，包含两个关键信息：
            //  content：模型生成的完整文本内容。
            //  usage：Token 使用量统计（供上层逻辑更新 Token 计数）。
            return {
                content,
                usage: response.usage || null
            };
        } catch (error) {
            console.error('同步响应处理错误:', error);
            throw error;
        }
    }
}; 