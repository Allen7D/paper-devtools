# Paper.js DevTools

一个用于调试 Paper.js 应用的 Chrome DevTools 扩展，帮助开发者可视化、检查和编辑 Paper.js 场景树及节点属性。支持多 PaperScope 管理、节点高亮、拾取器、爆炸预览与聚焦模式。
## 主要功能

- 可视化 Paper.js 场景树结构，支持展开/折叠、节点选择与高亮
- 检查和实时编辑节点属性（位置、大小、颜色、变换等，8 种智能编辑器）
- 切换节点可见性
- 多 PaperScope 管理：自动检测页面中所有 Scope，支持切换激活 Scope
- 拾取器模式：点击 Canvas 直接选中节点
- 爆炸预览：拖拽手柄散开 Group 子图元，便于查看层级
- 聚焦模式：孤立显示选中子树，隐藏祖先兄弟

## 技术栈

Vite 7 + React 19 + Ant Design 6 + Zustand 5 + CRXJS (Chrome MV3) + Paper.js 0.12 + TypeScript 5.8

## 快速上手

1. **安装依赖并构建扩展**
   ```bash
   git clone https://github.com/Allen7D/paper-devtools.git
   cd paper-devtools
   pnpm install
   pnpm run build
   ```
2. **加载扩展到 Chrome**
   - 打开 `chrome://extensions/`，开启开发者模式
   - 点击“加载已解压的扩展程序”，选择 `packages/extension/dist` 目录
3. **在你的 Paper.js 应用中暴露 Scope**
   ```js
   // 初始化 Paper.js 后，将 scope 注册到全局
   window.__PAPER_SCOPES__ = window.__PAPER_SCOPES__ || { scopes: new Map(), activeScope: null };
   window.__PAPER_SCOPES__.scopes.set(scopeId, { scope, canvas, id: scopeId });
   ```
   > `window.__PAPER_JS__` 已废弃，统一使用 `window.__PAPER_SCOPES__`。扩展会自动轮询检测该全局对象。
4. **打开 DevTools，切换到“paper.js”标签页进行调试**

## 本地开发版（无需 Chrome 扩展）

`devtool-local` 子项目脱离扩展环境，在同一页面内运行 Paper.js 场景与 Panel UI，便于开发与测试：

```bash
pnpm run dev:local    # 启动本地版
pnpm run dev:example  # 启动示例应用（多 Canvas 绘图工具）
```

## 目录结构

```
paper-devtools/
├── packages/
│   ├── extension/          # Chrome 扩展（核心）
│   │   └── src/
│   │       ├── content/    # Content Script（消息中继）
│   │       ├── devtools/   # DevTools 面板注册
│   │       ├── panel/      # React 面板（UI + Zustand store）
│   │       ├── inject/     # 注入页面上下文的脚本（检测 + 解析 + 覆盖层等）
│   │       ├── shared/     # 跨上下文共享（Bridge 接口 + 常量）
│   │       └── background/ # Service Worker
│   ├── devtool-local/      # 本地运行版（LocalBridge 同页面通信）
│   └── example/            # Paper.js 示例应用
├── docs/                   # 项目文档
└── e2e/                    # Playwright E2E 测试
```

## 开发命令

| 命令 | 说明 |
|------|------|
| `pnpm run dev` | 启动扩展开发服务器（含 HMR） |
| `pnpm run build` | 构建扩展生产版本 |
| `pnpm run dev:example` | 启动示例应用 |
| `pnpm run dev:local` | 启动本地运行版 |
| `pnpm run dev:all` | 并行启动所有子项目 |
| `pnpm run build:all` | 构建所有子项目 |
| `pnpm run test:e2e` | 运行 Playwright E2E 测试 |
| `npx vitest run` | 运行单元测试 |

## 架构简介

扩展采用 Chrome MV3 三层通信模型：

```
DevTools Panel (React) ──Bridge──▶ Content Script ──CustomEvent──▶ Injected Scripts ──直接访问──▶ Paper.js API
```

- **Panel ↔ Content Script**：通过 `Bridge` 接口抽象，扩展模式由 `ExtensionBridge` 封装 `chrome.tabs.sendMessage`
- **Content Script ↔ Injected Script**：通过 `CustomEvent` 通信，`detail` 携带结构化数据，无需序列化
- **Injected → Panel**：通过 `chrome.runtime.sendMessage` 推送 Scope 变化等事件

更多细节见 [docs/PROJECT_KNOWLEDGE.md](docs/PROJECT_KNOWLEDGE.md)。

## 许可证

MIT
