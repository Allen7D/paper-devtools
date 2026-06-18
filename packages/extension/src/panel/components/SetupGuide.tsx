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

  const manualCode = `// 在 Paper.js 初始化完成后调用：
window.__PAPER_SCOPE__ = {
  paperScope: paperScope,   // Paper.js PaperScope 实例
  scopeId: canvasId,        // Canvas 元素的 id
};`;

  const multiCanvasCode = `// 多画布场景，手动注册每个 Scope：
const scope1 = new paper.PaperScope();
scope1.setup(canvas1);

const scope2 = new paper.PaperScope();
scope2.setup(canvas2);

// 注册到 DevTools
window.__PAPER_SCOPES__?.register('canvas1', scope1, canvas1);
window.__PAPER_SCOPES__?.register('canvas2', scope2, canvas2);`;

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
        <h2>自动检测</h2>
        <p>
          如果你的项目使用 <code>paper.setup(canvas)</code> 初始化 Paper.js，扩展会自动检测。
          请尝试<strong>刷新页面</strong>，确保扩展在 Paper.js 初始化之前注入。
        </p>
      </div>

      <div className="setup-section">
        <h3>方式一：设置全局变量（推荐）</h3>
        <p>在 Paper.js 初始化完成后，设置 <code>window.__PAPER_SCOPE__</code> 全局变量：</p>
        <CodeBlock code={manualCode} />
      </div>

      <div className="setup-section">
        <h3>方式二：多画布注册</h3>
        <p>如果你的应用包含多个 Canvas，可以使用 <code>window.__PAPER_SCOPES__</code> 注册每个 Scope：</p>
        <CodeBlock code={multiCanvasCode} />
      </div>

      <div className="setup-section">
        <h3>常见问题</h3>
        <ul>
          <li>
            <Text strong>扩展未注入？</Text> 确保在打开 DevTools <em>之后</em> 刷新页面，
            Content Script 需要在页面加载前注入。
          </li>
          <li>
            <Text strong>使用 Paper.js 全局模式？</Text> 如果你通过 <code>&lt;script&gt;</code> 标签
            引入 Paper.js，确保在 <code>paper.setup()</code> 之后设置全局变量。
          </li>
          <li>
            <Text strong>使用 ES Module？</Text> 在 <code>paper.setup(canvas)</code> 之后，
            将 PaperScope 实例赋值给 <code>window.__PAPER_SCOPE__</code>。
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SetupGuide;
