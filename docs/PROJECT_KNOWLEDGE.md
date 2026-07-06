# 项目知识库 (PROJECT_KNOWLEDGE)

> 本文档是 paper-devtools 项目的"活文档"，目标是始终反映项目当前的真实状态，作为开发者和 Agent 快速了解项目的入口。
> 与 `.trae/rules/project_rules.md`（行为规则）互补：本文件陈述"项目是什么样"，规则文件约束"该怎么做"。
> 维护方式见文末 [维护约定](#12-维护约定)。

---

## 1. 项目简介

paper-devtools 是一个 Chrome DevTools 扩展，为基于 Paper.js 的 Web 应用提供可视化调试环境：在 DevTools 面板里以场景树浏览 Paper.js 项目结构、查看与编辑节点属性、切换多个 PaperScope、控制节点可见性。

- 仓库形式：pnpm monorepo
- 主要使用场景：开发 Paper.js 应用时，挂载该扩展到 Chrome DevTools 进行实时调试

## 2. 技术栈

| 层 | 技术 |
|----|------|
| 构建 | Vite 7 + CRXJS (Chrome MV3) |
| 前端 | React 19 + Ant Design 6 + Zustand 5 |
| 语言 | TypeScript 5.8 |
| 样式 | Less（`javascriptEnabled: true`，用于 Ant Design 主题编译） |
| 调试目标 | Paper.js 0.12 |
| 测试 | Vitest 3（已配置，暂无测试文件） |

## 3. 仓库结构

```
paper-devtools/
├── packages/
│   ├── extension/          # Chrome 扩展（核心）
│   │   ├── src/
│   │   │   ├── content/    # Content Script
│   │   │   ├── devtools/   # DevTools 面板注册
│   │   │   ├── panel/      # React 面板（UI + store）
│   │   │   ├── inject/     # 注入页面上下文的脚本（检测 + 解析）
│   │   │   ├── shared/     # 跨上下文共享（Bridge 接口 + 常量）
│   │   │   └── background/ # Service Worker（骨架）
│   │   ├── manifest.config.ts
│   │   ├── vite.config.ts
│   │   └── vite.inject.config.ts
│   ├── devtool-local/      # 本地运行版（脱离扩展，同页面跑 Paper.js + Panel UI）
│   └── example/            # Paper.js 示例应用（用于自测）
├── docs/                   # 项目文档
│   └── PROJECT_KNOWLEDGE.md
└── .trae/
    ├── rules/              # Agent 行为规则
    └── specs/              # 功能规格（spec / tasks / checklist）
```

| 子项目 | 路径 | 说明 |
|--------|------|------|
| extension | `packages/extension/` | Chrome 扩展（DevTools Panel + Popup + Content Script） |
| devtool-local | `packages/devtool-local/` | 本地运行版（脱离扩展，LocalBridge 同页面通信，用于开发/测试） |
| example | `packages/example/` | Paper.js 示例应用（多 Canvas 绘图工具） |

## 4. 整体架构

### 4.1 三层通信架构

扩展沿用 Chrome MV3 扩展的经典三层模型，在不同执行环境间传递数据：

```
DevTools Panel (React) ──Bridge──▶ Content Script ──CustomEvent──▶ Injected Scripts ──直接访问──▶ Paper.js API
```

- **Panel → Bridge → Content Script**：Panel Store 通过 `Bridge` 接口（`shared/bridge.ts`）发消息，扩展模式由 `ExtensionBridge` 封装 `chrome.tabs.sendMessage`，本地模式由 `LocalBridge` 同页面直接调用（见设计决策 4）。消息格式 `{ action, ...params }`
- **Content Script → Injected Script**：`CustomEvent('PAPER_DEVTOOLS_MESSAGE')`，携带 `messageId` 用于异步响应匹配
- **Injected Script → Content Script**：`CustomEvent('PAPER_DEVTOOLS_RESPONSE')`，携带相同 `messageId`
- **Injected → Panel 运行时事件**：`chrome.runtime.sendMessage` → `Bridge.onEvent`（Scope 变化、场景树变化、拾取器结果等）

### 4.2 消息协议 (Action 列表)

| Action | 方向 | 用途 |
|--------|------|------|
| `DETECT_PAPER_JS` | Panel → Content | 检测页面是否有 Paper.js |
| `GET_SCENE_TREE` | Panel → Content → Inject | 获取当前激活 Scope 的场景树 |
| `SELECT_NODE` | Panel → Content → Inject | 选中指定节点 |
| `TOGGLE_NODE_VISIBILITY` | Panel → Content → Inject | 切换节点可见性 |
| `UPDATE_NODE_PROPERTY` | Panel → Content → Inject | 更新节点属性 |
| `GET_AVAILABLE_SCOPES` | Panel → Content → Inject | 获取所有可用 Scope 列表 |
| `SET_ACTIVE_SCOPE` | Panel → Content → Inject | 切换激活的 Scope |
| `SCOPE_ADDED` | Inject → Content → Panel (runtime.sendMessage) | 通知 Scope 新增 |
| `SCOPE_REMOVED` | Inject → Content → Panel (runtime.sendMessage) | 通知 Scope 移除 |

## 5. 核心概念

### 5.1 PaperScope 与多 Scope 管理

Paper.js 中每个 `PaperScope` 对应一个独立的项目上下文（通常绑定一个 Canvas）。本扩展支持多 Scope 调试，核心数据结构挂在页面全局：

`window.__PAPER_SCOPES__`：
- `scopes: Map<string, { scope, canvas, id }>` — 所有已注册的 Scope
- `activeScope: string | null` — 当前激活的 Scope ID
- `getActiveScope()` / `switchScope(scopeId)` / `getAllScopes()`

> `window.__PAPER_JS__` 已废弃，统一使用 `window.__PAPER_SCOPES__`。

### 5.2 场景树 (Scene Tree)

扩展将 Paper.js 的项目层级（Project → Layer → Item）序列化为统一的 `PaperNode` 树，供前端递归渲染。每个节点包含 id、类型、属性、子节点等。属性编辑通过 `UPDATE_NODE_PROPERTY` 回写到 Paper.js 真实节点。

## 6. 模块职责速查

### 6.1 入口点

| 入口 | 文件 | 说明 |
|------|------|------|
| Content Script | `packages/extension/src/content/index.ts` | 注入检测脚本 + 消息中继 |
| DevTools | `packages/extension/src/devtools/index.ts` | 创建 DevTools 面板 |
| Panel | `packages/extension/src/panel/index.tsx` | React 面板入口 |
| Panel Store | `packages/extension/src/panel/store/index.ts` | Zustand 状态管理 |
| Inject (检测) | `packages/extension/src/inject/index.ts` | Paper.js 轮询检测 + MutationObserver |
| Inject (入口) | `packages/extension/src/inject/parse.ts` | 全局事件监听注册 + 消息路由器初始化 |
| Inject (场景树) | `packages/extension/src/inject/sceneTreeBuilder.ts` | 场景树构建 + 节点查找 + Scope/Project/View 获取 |
| Inject (覆盖层) | `packages/extension/src/inject/overlayManager.ts` | 高亮覆盖层管理（选中/悬停边框） |
| Inject (拾取器) | `packages/extension/src/inject/pickerMode.ts` | 拾取器模式 + Canvas 点击自动切换 Scope |
| Inject (爆炸预览) | `packages/extension/src/inject/explodeMode.ts` | Group 爆炸预览模式（拖拽手柄控制子图元散开） |
| Inject (聚焦) | `packages/extension/src/inject/focusMode.ts` | 聚焦模式（隐藏祖先兄弟，孤立显示子树） |
| Inject (消息路由) | `packages/extension/src/inject/messageRouter.ts` | DevTools 消息分发（action → handler switch） |
| Inject (属性提取) | `packages/extension/src/inject/extra.ts` | 属性提取函数 |
| Inject (初始化) | `packages/extension/src/inject/setup.ts` | initInject()：__PAPER_SCOPES__ 初始化 + 轮询 + Observer（供 index.ts 和 devtool-local 复用） |
| 通信桥接接口 | `packages/extension/src/shared/bridge.ts` | Bridge 接口 + setBridge/getBridge 依赖注入 |
| 扩展桥接实现 | `packages/extension/src/shared/extensionBridge.ts` | ExtensionBridge：通过 `chrome.devtools.inspectedWindow.tabId` 取被检查标签页，封装 `chrome.tabs.sendMessage` + `onMessage`（不可用 `chrome.tabs.query({currentWindow:true})`，DevTools 窗口无活动标签页） |
| Background | `packages/extension/src/background/index.ts` | 骨架代码，仅监听安装事件 |
| MV3 清单 | `packages/extension/manifest.config.ts` | CRXJS defineManifest |
| Vite 配置 | `packages/extension/vite.config.ts` | 主构建配置 |
| Inject 构建 | `packages/extension/vite.inject.config.ts` | 注入脚本独立构建（IIFE 格式） |
| 示例入口 | `packages/example/src/index.ts` | 多 Canvas + PaperScope 管理 |
| 示例绘图 | `packages/example/src/draw.ts` | 绘图函数 createShapes |
| Local 入口 | `packages/devtool-local/src/main.tsx` | 本地运行版入口（Paper.js 场景 + Panel UI + LocalBridge） |
| Local 桥接 | `packages/devtool-local/src/localBridge.ts` | LocalBridge：同页面 CustomEvent 通信 |

### 6.2 前端组件树

```
App (packages/extension/src/panel/App.tsx)
├── 顶部状态栏: 标题 + 连接状态
└── Ant Design Splitter (左右分栏)
    ├── SceneTreeView (左面板)
    │   ├── Select (Scope 切换下拉框)
    │   ├── Button (刷新按钮)
    │   └── TreeNode (递归组件)
    └── PropertiesPanel (右面板)
        └── PropertyEditor (智能编辑器，8 种类型)
```

### 6.3 状态管理 (usePaperStore)

核心状态：`connected`, `connectionStatus`, `sceneTree`, `selectedNode`, `expandedNodes`, `availableScopes`, `activeScope`

核心 Actions：`initialize`, `refreshSceneTree`, `selectNode`, `toggleNodeVisibility`, `toggleNodeExpanded`, `updateNodeProperty`, `setActiveScope`, `getAvailableScopes`, `handleScopeAdded`, `handleScopeRemoved`

> `toggleNodeExpanded` 是唯一纯本地操作，不涉及 chrome API 通信。

### 6.4 模块可测性地图

> 用于判断改动后是否需要补测试。可测性：高=纯逻辑可直接测；中=需 mock 外部依赖；低=强依赖运行时环境。Agent 补测后更新"当前覆盖"列。

| 模块 | 文件 | 可测性 | 当前覆盖 | 优先级 | 说明 |
|------|------|--------|----------|--------|------|
| 属性提取 | `inject/extra.ts` | 高 | 已覆盖（12） | P0 | 纯函数，提取 Item/Project 属性 |
| 场景树构建 | `inject/sceneTreeBuilder.ts` | 高 | 已覆盖（20） | P0 | buildScopeTree/Project + 节点查找 |
| 爆炸数学 | `inject/explodeMath.ts` | 高 | 已覆盖（13） | P0 | 纯数学函数，零依赖 |
| 聚焦树逻辑 | `inject/focusTree.ts` | 高 | 已覆盖（9） | P0 | 纯树遍历，零依赖 |
| 消息路由 | `inject/messageRouter.ts` | 中 | 已覆盖（16） | P1 | action→handler 分发，mock 子模块 |
| Panel Store | `panel/store/index.ts` | 中 | 部分（select/reveal+history） | P1 | mock `Bridge`（setBridge 注入） |
| 导航工具 | `panel/utils/navigation.ts` | 高 | 已覆盖（8） | P1 | 祖先链/可见节点计算，纯逻辑 |
| 覆盖层管理 | `inject/overlayManager.ts` | 中 | 已覆盖（6） | P2 | mock Paper.js Item + DOM |
| 拾取器模式 | `inject/pickerMode.ts` | 中 | 已覆盖（6） | P2 | mock Canvas 事件 + DOM |
| 爆炸预览 | `inject/explodeMode.ts` | 中 | 已覆盖（6） | P2 | mock Paper.js Group + DOM |
| 聚焦模式 | `inject/focusMode.ts` | 中 | 已覆盖（8） | P2 | 快照生命周期 |
| 检测 | `inject/index.ts` | 低 | 已覆盖（8） | P3 | mock window + __PAPER_SCOPES__ |
| 注入入口 | `inject/parse.ts` | 低 | 已覆盖（2） | P3 | 监听器注册 + 路由器初始化 |
| 通信桥接 | `shared/bridge.ts` + `extensionBridge.ts` | 高 | 已覆盖（4） | P1 | ExtensionBridge 直接单测（mock chrome.devtools/tabs/runtime）；Bridge 接口由 store 测试间接验证 |
| UI 组件 | `panel/components/*` | 中 | 无 | P3 | 需 @testing-library（未引入） |
| Content Script | `content/index.ts` | 低 | 无 | P3 | chrome API 中继，集成测试 |
| Background | `background/index.ts` | 低 | 无 | P4 | 空实现 |

## 7. 关键数据流

### 7.1 Paper.js 检测与连接

```
inject/index.ts 轮询检测 (10次 × 1秒)
  → 检查 globalThis.__PAPER_SCOPE__
  → 发现 Paper.js → registerScopes() → 注册到 window.__PAPER_SCOPES__
  → dispatchEvent('PAPER_JS_DETECTED')
  → Content Script 监听到 → 注入 parse.js
  → 启动 MutationObserver 持续监听 Canvas 增删
  → Panel initialize() → DETECT_PAPER_JS → 确认连接
```

### 7.2 属性编辑回写

Panel 中编辑属性 → `updateNodeProperty` action → `chrome.tabs.sendMessage(UPDATE_NODE_PROPERTY)` → Content Script 转发 `CustomEvent` → Injected (parse.ts) 直接修改 Paper.js 节点 → 返回响应 → Panel 刷新场景树。

## 8. 关键设计决策

1. **CustomEvent 而非 postMessage**：注入脚本和 Content Script 通过 DOM 事件通信，无需序列化，支持 `detail` 携带任意结构化数据
2. **run_at: document_start**：必须在 Paper.js 初始化之前开始监听
3. **Inject 独立构建**：运行在页面上下文（非扩展隔离环境），需 IIFE 格式，无法使用 `chrome.runtime` API
4. **Bridge 通信抽象层**：Panel Store 不直接调 `chrome.*` API，而是通过 `Bridge` 接口（`shared/bridge.ts`）通信，由入口处 `setBridge` 注入实现。扩展模式用 `ExtensionBridge`（走 Content Script 中继），本地模式将用 `LocalBridge`（同页面直接调用）。解耦后 Store 可测性提升（mock bridge 即可），并为 devtool-local 铺路

## 9. 构建配置要点

- **Inject 脚本独立构建**：`vite.inject.config.ts`，输出 IIFE 格式到 `dist/inject/`，避免全局污染
- **自定义插件 `inject-manifest-plugin`**：构建后自动更新 manifest.json 的 `web_accessible_resources`
- **路径别名**：`@/` → `src/`
- **CRXJS**：提供 HMR，修改代码后自动重载
- **Less**：`javascriptEnabled: true` 用于 Ant Design 主题编译

## 10. 当前技术债务

| 项目 | 状态 |
|------|------|
| 测试架构 | 部分建立（inject 全层 + panel store/utils 已覆盖，content/UI 未覆盖） |
| Background Script | 空实现 |
| Extension ESLint | 未配置（仅 example 项目有） |
| 错误处理 | 基础级别，缺少统一错误处理机制 |
| 多 Scope 边界情况 | 部分实现 |

## 11. 近期重要变更

> 按时间倒序记录对项目有结构性影响的改动。日常小改不用记这里，记入对应章节即可。

| 日期 | 类型 | 摘要 | 涉及模块 | 关联文件 |
|------|------|------|----------|----------|
| 2026-07-06 | 修复 | TreeNode 展开/收拢 icon 在扩展模式下点击无效（Dropdown 的 Trigger 干扰子元素 onClick 事件传播）。改为在行 onClick 中统一通过 `e.target.closest()` 判断点击来源分发，不再依赖 `stopPropagation`。同时覆盖可见性/爆炸 icon。 | panel | `panel/components/TreeNode.tsx` |
| 2026-07-06 | 修复 | ExtensionBridge 改用 `chrome.devtools.inspectedWindow.tabId` 取被检查标签页，修复 DevTools 面板 "no active tab" 导致无法连接的致命 bug（原 `chrome.tabs.query({currentWindow:true})` 在 DevTools 窗口上下文返回空） | shared | `shared/extensionBridge.ts`, `shared/__tests__/extensionBridge.test.ts` |
| 2026-07-06 | 新增 | 接入 Playwright E2E 测试，覆盖 devtool-local 端到端交互（连接/场景树/选中/可见性/多Scope/属性） | e2e | `playwright.config.ts`, `e2e/local.spec.ts`, `package.json` |
| 2026-07-06 | 增强 | devtool-local 支持多 Scope 创建/删除（复用 example 绘图函数，配套 @example alias） | devtool-local | `devtool-local/src/scene.ts`, `devtool-local/vite.config.ts`, `devtool-local/tsconfig.json` |
| 2026-07-06 | 新增 | devtool-local 包：脱离 Chrome 扩展的本地运行版本（LocalBridge 同页面通信，复用 Panel UI + Inject 逻辑） | devtool-local, inject | `devtool-local/`, `inject/setup.ts`, `inject/index.ts` |
| 2026-07-06 | 重构 | 引入 Bridge 通信抽象层，Panel Store 解耦 chrome API（阶段1，为 devtool-local 铺路） | shared, panel | `shared/bridge.ts`, `shared/extensionBridge.ts`, `panel/store/index.ts`, `panel/index.tsx`, `hooks/useDevToolsCleanup.ts` |
| 2026-07-06 | 重构 | 拆分 inject/parse.ts 上帝文件（1227行）为 6 个职责模块 | inject | `parse.ts`, `sceneTreeBuilder.ts`, `overlayManager.ts`, `pickerMode.ts`, `explodeMode.ts`, `focusMode.ts`, `messageRouter.ts` |
| 2026-07-06 | 文档 | 初始化项目知识库文档 | 文档 | `docs/PROJECT_KNOWLEDGE.md` |

## 12. 维护约定

本文件由开发者和 Agent 共同维护，遵循以下规则（已写入 `.trae/rules/project_rules.md`）：

1. **谁改动谁更新**：每次 Agent 完成会改变项目结构、模块职责、数据流、技术栈、设计决策或技术债务的改动后，必须同步更新本文件对应章节。
2. **结构性改动入变更表**：对项目有结构性影响的改动（新增模块、重构架构、更换技术栈、关键决策变更），额外在 [近期重要变更](#11-近期重要变更) 追加一行。纯 Bug 修复、样式微调不必入表。
3. **保持准确而非详尽**：本文件追求"始终反映现状"，更新时如发现旧内容已过时，直接修正而非追加。废弃内容删掉即可，不必保留历史。
4. **引用真实文件**：提及代码位置时使用基于仓库根的相对路径，便于跳转。
5. **不与规则文件重复造句**：行为规范（命名、流程、命令）以 `project_rules.md` 为准，本文件只在需要时引用。
