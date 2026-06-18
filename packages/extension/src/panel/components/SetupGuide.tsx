import React, { useState } from 'react';
import { Typography } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { usePaperStore } from '../store';

import './SetupGuide.less';

const { Text, Paragraph } = Typography;

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="setup-code-block">
      <pre><code>{code}</code></pre>
      <button className="copy-btn" onClick={handleCopy} title="复制">
        {copied ? <CheckOutlined /> : <CopyOutlined />}
      </button>
    </div>
  );
};

const SetupGuide: React.FC = () => {
  const { connectionStatus } = usePaperStore();

  const setupCode = `// 引入 paper 模块后，只需一行：
window.__PAPER_SCOPE__ = paper;`;

  const scriptCode = `<!-- 通过 script 标签引入时 -->
<script src="paper.js"></script>
<script>
  window.__PAPER_SCOPE__ = paper;
  paper.setup(canvas);
</script>`;

  return (
    <div className="setup-guide">
      <h1>Paper.js 未检测到</h1>
      <Paragraph type="secondary">
        当前页面未检测到 Paper.js 应用。如果页面确实使用了 Paper.js，请按照以下指南进行设置。
      </Paragraph>
      <Paragraph type="secondary" style={{ fontSize: 12 }}>
        当前状态：{connectionStatus}
      </Paragraph>

      <div className="setup-tip-box">
        <h2>自动发现</h2>
        <p>
          设置 <code>window.__PAPER_SCOPE__</code> 后，扩展会通过 <code>PaperScope._scopes</code> 自动发现所有画布，
          无需手动注册每个 Scope。请尝试<strong>刷新页面</strong>。
        </p>
      </div>

      <div className="setup-section">
        <h3>ES Module 项目（推荐）</h3>
        <p>在引入 paper 模块时设置全局变量，只需一行代码：</p>
        <CodeBlock code={setupCode} />
      </div>

      <div className="setup-section">
        <h3>Script 标签引入</h3>
        <p>通过 <code>&lt;script&gt;</code> 标签引入 Paper.js 时，在 setup 之前设置：</p>
        <CodeBlock code={scriptCode} />
      </div>

      <div className="setup-section">
        <h3>常见问题</h3>
        <ul>
          <li>
            <Text strong>扩展未注入？</Text> 确保在打开 DevTools <em>之后</em> 刷新页面，
            Content Script 需要在页面加载前注入。
          </li>
          <li>
            <Text strong>多画布无需额外配置？</Text> 扩展通过 <code>PaperScope._scopes</code> 自动发现所有画布，
            新增/删除画布会自动同步。
          </li>
          <li>
            <Text strong>设置时机？</Text> 在 <code>import paper</code> 之后立即设置即可，
            无需等到 <code>paper.setup()</code> 之后。
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SetupGuide;
