/// <reference path="../../extension/global.d.ts" />

import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import paper from 'paper';
import { setBridge } from '@/shared/bridge';
import { LocalBridge } from './localBridge';
import { initScene } from './scene';
import { initInject } from '@/inject/setup';
// 触发 parse.ts 副作用：注册 PAPER_DEVTOOLS_MESSAGE 监听 + 初始化消息路由器
import '@/inject/parse';
import App from '@/panel/App';
import '@/panel/App.less';

// 1. 设置 Paper.js 全局引用（供 inject 轮询发现）
globalThis.__PAPER_SCOPE__ = paper;

// 2. 初始化 Paper.js 场景（创建 canvas + PaperScope + 图元）
//    必须在 initInject 前：scope 先创建，inject 的 discoverScopes 才能发现
initScene();

// 3. 初始化 Inject 逻辑（__PAPER_SCOPES__ 全局接口 + 立即发现 scope + MutationObserver）
initInject();

// 4. 注入 LocalBridge（同页面 CustomEvent 通信，绕过 Content Script 中继）
setBridge(new LocalBridge());

// 5. 渲染 Panel UI（复用 extension 的 App）
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ConfigProvider theme={{ algorithm: theme.compactAlgorithm }}>
    <App />
  </ConfigProvider>
);
