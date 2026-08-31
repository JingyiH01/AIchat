// MarkdownIt：一款高性能的 Markdown 解析器，支持自定义配置和插件扩展。
// hljs（highlight.js）：用于代码块的语法高亮，支持多种编程语言。
// github.css：highlight.js 提供的 GitHub 风格高亮样式，决定代码块的颜色、背景等视觉效果。
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

// 创建 markdown-it 实例
const md = new MarkdownIt({
  // html: true：默认情况下，Markdown 解析器会转义 HTML 标签（如 <div> 会被转为 &lt;div&gt;），开启此选项后允许保留并解析 HTML 标签，适合需要嵌入 HTML 的场景。
  // linkify: true：自动检测文本中的 URL（如 https://example.com）或邮箱（如 a@b.com），并将其转换为 <a href="..."> 链接。
  // typographer: true：启用排版优化，例如将 "" 转换为 “”（弯引号）、... 转换为 …（省略号），提升文本可读性。
  html: true,          // 允许解析 HTML 标签
  // linkify 已关闭：它会把 "xxx.md" 这类文本误识别成链接（把 .md 当域名后缀），
  // 导致点击文件名跳转到不存在的页面。URL 无法自动识别可接受。
  linkify: false,
  typographer: true,   // 启用排版优化（如替换引号为弯引号、处理省略号等）
  highlight: function (str, lang) {
  // str: 代码块的文本内容
  // lang: 代码块声明的语言（如 ```javascript 中的 "javascript"）

  // 若指定了语言且 highlight.js 支持该语言
  if (lang && hljs.getLanguage(lang)) {
    try {
      // 使用 highlight.js 对代码进行高亮处理
      const highlighted = hljs.highlight(str, { 
        language: lang, 
        ignoreIllegals: true  // 忽略非法语法，避免解析报错
      }).value

      // 构建带样式的 HTML：包含语言标识头部 + 高亮后的代码
      return `<pre class="hljs"><div class="code-header">
        <span class="code-lang">${lang}</span>
      </div><code class="${lang}">${highlighted}</code></pre>`
    } catch (__) {}  // 若高亮失败（如语法错误），执行默认处理
  }
    // 若未指定语言或不支持该语言，直接转义文本并包裹基本样式
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  }
})
// 导出渲染函数
export const renderMarkdown = (content) => {
  return md.render(content)
}
