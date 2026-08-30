import axios from 'axios';

// 后端Node.js服务地址（和app.js里的PORT一致，默认3000）
const baseURL = 'http://localhost:3000';

// 发送聊天消息（调后端/api/chat接口）
export const sendChatMsg = async (question) => {
  try {
    const res = await axios.post(`${baseURL}/api/chat`, { question });
    return res.data;
  } catch (error) {
    console.error('发送消息失败：', error);
    return { code: 0, msg: '请求失败，请检查后端服务是否启动' };
  }
};

// 获取聊天历史（调后端/api/chat/history接口）
export const getChatHistory = async () => {
  try {
    const res = await axios.get(`${baseURL}/api/chat/history`);
    return res.data;
  } catch (error) {
    console.error('获取历史失败：', error);
    return { code: 0, msg: '获取历史记录失败' };
  }
};