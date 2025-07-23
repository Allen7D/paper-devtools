### [crxjs-project-test/packages/extension] content script 注入检测脚本方式改造（2024-05-21）

- 问题：原 injectDetectionScript 通过 script.textContent 注入内联 JS，因 Chrome 扩展 CSP 限制导致报错，无法执行。
- 解决：将检测 Paper.js 的脚本内容迁移到 public/paper-detection.js，通过 script.src 以外部脚本方式注入，规避 CSP。
- 实现：
  - 新增 public/paper-detection.js，内容为原检测逻辑。
  - injectDetectionScript 改为动态创建 script 元素，src 指向 chrome.runtime.getURL('paper-detection.js')，加载后自动移除。
- 影响：解决了内容安全策略导致的脚本注入失败问题，保证扩展功能正常。 